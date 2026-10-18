import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { WorkspaceContext } from '../app/workspace-context'
import { UIProvider } from '../components/ui'
import SettlementsPage from '../features/liquidaciones/SettlementsPage'
import { groupPendingExpenses, historyQuery, settlementExpenses, settlementPeriod, settlementPreview } from '../features/liquidaciones/model'

const expenses = [
  { id: 1, descripcion: 'Supermercado', monto: 100.1, fecha: '2026-10-02', estado: 'PENDIENTE', pagadorNombre: 'Ana' },
  { id: 2, descripcion: 'Internet', monto: 200.2, fecha: '2026-10-05', estado: 'PENDIENTE', pagadorNombre: 'Luis' },
  { id: 3, descripcion: 'Luz', monto: 50, fecha: '2026-09-10', estado: 'LIQUIDADO' },
]
const history = [{ id: 7, montoTotal: 50, fechaLiquidacion: '2026-09-30', mes: 9, anio: 2026, descripcion: 'Cierre de septiembre', cantidadGastos: 2, gastosLiquidadosIds: [3, 99] }]

describe('settlement model', () => {
  it('estimates the remaining budget in cents and flags insufficient budget', () => {
    expect(settlementPreview(expenses, [1, 2], 1000)).toMatchObject({ count: 2, total: 300.3, remaining: 699.7, insufficient: false })
    expect(settlementPreview(expenses, [1, 2], 300)).toMatchObject({ insufficient: true, missing: 0.3 })
  })
  it('keeps missing budgets and invalid amounts unavailable instead of assuming zero', () => {
    expect(settlementPreview(expenses, [1], undefined)).toMatchObject({ available: null, remaining: null })
    expect(settlementPreview([{ id: 1, monto: null }], [1], 1000)).toMatchObject({ total: null, remaining: null })
    expect(settlementPreview(expenses, [1], 0)).toMatchObject({ available: 0, insufficient: true })
  })
  it('groups expenses by month with newest expenses first', () => {
    const groups = groupPendingExpenses([expenses[0], { id: 4, descripcion: 'Sin fecha' }, expenses[2], expenses[1]])
    expect(groups.map(group => group.label)).toEqual(['Octubre 2026', 'Septiembre 2026', 'Sin fecha'])
    expect(groups[0].expenses.map(expense => expense.id)).toEqual([2, 1])
  })
  it('validates a combined accounting period without deriving it from selected expenses', () => {
    expect(settlementPeriod('2027-03')).toEqual({ mes: 3, anio: 2027 })
    for (const invalid of ['', '1999-12', '2026-13', '2026-1', '0000-01']) expect(settlementPeriod(invalid)).toBeNull()
  })
  it('never combines period and date filters', () => {
    expect(historyQuery({ modo: 'periodo', mes: '10', anio: '2026', desde: '2026-01-01' }).query).toBe('anio=2026&mes=10')
    expect(historyQuery({ modo: 'fechas', desde: '2026-01-01', mes: '10' }).query).toBe('desde=2026-01-01')
    expect(historyQuery({ modo: 'fechas', desde: '2026-02-01', hasta: '2026-01-01' }).error).toMatch(/anterior/)
  })
  it('reports unavailable settled expenses instead of inventing them', () => {
    expect(settlementExpenses(history[0], expenses)).toEqual({ found: [expenses[2]], missing: 1 })
  })
})

function RouteProbe() { const location = useLocation(); return <output data-testid="location">{location.search}</output> }
function renderPage({ isAdmin = true, presupuesto = 1000, closeResult, historyData = history, expenseData = expenses, expenseError, historyError, route = '/' } = {}) {
  const invalidate = vi.fn()
  const api = vi.fn(async (path, { method = 'GET' } = {}) => {
    if (method === 'POST') { if (closeResult instanceof Error) throw closeResult; return closeResult }
    if (path.includes('/historial')) { if (historyError) throw historyError; return historyData }
    if (path.endsWith('/gastos')) { if (expenseError) throw expenseError; return expenseData }
    return []
  })
  let workspace = {
    spaceId: '1', space: { id: 1, presupuestoBase: presupuesto }, api, revision: 0, invalidate, isAdmin,
    session: { usuario: { id: 1 } }, members: [], membersState: { data: [], loading: false, error: null },
  }
  const tree = () => <MemoryRouter initialEntries={[route]}><UIProvider><WorkspaceContext.Provider value={workspace}><SettlementsPage /><RouteProbe /></WorkspaceContext.Provider></UIProvider></MemoryRouter>
  const result = render(tree())
  return { api, invalidate, update: values => { workspace = { ...workspace, ...values }; result.rerender(tree()) }, updateExpenses: values => { expenseData = values; workspace = { ...workspace, revision: workspace.revision + 1 }; result.rerender(tree()) } }
}
const postCalls = api => api.mock.calls.filter(([, options]) => options?.method === 'POST')

async function openReview(user, name = /Internet/) {
  await user.click(await screen.findByRole('checkbox', { name }))
  await user.click(screen.getByRole('button', { name: 'Revisar cierre' }))
  return screen.getByRole('dialog', { name: 'Revisá tu cierre' })
}

describe('SettlementsPage', () => {
  it('closes exactly the reviewed expenses, period and note only after confirmation', async () => {
    const user = userEvent.setup()
    const { api, invalidate } = renderPage({ closeResult: { id: 8, resumenCierre: { cantidadGastosCerrados: 1, totalLiquidado: 200.2, presupuestoRestante: 799.8 } } })
    expect(await screen.findByRole('button', { name: 'Revisar cierre' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/^Período del cierre/), { target: { value: '2027-03' } })
    await user.click(screen.getByText('Agregar una nota', { exact: true }))
    await user.type(screen.getByLabelText('Nota del cierre'), 'Servicios compartidos')
    const dialog = await openReview(user)
    expect(postCalls(api)).toHaveLength(0)
    expect(within(dialog).getByText(/no registra pagos entre personas/)).toBeVisible()
    expect(within(dialog).getByText('Marzo 2027')).toBeVisible()
    expect(within(dialog).getByRole('list', { name: 'Gastos a liquidar' })).toHaveTextContent('Internet')
    expect(within(dialog).queryByText('Supermercado')).not.toBeInTheDocument()
    expect(within(dialog).getByText('Servicios compartidos')).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar cierre' }))
    expect(postCalls(api)[0]).toEqual(['/api/v1/espacios/1/liquidaciones/cierre', { method: 'POST', body: { gastoIds: [2], mes: 3, anio: 2027, descripcion: 'Servicios compartidos' } }])
    expect(await screen.findByText(/Presupuesto restante: .*799,80/)).toBeInTheDocument()
    expect(invalidate).toHaveBeenCalled()
  })

  it('keeps selection, period and note when switching to history and back', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('checkbox', { name: /Supermercado/ }))
    await user.click(screen.getByText('Agregar una nota', { exact: true }))
    await user.type(screen.getByLabelText('Nota del cierre'), 'Mi cierre')
    fireEvent.change(screen.getByLabelText(/^Período del cierre/), { target: { value: '2027-02' } })
    await user.click(screen.getByRole('tab', { name: 'Historial' }))
    expect(await screen.findByRole('button', { name: 'Ver detalle de la liquidación #7' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Revisar cierre' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Pendientes' }))
    expect(screen.getByRole('checkbox', { name: /Supermercado/ })).toBeChecked()
    expect(screen.getByLabelText('Nota del cierre')).toHaveValue('Mi cierre')
    expect(screen.getByLabelText(/^Período del cierre/)).toHaveValue('2027-02')
  })

  it('toggles all pending expenses and never offers settled expenses for selection', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: 'Seleccionar todos' })
    await user.click(screen.getByText('Supermercado', { exact: true }))
    expect(screen.getByRole('checkbox', { name: /Supermercado/ })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Seleccionar todos' }))
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    screen.getAllByRole('checkbox').forEach(box => expect(box).toBeChecked())
    await user.click(screen.getByRole('button', { name: 'Quitar selección' }))
    screen.getAllByRole('checkbox').forEach(box => expect(box).not.toBeChecked())
    expect(screen.getByRole('button', { name: 'Revisar cierre' })).toBeDisabled()
  })

  it('blocks a close above the budget', async () => {
    const user = userEvent.setup()
    const { api } = renderPage({ presupuesto: 150 })
    await user.click(await screen.findByRole('button', { name: 'Seleccionar todos' }))
    expect(screen.getByText(/supera el presupuesto disponible/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Revisar cierre' })).toBeDisabled()
    expect(postCalls(api)).toHaveLength(0)
  })

  it('does not enable a close without a confirmed budget or valid period', async () => {
    const user = userEvent.setup()
    renderPage({ presupuesto: null })
    await user.click(await screen.findByRole('checkbox', { name: /Internet/ }))
    expect(screen.getByText('No disponible')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Revisar cierre' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/^Período del cierre/), { target: { value: '' } })
    expect(screen.getByText(/Elegí un mes y un año/)).toBeVisible()
  })

  it('requires another review if the budget changes while the confirmation is open', async () => {
    const user = userEvent.setup()
    const { api, update } = renderPage()
    await openReview(user)
    update({ space: { id: 1, presupuestoBase: 900 } })
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(/Los gastos o el presupuesto cambiaron/)).toBeVisible()
    expect(postCalls(api)).toHaveLength(0)
  })

  it('does not submit expenses removed by a refresh while the review is open', async () => {
    const user = userEvent.setup()
    const { api, updateExpenses } = renderPage()
    await openReview(user)
    updateExpenses(expenses.filter(expense => expense.id !== 2))
    await waitFor(() => expect(api.mock.calls.filter(([path]) => path.endsWith('/gastos'))).toHaveLength(2))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar cierre' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre' }))
    expect(screen.getByText(/Los gastos o el presupuesto cambiaron/)).toBeVisible()
    expect(postCalls(api)).toHaveLength(0)
  })

  it('keeps history available when the pending expenses request fails', async () => {
    const user = userEvent.setup()
    renderPage({ expenseError: new Error('Gastos no disponibles') })
    expect(await screen.findByText('Gastos no disponibles')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Revisar cierre' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'No hay gastos pendientes de liquidar' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Historial' }))
    expect(await screen.findByRole('button', { name: 'Ver detalle de la liquidación #7' })).toBeVisible()
  })

  it('keeps the reviewed values and note after a recoverable server error', async () => {
    const user = userEvent.setup()
    renderPage({ closeResult: new ApiError('No pudimos registrar el cierre.', { status: 500 }) })
    await screen.findByRole('button', { name: 'Revisar cierre' })
    await user.click(screen.getByText('Agregar una nota', { exact: true }))
    await user.type(screen.getByLabelText('Nota del cierre'), 'Conservar esta nota')
    const dialog = await openReview(user)
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar cierre' }))
    expect(await within(dialog).findByText('No pudimos registrar el cierre.')).toBeVisible()
    expect(within(dialog).getByText('Conservar esta nota')).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Volver' }))
    expect(screen.getByLabelText('Nota del cierre')).toHaveValue('Conservar esta nota')
    expect(screen.getByRole('checkbox', { name: /Internet/ })).toBeChecked()
  })

  it('reloads after a conflict without losing the accounting note', async () => {
    const user = userEvent.setup()
    const { invalidate } = renderPage({ closeResult: new ApiError('Uno o más gastos ya fueron liquidados', { status: 409, code: 'CONFLICTO' }) })
    await screen.findByRole('button', { name: 'Revisar cierre' })
    await user.click(screen.getByText('Agregar una nota', { exact: true }))
    await user.type(screen.getByLabelText('Nota del cierre'), 'Nota a conservar')
    await openReview(user, /Supermercado/)
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre' }))
    expect(await screen.findByText('Uno o más gastos ya fueron liquidados')).toBeVisible()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Nota del cierre')).toHaveValue('Nota a conservar')
    expect(invalidate).toHaveBeenCalled()
  })

  it('offers a compact empty history without filters before the first close', async () => {
    const user = userEvent.setup()
    renderPage({ historyData: [] })
    await user.click(screen.getByRole('tab', { name: 'Historial' }))
    expect(await screen.findByRole('heading', { name: 'Tu historial empieza con el primer cierre' })).toBeVisible()
    expect(screen.queryByRole('form', { name: 'Filtrar historial' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ver gastos pendientes' }))
    expect(screen.getByRole('tab', { name: 'Pendientes' })).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps filters and a clear action when a filtered history is empty', async () => {
    const user = userEvent.setup()
    renderPage({ historyData: [], route: '/?vista=historial&modo=periodo&mes=10&anio=2026' })
    expect(await screen.findByRole('heading', { name: 'No hay cierres para este filtro' })).toBeVisible()
    expect(screen.getByRole('form', { name: 'Filtrar historial' })).toBeVisible()
    await user.click(within(screen.getByRole('form', { name: 'Filtrar historial' })).getByRole('button', { name: 'Limpiar filtros' }))
    expect(await screen.findByRole('heading', { name: 'Tu historial empieza con el primer cierre' })).toBeVisible()
    expect(screen.getByTestId('location')).toHaveTextContent('vista=historial')
    expect(screen.getByTestId('location')).not.toHaveTextContent('modo=')
  })

  it('treats a history load failure as an error, not an empty history', async () => {
    const user = userEvent.setup()
    renderPage({ historyError: new Error('Historial no disponible') })
    await user.click(screen.getByRole('tab', { name: 'Historial' }))
    expect(await screen.findByText('Historial no disponible')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Tu historial empieza con el primer cierre' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeVisible()
  })

  it('lets members read history and detail without offering a close', async () => {
    const user = userEvent.setup()
    renderPage({ isAdmin: false })
    expect(screen.getByRole('tab', { name: 'Historial' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('button', { name: 'Revisar cierre' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Ver detalle de la liquidación #7' }))
    const dialog = screen.getByRole('dialog', { name: 'Liquidación #7' })
    expect(within(dialog).getByText('Luz')).toBeVisible()
    expect(within(dialog).getByText(/Un gasto de esta liquidación no está disponible/)).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar diálogo' }))
    await user.click(screen.getByRole('tab', { name: 'Pendientes' }))
    expect(screen.getByText(/Solo los administradores/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Revisar cierre' })).not.toBeInTheDocument()
  })
})
