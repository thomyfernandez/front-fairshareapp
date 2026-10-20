import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { WorkspaceContext } from '../app/workspace-context'
import { UIProvider } from '../components/ui'
import SpaceSettings from '../features/espacios/SpaceSettings'
import { ApiError } from '../api'

const initial = { id: 1, nombre: 'Nuestro hogar', descripcion: 'Las cuentas de casa', tipo: 'HOGAR', reglaReparto: 'PROPORCIONAL', presupuestoBase: 2000000, codigo: 'CASA-2026' }
function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}</output> }
function renderSettings({ isAdmin = true, result, failure, space = initial } = {}) {
  const invalidate = vi.fn()
  let workspace
  const api = vi.fn(async (_path, options) => {
    if (failure) throw failure
    return result || { ...workspace.space, ...options.body }
  })
  workspace = { space, spaceId: '1', isAdmin, api, revision: 0, invalidate, session: { usuario: { id: 1 } } }
  const tree = () => <MemoryRouter initialEntries={['/espacios/1/configuracion']}><UIProvider><WorkspaceContext.Provider value={workspace}><SpaceSettings /><Location /></WorkspaceContext.Provider></UIProvider></MemoryRouter>
  const view = render(tree())
  return { api, invalidate, update: values => { workspace = { ...workspace, ...values }; view.rerender(tree()) } }
}
const saveButton = () => screen.getByRole('button', { name: 'Guardar cambios' })
const budgetField = () => screen.getByRole('textbox', { name: /Saldo disponible/ })

describe('Space settings', () => {
  it('starts clean, shows formatted budget and activates save only for a real change', async () => {
    const user = userEvent.setup({ delay: null })
    renderSettings()
    expect(budgetField()).toHaveValue('2.000.000,00')
    expect(saveButton()).toBeDisabled()
    expect(screen.getByText('Sin cambios pendientes')).toBeVisible()
    await user.type(screen.getByRole('textbox', { name: /Nombre del espacio/ }), ' nuevo')
    expect(screen.getByText('Tenés cambios sin guardar')).toBeVisible()
    expect(saveButton()).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(screen.getByRole('textbox', { name: /Nombre del espacio/ })).toHaveValue(initial.nombre)
    expect(saveButton()).toBeDisabled()
  })
  it('updates only modified fields and waits for server confirmation before reporting success', async () => {
    const user = userEvent.setup({ delay: null })
    const { api, invalidate } = renderSettings()
    await user.clear(screen.getByRole('textbox', { name: /Nombre del espacio/ }))
    await user.type(screen.getByRole('textbox', { name: /Nombre del espacio/ }), 'Casa nueva')
    await user.click(saveButton())
    expect(api).toHaveBeenCalledWith('/api/v1/espacios/1?solicitanteId=1', { method: 'PUT', body: { nombre: 'Casa nueva' } })
    await waitFor(() => expect(saveButton()).toBeDisabled())
    expect(screen.getAllByText('Cambios guardados.').length).toBeGreaterThan(0)
    expect(screen.getByRole('textbox', { name: /Nombre del espacio/ })).toHaveValue('Casa nueva')
    expect(invalidate).toHaveBeenCalledOnce()
  })
  it('uses confirmed server values after a save', async () => {
    const user = userEvent.setup({ delay: null })
    renderSettings({ result: { ...initial, nombre: 'Casa normalizada' } })
    await user.type(screen.getByRole('textbox', { name: /Nombre del espacio/ }), ' x')
    await user.click(saveButton())
    expect(await screen.findByDisplayValue('Casa normalizada')).toBeVisible()
    expect(saveButton()).toBeDisabled()
  })
  it('validates name locally and preserves edits on server failures', async () => {
    const user = userEvent.setup({ delay: null })
    const { api } = renderSettings({ failure: new ApiError('Ese nombre ya está en uso.', { status: 409 }) })
    const name = screen.getByRole('textbox', { name: /Nombre del espacio/ })
    await user.clear(name)
    await user.type(name, 'A')
    await user.click(saveButton())
    expect(name).toHaveAccessibleDescription('El nombre debe tener entre 2 y 100 caracteres.')
    expect(name).toHaveFocus()
    expect(api).not.toHaveBeenCalled()
    await user.clear(name)
    await user.type(name, 'Otra casa')
    await user.click(saveButton())
    await waitFor(() => expect(within(screen.getByRole('form', { name: 'Configuración del espacio' })).getByRole('alert')).toHaveTextContent('Ese nombre ya está en uso.'))
    expect(name).toHaveValue('Otra casa')
    expect(screen.queryByText('Cambios guardados.')).not.toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
  })
  it('reviews a budget replacement with exact cents, supports cancel and posts only after accepting', async () => {
    const user = userEvent.setup({ delay: null })
    const { api } = renderSettings()
    await user.clear(budgetField())
    await user.type(budgetField(), '1500000,25')
    await user.tab()
    expect(budgetField()).toHaveValue('1.500.000,25')
    await user.click(saveButton())
    const review = screen.getByRole('dialog', { name: 'Revisá los cambios del espacio' })
    expect(review).toHaveTextContent('2.000.000,00')
    expect(review).toHaveTextContent('1.500.000,25')
    expect(review).toHaveTextContent('no se suma')
    expect(api).not.toHaveBeenCalled()
    await user.click(within(review).getByRole('button', { name: 'Cancelar' }))
    expect(budgetField()).toHaveValue('1.500.000,25')
    await user.click(saveButton())
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar cambios' }))
    expect(api).toHaveBeenCalledWith(expect.any(String), { method: 'PUT', body: { presupuestoBase: 1500000.25 } })
  })
  it('keeps invalid and missing budgets unavailable instead of silently using zero', async () => {
    const user = userEvent.setup({ delay: null })
    renderSettings({ space: { ...initial, presupuestoBase: null } })
    expect(budgetField()).toHaveValue('')
    expect(screen.getByText('Sin cambios pendientes')).toBeVisible()
    expect(saveButton()).toBeDisabled()
    for (const value of ['-100', '1,234', '10.000.000.000']) {
      fireEvent.change(budgetField(), { target: { value } })
      expect(budgetField()).toHaveAttribute('aria-invalid', 'true')
      expect(saveButton()).toBeDisabled()
    }
    fireEvent.change(budgetField(), { target: { value: '0' } })
    await user.tab()
    expect(saveButton()).toBeEnabled()
  })
  it('reviews the new split before sending it, with native radio keyboard selection', async () => {
    const user = userEvent.setup({ delay: null })
    const { api } = renderSettings()
    await user.click(screen.getByRole('radio', { name: /Según los ingresos/ }))
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: /En partes iguales/ })).toBeChecked()
    await user.click(saveButton())
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Los gastos existentes conservan su reparto')
    expect(api).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    expect(api).toHaveBeenCalledWith(expect.any(String), { method: 'PUT', body: { reglaReparto: 'CINCUENTA_CINCUENTA' } })
  })
  it('requires a new review when the budget changes while the confirmation is open', async () => {
    const user = userEvent.setup({ delay: null })
    const { api, update } = renderSettings()
    await user.clear(budgetField()); await user.type(budgetField(), '500,50')
    await user.click(saveButton())
    update({ space: { ...initial, presupuestoBase: 1900000 } })
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar cambios' }))
    expect(api).not.toHaveBeenCalled()
    expect(await screen.findByText(/Los datos del espacio cambiaron/)).toBeVisible()
    expect(budgetField()).toHaveValue('500,50')
  })
  it('reflects fresh unedited values without overwriting a draft or posting an old budget', async () => {
    const user = userEvent.setup({ delay: null })
    const { api, update } = renderSettings()
    await user.type(screen.getByRole('textbox', { name: /Nombre del espacio/ }), ' nuevo')
    update({ space: { ...initial, presupuestoBase: 1745536 } })
    expect(budgetField()).toHaveValue('1.745.536,00')
    await user.click(saveButton())
    expect(api).toHaveBeenCalledWith(expect.any(String), { method: 'PUT', body: { nombre: 'Nuestro hogar nuevo' } })
  })
  it('shows member details and invitation without editing or delete controls', () => {
    renderSettings({ isAdmin: false })
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Guardar cambios|Eliminar este espacio/ })).not.toBeInTheDocument()
    expect(screen.getByText('Según los ingresos')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Copiar invitación' })).toBeVisible()
  })
  it('reviews deletion and never deletes on cancellation', async () => {
    const user = userEvent.setup({ delay: null })
    const { api } = renderSettings()
    await user.click(screen.getByRole('button', { name: 'Eliminar este espacio' }))
    const dialog = screen.getByRole('dialog', { name: '¿Eliminar «Nuestro hogar»?' })
    expect(dialog).toHaveTextContent('no se puede deshacer')
    expect(api).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(api).not.toHaveBeenCalled()
  })
  it('shows other invitation methods on demand and copies the full join link', async () => {
    const user = userEvent.setup({ delay: null })
    const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    renderSettings()
    expect(screen.getByRole('button', { name: 'Copiar solo el código' })).not.toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Copiar invitación' }))
    expect(copy).toHaveBeenLastCalledWith(expect.stringContaining('/espacios?unirse=1&codigo=CASA-2026'))
    await user.click(screen.getByText('Otras formas de invitar', { exact: true }))
    await user.click(screen.getByRole('button', { name: 'Copiar solo el código' }))
    expect(copy).toHaveBeenLastCalledWith('CASA-2026')
  })
  it('reports clipboard failures without claiming the invitation was copied', async () => {
    const user = userEvent.setup({ delay: null })
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Sin acceso'))
    renderSettings()
    await user.click(screen.getByRole('button', { name: 'Copiar invitación' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo copiar')
    expect(screen.getByRole('button', { name: 'Copiar invitación' })).toBeVisible()
  })
})
