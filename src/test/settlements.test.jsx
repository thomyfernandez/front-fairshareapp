import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { WorkspaceContext } from '../app/workspace-context'
import { UIProvider } from '../components/ui'
import SettlementsPage from '../features/liquidaciones/SettlementsPage'
import { historyQuery, settlementExpenses, settlementPreview } from '../features/liquidaciones/model'

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
  it('never combines period and date filters', () => {
    expect(historyQuery({ modo: 'periodo', mes: '10', anio: '2026', desde: '2026-01-01' }).query).toBe('anio=2026&mes=10')
    expect(historyQuery({ modo: 'fechas', desde: '2026-01-01', mes: '10' }).query).toBe('desde=2026-01-01')
    expect(historyQuery({ modo: 'fechas', desde: '2026-02-01', hasta: '2026-01-01' }).error).toMatch(/anterior/)
  })
  it('reports settled expenses that are no longer available instead of inventing them', () => {
    expect(settlementExpenses(history[0], expenses)).toEqual({ found: [expenses[2]], missing: 1 })
  })
})

function renderPage({ isAdmin = true, presupuesto = 1000, closeResult } = {}) {
  const invalidate = vi.fn()
  const api = vi.fn(async (path, { method = 'GET' } = {}) => {
    if (method === 'POST') {
      if (closeResult instanceof Error) throw closeResult
      return closeResult
    }
    if (path.includes('/historial')) return history
    if (path.endsWith('/gastos')) return expenses
    return []
  })
  const workspace = {
    spaceId: '1', space: { id: 1, presupuestoBase: presupuesto }, api, revision: 0, invalidate, isAdmin,
    session: { usuario: { id: 1 } }, members: [], membersState: { data: [], loading: false, error: null },
  }
  render(<MemoryRouter><UIProvider><WorkspaceContext.Provider value={workspace}><SettlementsPage /></WorkspaceContext.Provider></UIProvider></MemoryRouter>)
  return { api, invalidate }
}

describe('SettlementsPage', () => {
  it('closes exactly the selected expenses after a confirmation that shows the impact', async () => {
    const user = userEvent.setup()
    const { api, invalidate } = renderPage({ closeResult: { id: 8, resumenCierre: { cantidadGastosCerrados: 1, totalLiquidado: 200.2, presupuestoRestante: 799.8 } } })
    const review = await screen.findByRole('button', { name: 'Revisar cierre' })
    expect(review).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /Internet/ }))
    await user.click(review)
    const dialog = screen.getByRole('dialog', { name: 'Confirmar cierre' })
    expect(within(dialog).getByText(/no registra pagos entre personas/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /Liquidar/ }))
    const post = api.mock.calls.find(([, options]) => options?.method === 'POST')
    expect(post[0]).toBe('/api/v1/espacios/1/liquidaciones/cierre')
    expect(post[1].body.gastoIds).toEqual([2])
    expect(await screen.findByText(/Presupuesto restante: .*799,80/)).toBeInTheDocument()
    expect(invalidate).toHaveBeenCalled()
  })

  it('blocks the close when the selection exceeds the budget', async () => {
    const user = userEvent.setup()
    renderPage({ presupuesto: 150 })
    await user.click(await screen.findByRole('button', { name: 'Seleccionar todos' }))
    expect(screen.getByText(/supera el presupuesto disponible/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revisar cierre' })).toBeDisabled()
  })

  it('reloads the data when another admin already settled an expense', async () => {
    const user = userEvent.setup()
    const conflict = new ApiError('Uno o más gastos ya fueron liquidados', { status: 409, code: 'CONFLICTO' })
    const { invalidate } = renderPage({ closeResult: conflict })
    await user.click(await screen.findByRole('checkbox', { name: /Supermercado/ }))
    await user.click(screen.getByRole('button', { name: 'Revisar cierre' }))
    await user.click(screen.getByRole('button', { name: /Liquidar/ }))
    expect(await screen.findByText('Uno o más gastos ya fueron liquidados')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Confirmar cierre' })).not.toBeInTheDocument())
    expect(invalidate).toHaveBeenCalled()
  })

  it('lets members read the history and detail without offering the close', async () => {
    const user = userEvent.setup()
    renderPage({ isAdmin: false })
    expect(await screen.findByText(/Solo los administradores/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revisar cierre' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Ver detalle de la liquidación #7' }))
    const dialog = screen.getByRole('dialog', { name: 'Liquidación #7' })
    expect(within(dialog).getByText('Luz')).toBeInTheDocument()
    expect(within(dialog).getByText(/Un gasto de esta liquidación no está disponible/)).toBeInTheDocument()
  })
})
