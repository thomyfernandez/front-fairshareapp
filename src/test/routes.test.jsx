import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { expect, it, vi } from 'vitest'
import { AppRoutes } from '../app/AppRoutes'
import { UIProvider } from '../components/ui'
import { SessionProvider } from '../features/auth/SessionProvider'
import { localDate } from '../lib/format'

const spaces = [
  { id: 1, nombre: 'Casa del equipo', presupuestoBase: 5000, reglaReparto: 'CINCUENTA_CINCUENTA' },
  { id: 2, nombre: 'Viaje del grupo', presupuestoBase: 10000, reglaReparto: 'PROPORCIONAL' },
]
function mockApi({ balanceStatus = 200 } = {}) {
  const fetcher = vi.fn(async (url, options = {}) => {
    const path = url.split('?')[0]
    let data
    let status = 200
    if (path.endsWith('/login')) data = { token: 'test-token', usuario: { id: 1, nombre: 'Ana', email: 'ana@example.test' } }
    else if (path === '/api/v1/espacios') data = spaces
    else if (/\/espacios\/\d+$/.test(path)) data = spaces.find(space => String(space.id) === path.split('/').at(-1))
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
  await screen.findByRole('heading', { name: 'Gastos', level: 1 })
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


it('usa la navegación compacta en el resumen y conserva las secciones secundarias en Más', async () => {
  setup('/espacios/1/resumen')
  const user = await logIn()
  await screen.findByRole('heading', { name: 'Tus cuentas, claras.', level: 1 })
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(screen.getByRole('link', { name: 'Inicio', exact: true })).toHaveAttribute('href', '/espacios/1/resumen')
  expect(screen.getByRole('link', { name: 'Balance', exact: true })).toHaveAttribute('href', '/espacios/1/balance')
  await user.click(screen.getByText('Más', { exact: true }))
  await user.click(screen.getByRole('link', { name: 'Miembros', exact: true }))
  await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent('/espacios/1/miembros'))
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
})
