import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'
import { AppRoutes } from '../app/AppRoutes'
import { SessionContext } from '../features/auth/session-context'
import { UIProvider } from '../components/ui'
import { storeWrapper } from './store-wrapper'

const rows = Array.from({ length: 53 }, (_, index) => ({ id: index + 1, descripcion: index === 6 ? 'Único viaje' : `Compra ${String(index + 1).padStart(2, '0')}`, fecha: '2026-10-19', monto: 100 + index, estado: 'PENDIENTE', pagadorId: 1, pagadorNombre: 'Ana Ruiz', regla: 'EQUITATIVA', participantes: [{ usuarioId: 1, importe: 100 + index }] }))
function History() {
  const location = useLocation()
  const navigate = useNavigate()
  return <><output data-testid="route">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>Atrás en historial</button><button onClick={() => navigate(1)}>Adelante en historial</button></>
}
function setup({ route = '/espacios/1/gastos', count = 53 } = {}) {
  let expenses = rows.slice(0, count)
  const api = vi.fn(async (path, options = {}) => {
    if (options.method === 'DELETE') { expenses = expenses.filter(row => String(row.id) !== path.split('/').at(-1)); return null }
    if (path === '/api/v1/espacios') return [{ id: 1, nombre: 'Casa' }]
    if (path === '/api/v1/espacios/1') return { id: 1, nombre: 'Casa' }
    if (path.endsWith('/miembros')) return [{ id: 8, usuarioId: 1, nombreUsuario: 'Ana Ruiz', rol: 'ADMIN' }]
    if (path.split('?')[0].endsWith('/gastos')) {
      const search = new URL(path, 'http://localhost').searchParams
      return expenses.filter(row => (!search.get('desde') || row.fecha >= search.get('desde')) && (!search.get('hasta') || row.fecha <= search.get('hasta')))
    }
    return []
  })
  render(<MemoryRouter initialEntries={[route]}><SessionContext.Provider value={{ api, session: { usuario: { id: 1, nombre: 'Ana' } } }}><UIProvider><AppRoutes /><History /></UIProvider></SessionContext.Provider></MemoryRouter>, storeWrapper())
  return api
}
const list = () => screen.getByRole('list', { name: 'Gastos del espacio' })
const size = () => screen.getByLabelText('Gastos por página')
const page = () => screen.getByLabelText('Página', { exact: true })
beforeEach(() => { sessionStorage.clear(); window.scrollTo = vi.fn(); Element.prototype.scrollIntoView = vi.fn() })

it('muestra diez gastos recientes y cambia de página sin pedir páginas inventadas al backend', async () => {
  const user = userEvent.setup({ delay: null })
  const api = setup()
  await screen.findByText('Mostrando 1–10 de 53 gastos')
  expect(within(list()).getAllByRole('listitem')).toHaveLength(10)
  expect(within(list()).getAllByRole('button', { name: /Ver detalle/ })[0]).toHaveAccessibleName('Ver detalle de Compra 53')
  expect(screen.getByRole('button', { name: 'Página anterior de gastos' })).toBeDisabled()
  const requests = api.mock.calls.length
  await user.click(screen.getByRole('button', { name: 'Página siguiente de gastos' }))
  expect(screen.getByText('Mostrando 11–20 de 53 gastos')).toBeVisible()
  expect(within(list()).queryByRole('button', { name: 'Ver detalle de Compra 53' })).not.toBeInTheDocument()
  expect(api).toHaveBeenCalledTimes(requests)
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Gastos de esta página' })).toHaveFocus())
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' })
  await user.selectOptions(page(), '6')
  expect(screen.getByText('Mostrando 51–53 de 53 gastos')).toBeVisible()
  expect(within(list()).getAllByRole('listitem')).toHaveLength(3)
  expect(screen.getByRole('button', { name: 'Página siguiente de gastos' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Página anterior de gastos' }))
  expect(screen.getByText('Mostrando 41–50 de 53 gastos')).toBeVisible()
})

it('filtra sobre todos los gastos y vuelve a la primera página sin perder el tamaño elegido', async () => {
  const user = userEvent.setup({ delay: null })
  setup({ route: '/espacios/1/gastos?pagina=3&cantidad=20' })
  await screen.findByText('Mostrando 41–53 de 53 gastos')
  await user.type(screen.getByRole('searchbox'), 'Único')
  expect(await screen.findByText('Mostrando 1–1 de 1 gasto')).toBeVisible()
  expect(within(list()).getByRole('button', { name: 'Ver detalle de Único viaje' })).toBeVisible()
  expect(screen.getByTestId('route')).not.toHaveTextContent('pagina=')
  expect(size()).toHaveValue('20')
  expect(screen.queryByRole('navigation', { name: 'Páginas de gastos' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Limpiar todos los filtros' }))
  expect(screen.getByText('Mostrando 1–20 de 53 gastos')).toBeVisible()
  expect(size()).toHaveValue('20')
  await user.type(screen.getByRole('searchbox'), 'Inexistente')
  expect(await screen.findByRole('heading', { name: 'No encontramos gastos con estos filtros' })).toBeVisible()
  expect(screen.queryByLabelText('Gastos por página')).not.toBeInTheDocument()
})

it('cambia la cantidad por página y mantiene la página al navegar a ingresos y regresar', async () => {
  const user = userEvent.setup({ delay: null })
  setup()
  await screen.findByText('Mostrando 1–10 de 53 gastos')
  await user.selectOptions(size(), '20')
  expect(within(list()).getAllByRole('listitem')).toHaveLength(20)
  await user.selectOptions(page(), '3')
  await user.click(screen.getByRole('link', { name: 'Mis ingresos', exact: true }))
  await screen.findByRole('heading', { name: 'Mis ingresos', exact: true })
  expect(screen.getByRole('link', { name: 'Gastos', exact: true })).toHaveAttribute('href', '/espacios/1/gastos?cantidad=20&pagina=3')
  await user.click(screen.getByRole('link', { name: 'Gastos', exact: true }))
  expect(await screen.findByText('Mostrando 41–53 de 53 gastos')).toBeVisible()
  expect(size()).toHaveValue('20')
  await user.selectOptions(size(), '50')
  expect(screen.getByText('Mostrando 1–50 de 53 gastos')).toBeVisible()
  expect(page()).toHaveValue('1')
})

it('corrige parámetros inválidos y limita una página que excede el resultado real', async () => {
  setup({ route: '/espacios/1/gastos?pagina=999&cantidad=13' })
  expect(await screen.findByText('Mostrando 51–53 de 53 gastos')).toBeVisible()
  await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent('/espacios/1/gastos?pagina=6'))
  expect(screen.getByTestId('route')).not.toHaveTextContent('cantidad=')
  expect(size()).toHaveValue('10')
})

it('vuelve a la última página disponible después de eliminar su único gasto', async () => {
  const user = userEvent.setup({ delay: null })
  setup({ route: '/espacios/1/gastos?pagina=3', count: 21 })
  await screen.findByText('Mostrando 21–21 de 21 gastos')
  await user.click(within(list()).getByRole('button', { name: 'Eliminar Compra 01' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))
  expect(await screen.findByText('Mostrando 11–20 de 20 gastos')).toBeVisible()
  expect(page()).toHaveValue('2')
  expect(within(list()).getAllByRole('listitem')).toHaveLength(10)
  await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent('pagina=2'))
})

it('respeta los botones atrás y adelante del navegador para recorrer páginas', async () => {
  const user = userEvent.setup({ delay: null })
  setup()
  await screen.findByText('Mostrando 1–10 de 53 gastos')
  await user.click(screen.getByRole('button', { name: 'Página siguiente de gastos' }))
  await user.click(screen.getByRole('button', { name: 'Atrás en historial' }))
  expect(screen.getByText('Mostrando 1–10 de 53 gastos')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Adelante en historial' }))
  expect(screen.getByText('Mostrando 11–20 de 53 gastos')).toBeVisible()
})
