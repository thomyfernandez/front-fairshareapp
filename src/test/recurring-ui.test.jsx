import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'
import { AppRoutes } from '../app/AppRoutes'
import { UIProvider } from '../components/ui'
import { SessionContext } from '../features/auth/session-context'
import { money, nextMonth, today } from '../lib/format'
import { clearSessionDrafts, readDraft, saveDraft } from '../lib/draft-storage'

beforeEach(clearSessionDrafts)

function setup({ templates = [], failUpdate = false, failBatchOnce = false } = {}) {
  const api = vi.fn(async (path, options = {}) => {
    if (options.method) {
      if (failUpdate && options.method === 'PUT') throw new Error('No pudimos actualizar la plantilla')
      if (path.endsWith('/gastos/lote')) {
        if (failBatchOnce) { failBatchOnce = false; throw new Error('No pudimos registrar los gastos') }
        return options.body.map((item, index) => ({ id: index + 100, ...item }))
      }
      return { id: 9, ...options.body }
    }
    if (path === '/api/v1/espacios') return [{ id: 1, nombre: 'Casa' }]
    if (path === '/api/v1/espacios/1') return { id: 1, nombre: 'Casa' }
    if (path.endsWith('/miembros')) return [{ usuarioId: 1, nombreUsuario: 'Ana', rol: 'ADMIN' }, { usuarioId: 2, nombreUsuario: 'Thomas', rol: 'MIEMBRO' }]
    if (path.endsWith('/favoritos')) return templates
    return []
  })
  render(<MemoryRouter initialEntries={['/espacios/1/recurrentes']}><SessionContext.Provider value={{ session: { usuario: { id: 1, nombre: 'Ana' } }, api }}><UIProvider><AppRoutes /></UIProvider></SessionContext.Provider></MemoryRouter>)
  return api
}

async function createForm(user) {
  await user.click(await screen.findByText('Crear plantilla', { selector: 'summary span' }))
  const form = screen.getByRole('form', { name: 'Crear plantilla recurrente' })
  await user.type(within(form).getByLabelText(/^Nombre/), 'Luz')
  return form
}

it('crea una plantilla sin exigir un importe adicional y envía cero en el contrato existente', async () => {
  const user = userEvent.setup()
  const api = setup()
  const form = await createForm(user)
  expect(within(form).getByLabelText(/^Importe adicional/)).not.toBeVisible()
  fireEvent.change(within(form).getByLabelText(/^Monto del gasto/), { target: { value: '34566' } })
  expect(within(form).getByRole('status')).toHaveTextContent(money(34566).replace(/\s/g, ' '))
  await user.click(within(form).getByRole('button', { name: 'Crear plantilla' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/api/v1/espacios/1/favoritos', expect.objectContaining({ method: 'POST', body: expect.objectContaining({ montoBase: 34566, montoVariable: 0 }) })))
})

const template = (overrides = {}) => ({ id: 9, nombre: 'Luz', montoBase: 100.1, montoVariable: 20.2, pagadorId: 2, reglaDivision: 'EQUITATIVA', categoriaId: 3, fechaProximaRevision: nextMonth(), vencido: false, ...overrides })

it('agrega una sola copia al borrador, conserva la selección al navegar y permite quitarla desde la bandeja', async () => {
  const user = userEvent.setup()
  const api = setup({ templates: [template()] })
  await user.click(await screen.findByRole('button', { name: 'Agregar Luz para registrar' }))
  const tray = screen.getByRole('region', { name: 'Gastos para registrar' })
  expect(tray).toHaveTextContent('1 gasto para registrar')
  expect(tray).toHaveTextContent(money(120.3).replace(/\s/g, ' '))
  expect(readDraft(1, 1, 'lote').gastos).toHaveLength(1)
  expect(readDraft(1, 1, 'lote').gastos[0]).toMatchObject({ descripcion: 'Luz', monto: '120.3', pagadorId: '2', fecha: today(), categoriaId: 3, participantes: [{ usuarioId: 1 }, { usuarioId: 2 }] })
  expect(api.mock.calls.filter(([, options]) => options?.method)).toHaveLength(0)
  await user.click(screen.getByRole('link', { name: 'Gastos', exact: true }))
  await screen.findByRole('heading', { name: 'Gastos', exact: true })
  await user.click(screen.getByRole('link', { name: 'Recurrentes', exact: true }))
  expect(await screen.findByRole('button', { name: 'Quitar Luz de la selección' })).toBeEnabled()
  expect(readDraft(1, 1, 'lote').gastos).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: 'Ver selección' }))
  const dialog = screen.getByRole('dialog', { name: 'Gastos para registrar' })
  await user.click(within(dialog).getByRole('button', { name: 'Quitar Luz de la selección' }))
  expect(within(dialog).getByText('No hay gastos seleccionados')).toBeVisible()
  expect(within(dialog).getByRole('button', { name: 'Seguir eligiendo' })).toHaveFocus()
  expect(readDraft(1, 1, 'lote')).toBeNull()
  await user.click(within(dialog).getByRole('button', { name: 'Seguir eligiendo' }))
  expect(screen.getByRole('button', { name: 'Agregar Luz para registrar' })).toBeEnabled()
})

it('suma las plantillas al borrador existente y registra solo después de revisar; un error conserva el lote', async () => {
  saveDraft(1, 1, 'lote', { gastos: [{ tempId: 7, descripcion: 'Compra manual', monto: '50', fecha: today(), pagadorId: '1', tipoReparto: 'EQUITATIVA', participantes: [{ usuarioId: 1 }], touched: true }], removed: null })
  saveDraft(1, 2, 'lote', { gastos: [{ tempId: 1, descripcion: 'Otro espacio', monto: '999', fecha: today(), participantes: [] }] })
  const user = userEvent.setup()
  const api = setup({ templates: [template({ reglaDivision: 'PROPORCIONAL_INGRESOS' })], failBatchOnce: true })
  await user.click(await screen.findByRole('button', { name: 'Agregar Luz para registrar' }))
  expect(readDraft(1, 1, 'lote').gastos.map(row => row.descripcion)).toEqual(['Compra manual', 'Luz'])
  expect(readDraft(1, 2, 'lote').gastos[0].descripcion).toBe('Otro espacio')
  await user.click(screen.getByRole('button', { name: 'Revisar gastos', exact: true }))
  await screen.findByRole('heading', { name: 'Agregar varios gastos' })
  expect(screen.getByDisplayValue('Compra manual')).toBeVisible()
  expect(screen.getByDisplayValue('Luz')).toBeVisible()
  expect(screen.getByDisplayValue('120.3')).toBeVisible()
  expect(api.mock.calls.filter(([, options]) => options?.method)).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Registrar 2 gastos', exact: true }))
  const review = screen.getByRole('dialog', { name: 'Confirmar registro' })
  expect(review).toHaveTextContent('Vas a registrar 2 gastos en Casa.')
  expect(within(review).getByText('Luz')).not.toBeVisible()
  expect(within(review).getByText('Total a registrar')).toBeVisible()
  expect(api.mock.calls.filter(([, options]) => options?.method)).toHaveLength(0)
  await user.click(within(review).getByRole('button', { name: 'Confirmar registro' }))
  expect(await screen.findByText('No pudimos registrar los gastos')).toBeVisible()
  expect(readDraft(1, 1, 'lote').gastos).toHaveLength(2)
  expect(screen.getByDisplayValue('Luz')).toBeVisible()
  expect(api).toHaveBeenCalledWith('/api/v1/espacios/1/gastos/lote', expect.objectContaining({ method: 'POST', body: [expect.objectContaining({ descripcion: 'Compra manual', monto: 50, participantes: [{ usuarioId: 1 }] }), expect.objectContaining({ descripcion: 'Luz', monto: 120.3, pagadorId: 2, categoriaId: 3, regla: 'PROPORCIONAL_INGRESOS', participantes: [{ usuarioId: 1 }, { usuarioId: 2 }] })] }))
  await user.click(screen.getByRole('button', { name: 'Registrar 2 gastos', exact: true }))
  await user.click(within(screen.getByRole('dialog', { name: 'Confirmar registro' })).getByRole('button', { name: 'Confirmar registro' }))
  await waitFor(() => expect(readDraft(1, 1, 'lote')).toBeNull())
  expect(readDraft(1, 2, 'lote').gastos[0].descripcion).toBe('Otro espacio')
  expect(api.mock.calls.filter(([path]) => path.includes('/ejecutar'))).toHaveLength(0)
})

it('exige actualizar plantillas vencidas, importes inválidos o pagadores fuera del espacio', async () => {
  const api = setup({ templates: [template({ vencido: true }), template({ id: 10, nombre: 'Internet', pagadorId: 42 }), template({ id: 11, nombre: 'Gas', montoBase: 0, montoVariable: 0 })] })
  expect(await screen.findByRole('button', { name: 'Agregar Luz para registrar' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Agregar Internet para registrar' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Agregar Gas para registrar' })).toBeDisabled()
  expect(screen.getByText('Actualizá el monto y la revisión antes de agregarla.')).toBeVisible()
  expect(api.mock.calls.filter(([, options]) => options?.method)).toHaveLength(0)
})

it('no sobrescribe un borrador ilegible ni excede la capacidad del lote', async () => {
  saveDraft(1, 1, 'lote', { gastos: 'datos no reconocidos' })
  const user = userEvent.setup()
  setup({ templates: [template()] })
  await user.click(await screen.findByRole('button', { name: 'Agregar Luz para registrar' }))
  expect(screen.getByText(/No pudimos leer el borrador/)).toBeVisible()
  expect(readDraft(1, 1, 'lote').gastos).toBe('datos no reconocidos')
  const rows = Array.from({ length: 100 }, (_, index) => ({ tempId: index + 1, descripcion: `Compra ${index}`, monto: '10', fecha: today(), participantes: [] }))
  saveDraft(1, 1, 'lote', { gastos: rows })
  await user.click(screen.getByRole('button', { name: 'Agregar Luz para registrar' }))
  expect(screen.getByText(/Podés agregar hasta 100 gastos juntos/)).toBeVisible()
  expect(readDraft(1, 1, 'lote').gastos).toHaveLength(100)
})

it('suma el adicional con centavos y conserva su valor al plegarlo', async () => {
  const user = userEvent.setup()
  const api = setup()
  const form = await createForm(user)
  fireEvent.change(within(form).getByLabelText(/^Monto del gasto/), { target: { value: '1000.50' } })
  await user.click(within(form).getByText('Agregar un importe adicional'))
  const additional = within(form).getByLabelText(/^Importe adicional/)
  fireEvent.change(additional, { target: { value: '350.25' } })
  expect(within(form).getByRole('status')).toHaveTextContent(money(1350.75).replace(/\s/g, ' '))
  await user.click(within(form).getByText('Importe adicional (opcional)'))
  expect(additional).not.toBeVisible()
  expect(within(form).getByRole('status')).toHaveTextContent(money(1350.75).replace(/\s/g, ' '))
  await user.click(within(form).getByRole('button', { name: 'Crear plantilla' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/api/v1/espacios/1/favoritos', expect.objectContaining({ method: 'POST', body: expect.objectContaining({ montoBase: 1000.5, montoVariable: 350.25 }) })))
})

it('muestra los adicionales existentes al actualizar y preserva los importes si falla el envío', async () => {
  const user = userEvent.setup()
  const api = setup({ templates: [{ id: 9, nombre: 'Internet', montoBase: 100, montoVariable: 20, fechaProximaRevision: nextMonth(), vencido: false }], failUpdate: true })
  await user.click(await screen.findByText('Actualizar monto y revisión', { selector: 'summary span' }))
  const form = screen.getByRole('form', { name: 'Actualizar plantilla Internet' })
  const additional = within(form).getByLabelText(/^Importe adicional/)
  expect(additional).toBeVisible()
  expect(additional).toHaveValue(20)
  fireEvent.change(within(form).getByLabelText(/^Monto del gasto/), { target: { value: '200' } })
  expect(within(form).getByRole('status')).toHaveTextContent(money(220).replace(/\s/g, ' '))
  await user.click(within(form).getByRole('button', { name: 'Actualizar' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/api/v1/favoritos/9/actualizar-monto', expect.objectContaining({ method: 'PUT', body: expect.objectContaining({ nuevoMontoBase: 200, nuevoMontoVariable: 20 }) })))
  expect(await screen.findByText('No pudimos actualizar la plantilla')).toBeVisible()
  expect(within(form).getByLabelText(/^Monto del gasto/)).toHaveValue(200)
  expect(additional).toHaveValue(20)
})
