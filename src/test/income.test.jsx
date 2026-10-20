import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { WorkspaceContext } from '../app/workspace-context'
import { UIProvider } from '../components/ui'
import IncomePage from '../features/ingresos/IncomePage'
import { DeclaredIncomeForm } from '../features/ingresos/DeclaredIncomeForm'
import { findByPeriod, sortByPeriodDesc } from '../features/ingresos/model'

const now = new Date()
const incomes = [
  { id: 1, monto: 1000, tipo: 'FIJO', frecuencia: 'MENSUAL', mes: 1, anio: 2025 },
  { id: 2, monto: 2500, tipo: 'VARIABLE', frecuencia: 'QUINCENAL', mes: now.getMonth() + 1, anio: now.getFullYear() },
]

function renderWith(ui, api) {
  const workspace = { api, revision: 0, invalidate: vi.fn(), session: { usuario: { id: 5 } }, members: [], isAdmin: false }
  render(<MemoryRouter><UIProvider><WorkspaceContext.Provider value={workspace}>{ui}</WorkspaceContext.Provider></UIProvider></MemoryRouter>)
  return workspace
}

describe('income model', () => {
  it('finds the record of a period, ignoring the one being edited', () => {
    expect(findByPeriod(incomes, 1, 2025)?.id).toBe(1)
    expect(findByPeriod(incomes, 1, 2025, 1)).toBeNull()
    expect(sortByPeriodDesc(incomes).map(income => income.id)).toEqual([2, 1])
  })
})

describe('IncomePage', () => {
  it('warns that saving an existing period updates its record', async () => {
    const user = userEvent.setup({ delay: null })
    const api = vi.fn(async (path, { method = 'GET' } = {}) => method === 'GET' ? incomes : { id: 2 })
    renderWith(<IncomePage />, api)
    await user.click(await screen.findByRole('button', { name: 'Agregar ingreso' }))
    const dialog = screen.getByRole('dialog', { name: 'Agregar ingreso' })
    expect(within(dialog).getByText(/ese registro se actualizará/)).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/Monto/), '3000')
    await user.click(within(dialog).getByRole('button', { name: 'Actualizar ingreso' }))
    expect(api).toHaveBeenCalledWith('/api/v1/sueldos', expect.objectContaining({ method: 'POST', body: expect.objectContaining({ monto: 3000, mes: now.getMonth() + 1 }) }))
    expect(await screen.findByText(/actualizado\./)).toBeInTheDocument()
  })

  it('edits with PUT and asks for confirmation before deleting', async () => {
    const user = userEvent.setup({ delay: null })
    const api = vi.fn(async (path, { method = 'GET' } = {}) => method === 'GET' ? incomes : null)
    renderWith(<IncomePage />, api)
    await user.click(await screen.findByRole('button', { name: 'Editar ingreso de Enero 2025' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(api).toHaveBeenCalledWith('/api/v1/sueldos/1', expect.objectContaining({ method: 'PUT' }))

    await user.click(await screen.findByRole('button', { name: 'Eliminar ingreso de Enero 2025' }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar ingreso' })
    expect(api).not.toHaveBeenCalledWith('/api/v1/sueldos/1', expect.objectContaining({ method: 'DELETE' }))
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    expect(api).toHaveBeenCalledWith('/api/v1/sueldos/1', expect.objectContaining({ method: 'DELETE' }))
  })
})

describe('DeclaredIncomeForm', () => {
  it('saves the declared income of the current member in the space', async () => {
    const user = userEvent.setup({ delay: null })
    const api = vi.fn(async () => ({ sueldoDeclarado: 900 }))
    renderWith(<DeclaredIncomeForm spaceId={3} member={{ usuarioId: 5, sueldoDeclarado: 800 }} />, api)
    const input = screen.getByLabelText(/Ingreso declarado/)
    expect(input).toHaveValue(800)
    await user.clear(input)
    await user.type(input, '900')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(api).toHaveBeenCalledWith('/api/v1/espacios/3/miembros/5/sueldo', expect.objectContaining({ method: 'PUT', body: { sueldoDeclarado: 900 } }))
  })
})
