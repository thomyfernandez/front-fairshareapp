import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { expect, it, vi } from 'vitest'
import { AppRoutes } from '../app/AppRoutes'
import { UIProvider } from '../components/ui'
import { SessionProvider } from '../features/auth/SessionProvider'
import { saveDraft, readDraft } from '../lib/draft-storage'
import { localDate } from '../lib/format'

const spaces = [
  { id: 1, nombre: 'Casa del equipo', presupuestoBase: 5000, reglaReparto: 'CINCUENTA_CINCUENTA' },
  { id: 2, nombre: 'Viaje del grupo', presupuestoBase: 10000, reglaReparto: 'PROPORCIONAL' },
]
function mockApi({ balanceStatus = 200, spaceStatus = 200 } = {}) {
  const fetcher = vi.fn(async (url, options = {}) => {
    const path = url.split('?')[0]
    let data
    let status = 200
    if (path.endsWith('/login')) data = { token: 'test-token', usuario: { id: 1, nombre: 'Ana', email: 'ana@example.test' } }
    else if (path === '/api/v1/espacios') data = spaces
    else if (/\/espacios\/\d+$/.test(path)) { status = spaceStatus; data = spaceStatus === 200 ? spaces.find(space => String(space.id) === path.split('/').at(-1)) : { message: 'No tenés acceso a este espacio' } }
    else if (path.endsWith('/miembros')) data = [{ id: 1, usuarioId: 1, nombreUsuario: 'Ana', rol: 'ADMIN' }]
    else if (path.endsWith('/gastos')) data = [{ id: 1, descripcion: 'Compras compartidas', monto: 1500, fecha: localDate(), estado: 'PENDIENTE', participantes: [] }]
    else if (path.endsWith('/balance')) { status = balanceStatus; data = balanceStatus === 200 ? { deudas: [] } : { message: 'Balance temporalmente no disponible', code: 'SERVER_ERROR' } }
    else data = []
    if (options.signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
    return new Response(JSON.stringify(data), { status })
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}
function RouteProbe() {
  const location = useLocation()
  const navigate = useNavigate()
  return <><output data-testid="route">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>Atrás en la prueba</button></>
}
function setup(route, options) {
  const fetcher = mockApi(options)
  render(<MemoryRouter initialEntries={[route]}><UIProvider><SessionProvider><AppRoutes /><RouteProbe /></SessionProvider></UIProvider></MemoryRouter>)
  return fetcher
}
async function logIn() {
  const user = userEvent.setup()
  await user.type(await screen.findByRole('textbox', { name: /^Email/ }), 'ana@example.test')
  await user.type(screen.getByLabelText(/^Contraseña/), 'password-test')
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
  return user
}

it('returns to a protected deep link after login, switches space and supports back navigation', async () => {
  setup('/espacios/2/gastos?desde=2026-01-01')
  const user = await logIn()
  // Gastos se carga de forma diferida; la primera transformación del módulo puede superar el segundo por defecto.
  await screen.findByRole('heading', { name: 'Gastos', level: 1 }, { timeout: 5000 })
  expect(screen.getByTestId('route')).toHaveTextContent('/espacios/2/gastos?desde=2026-01-01')
  await user.click(screen.getByLabelText('Cambiar espacio activo'))
  await user.click(screen.getByRole('link', { name: 'Casa del equipo' }))
  await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent('/espacios/1/gastos'))
  expect(screen.getByLabelText('Cambiar espacio activo')).toHaveTextContent('Casa del equipo')
  await user.click(screen.getByRole('button', { name: 'Atrás en la prueba' }))
  await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent('/espacios/2/gastos?desde=2026-01-01'))
})

it('keeps expenses and navigation available when only the balance fails', async () => {
  setup('/espacios/1/resumen', { balanceStatus: 500 })
  await logIn()
  await screen.findByRole('heading', { name: 'Tus cuentas, claras.', level: 1 })
  expect(await screen.findByText('Compras compartidas')).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'Tu balance no está disponible' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Gastos', exact: true })).toBeInTheDocument()
})

it('expires the session and announces it once when an authenticated request returns 401', async () => {
  setup('/espacios/1/resumen', { balanceStatus: 401 })
  await logIn()
  await screen.findByRole('heading', { name: 'Ingresá a FairShare' })
  expect(await screen.findByText('Tu sesión venció. Iniciá sesión nuevamente para continuar.')).toBeInTheDocument()
  expect(screen.getByTestId('route')).toHaveTextContent('/login')
  expect(screen.queryByText('Compras compartidas')).not.toBeInTheDocument()
})


it('muestra todas las secciones y ubica liquidaciones junto a la actividad principal', async () => {
  setup('/espacios/1/resumen')
  const user = await logIn()
  await screen.findByRole('heading', { name: 'Tus cuentas, claras.', level: 1 })
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(screen.getByRole('link', { name: 'Inicio', exact: true })).toHaveAttribute('href', '/espacios/1/resumen')
  expect(screen.getByRole('link', { name: 'Balance', exact: true })).toHaveAttribute('href', '/espacios/1/balance')
  expect(screen.queryByText('Más', { exact: true })).not.toBeInTheDocument()
  expect(within(screen.getByRole('group', { name: 'Actividad del espacio' })).getByRole('link', { name: 'Liquidaciones', exact: true })).toHaveAttribute('href', '/espacios/1/liquidaciones')
  expect(within(screen.getByRole('group', { name: 'Administración del espacio' })).getByRole('link', { name: 'Configuración', exact: true })).toBeVisible()
  expect(within(screen.getByRole('navigation', { name: 'Tu cuenta', exact: true })).getByRole('link', { name: 'Mis ingresos', exact: true })).toHaveAttribute('href', '/ingresos?espacio=1')
  await user.click(screen.getByRole('link', { name: 'Miembros', exact: true }))
  await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent('/espacios/1/miembros'))
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
})


it('conserva el espacio activo al abrir ingresos y volver a una sección del espacio', async () => {
  const fetcher = setup('/espacios/2/gastos')
  const user = await logIn()
  await screen.findByRole('heading', { name: 'Gastos', level: 1 })
  await user.click(screen.getByRole('link', { name: 'Mis ingresos', exact: true }))
  await screen.findByRole('heading', { name: 'Mis ingresos', level: 1 })
  expect(screen.getByTestId('route')).toHaveTextContent('/ingresos?espacio=2')
  expect(screen.getByLabelText('Cambiar espacio activo')).toHaveTextContent('Viaje del grupo')
  expect(screen.getByRole('link', { name: 'Mis ingresos', exact: true })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'Gastos', exact: true })).toHaveAttribute('href', '/espacios/2/gastos')
  expect(fetcher.mock.calls.filter(([url]) => url === '/api/v1/sueldos')).toHaveLength(1)
  expect(fetcher.mock.calls.filter(([url]) => url === '/api/v1/espacios/2')).toHaveLength(1)
  await user.click(screen.getByRole('link', { name: 'Gastos', exact: true }))
  await screen.findByRole('heading', { name: 'Gastos', level: 1 })
  expect(screen.getByTestId('route')).toHaveTextContent('/espacios/2/gastos')
  await user.click(screen.getByRole('button', { name: 'Atrás en la prueba' }))
  await screen.findByRole('heading', { name: 'Mis ingresos', level: 1 })
  expect(screen.getByLabelText('Cambiar espacio activo')).toHaveTextContent('Viaje del grupo')
})

it('restaura el contexto desde el enlace directo y permite cambiarlo sin filtrar ingresos', async () => {
  const fetcher = setup('/ingresos?espacio=2')
  const user = await logIn()
  await screen.findByRole('heading', { name: 'Mis ingresos', level: 1 })
  await waitFor(() => expect(screen.getByLabelText('Cambiar espacio activo')).toHaveTextContent('Viaje del grupo'))
  await user.click(screen.getByLabelText('Cambiar espacio activo'))
  await user.click(screen.getByRole('link', { name: 'Casa del equipo', exact: true }))
  await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent('/ingresos?espacio=1'))
  await waitFor(() => expect(screen.getByLabelText('Cambiar espacio activo')).toHaveTextContent('Casa del equipo'))
  expect(screen.getByRole('heading', { name: 'Mis ingresos', level: 1 })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Inicio', exact: true })).toHaveAttribute('href', '/espacios/1/resumen')
  expect(fetcher.mock.calls.filter(([url]) => url === '/api/v1/sueldos')).toHaveLength(1)
  expect(fetcher.mock.calls.some(([url]) => /sueldos.*espacio/.test(url))).toBe(false)
})

it.each(['/ingresos', '/ingresos?espacio=999', '/ingresos?espacio=-1', '/ingresos?espacio=abc'])('mantiene ingresos accesible sin seleccionar un espacio ajeno o inválido: %s', async route => {
  const fetcher = setup(route)
  await logIn()
  await screen.findByRole('heading', { name: 'Mis ingresos', level: 1 })
  expect(screen.getByLabelText('Cambiar espacio activo')).toHaveTextContent('Elegí un espacio')
  expect(screen.queryByRole('group', { name: 'Actividad del espacio' })).not.toBeInTheDocument()
  expect(fetcher.mock.calls.some(([url]) => /\/espacios\/(999|-1|abc)/.test(url))).toBe(false)
})

it('mantiene ingresos personal accesible si el contexto dejó de estar autorizado', async () => {
  const fetcher = setup('/ingresos?espacio=2', { spaceStatus: 403 })
  await logIn()
  await screen.findByRole('heading', { name: 'Mis ingresos', level: 1 })
  await waitFor(() => expect(fetcher).toHaveBeenCalledWith('/api/v1/espacios/2', expect.anything()))
  await waitFor(() => expect(screen.queryByRole('group', { name: 'Actividad del espacio' })).not.toBeInTheDocument())
  expect(screen.getByLabelText('Cambiar espacio activo')).toHaveTextContent('Elegí un espacio')
  expect(screen.getByTestId('route')).toHaveTextContent('/ingresos?espacio=2')
})

it('conserva el contexto al abrir ingresos desde la explicación de miembros', async () => {
  setup('/espacios/2/miembros')
  const user = await logIn()
  await screen.findByRole('heading', { name: 'Miembros', level: 1 })
  const links = within(screen.getByRole('main')).getAllByRole('link', { name: 'Mis ingresos', exact: true })
  for (const link of links) expect(link).toHaveAttribute('href', '/ingresos?espacio=2')
  await user.click(links[0])
  await screen.findByRole('heading', { name: 'Mis ingresos', level: 1 })
  expect(screen.getByLabelText('Cambiar espacio activo')).toHaveTextContent('Viaje del grupo')
})


it('elimina los borradores de gastos al cerrar sesión', async () => {
  setup('/espacios/1/gastos')
  const user = await logIn()
  await screen.findByRole('heading', { name: 'Gastos', level: 1 })
  saveDraft(1, 1, 'individual', { descripcion: 'Borrador privado' })
  await user.click(screen.getByLabelText('Cuenta de Ana'))
  await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
  await screen.findByRole('heading', { name: 'Ingresá a FairShare' })
  expect(readDraft(1, 1, 'individual')).toBeNull()
})
