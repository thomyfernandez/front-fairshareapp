import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../app/AppRoutes'
import { UIProvider } from '../components/ui'
import { SessionContext } from '../features/auth/session-context'
import { clearSessionDrafts, draftKey, readDraft, removeDraft, saveDraft } from '../lib/draft-storage'
import { expensePayload, frequentExpenses, repeatExpense, similarExpenses, validExpenseAmount } from '../features/gastos/expense-experience'
import { today } from '../lib/format'

const members = [{ usuarioId: 1, nombreUsuario: 'Ana', rol: 'ADMIN' }, { usuarioId: 2, nombreUsuario: 'Luis', rol: 'MIEMBRO' }, { usuarioId: 3, nombreUsuario: 'Sol', rol: 'MIEMBRO' }]
const original = { id: 7, descripcion: 'Supermercado', monto: 600, fecha: today(), pagadorId: 2, pagadorNombre: 'Luis', regla: 'EQUITATIVA', estado: 'PENDIENTE', participantes: [{ usuarioId: 1, importe: 300, porcentaje: 50 }, { usuarioId: 2, importe: 300, porcentaje: 50 }] }
const session = { usuario: { id: 1, nombre: 'Ana' } }
function setup({ route = '/espacios/1/gastos', failure, responseAmount } = {}) {
  let data = [{ ...original }]
  const api = vi.fn(async (path, options = {}) => {
    if (options.method === 'POST') {
      if (failure) throw failure
      const create = value => ({ ...value, id: 100 + data.length, monto: responseAmount ?? value.monto, pagadorNombre: 'Ana', estado: 'PENDIENTE', participantes: value.participantes.map(part => ({ ...part, importe: value.monto / value.participantes.length, porcentaje: 100 / value.participantes.length })) })
      const result = Array.isArray(options.body) ? options.body.map(create) : create(options.body)
      data = [...data, ...(Array.isArray(result) ? result : [result])]
      return result
    }
    const clean = path.split('?')[0]
    if (clean === '/api/v1/espacios') return [{ id: 1, nombre: 'Casa', presupuestoBase: 10000 }, { id: 2, nombre: 'Viaje', presupuestoBase: 10000 }]
    if (/\/espacios\/\d+$/.test(clean)) return { id: clean.endsWith('/2') ? 2 : 1, nombre: clean.endsWith('/2') ? 'Viaje' : 'Casa', presupuestoBase: 10000 }
    if (clean.endsWith('/miembros')) return members
    if (clean.endsWith('/gastos')) return data
    if (clean.includes('/gastos/')) return data.find(item => String(item.id) === clean.split('/').at(-1))
    return []
  })
  const view = render(<StrictMode><MemoryRouter initialEntries={[route]}><SessionContext.Provider value={{ session, api }}><UIProvider><AppRoutes /></UIProvider></SessionContext.Provider></MemoryRouter></StrictMode>)
  return { ...view, api }
}
const posts = api => api.mock.calls.filter(([, options]) => options?.method === 'POST')
async function newExpense(user) {
  await user.click(await screen.findByRole('button', { name: 'Registrar gasto', exact: true }))
  await screen.findByRole('textbox', { name: /Descripción del gasto/ })
}

beforeEach(() => { clearSessionDrafts(); sessionStorage.clear(); vi.restoreAllMocks() })

describe('expense experience model and drafts', () => {
  it('matches duplicate descriptions, amount in cents and date, but not different dates or amounts', () => {
    expect(similarExpenses({ descripcion: '  Súpermercado ', monto: '600.00', fecha: today() }, [original])).toHaveLength(1)
    expect(similarExpenses({ ...original, monto: 600.01 }, [original])).toHaveLength(0)
    expect(similarExpenses({ ...original, fecha: '2025-01-01' }, [original])).toHaveLength(0)
    expect(frequentExpenses([original, { ...original, id: 9, descripcion: ' SUPERMERCADO ' }])[0].count).toBe(2)
    expect(validExpenseAmount('0.29')).toBe(true)
    expect(validExpenseAmount('0.001')).toBe(false)
  })
  it('repeats only current members, resets the date and never copies the old expense identity', () => {
    const repeated = repeatExpense({ ...original, id: 77, fecha: '2020-01-01', pagadorId: 99, regla: 'PERSONALIZADA' }, members.slice(0, 1))
    expect(repeated.fecha).toBe(today())
    expect(repeated.pagadorId).toBe('')
    expect(repeated.participantes.map(item => item.usuarioId)).toEqual([1])
    expect(repeated.id).toBeUndefined()
    expect(repeated.tipoReparto).toBe('MONTOS_FIJOS')
  })
  it('uses the real API rules and only the relevant custom allocation field', () => {
    const value = { ...original, tipoReparto: 'PORCENTUAL' }
    expect(expensePayload(value)).toMatchObject({ regla: 'PERSONALIZADA', participantes: [{ usuarioId: 1, porcentaje: 50 }, { usuarioId: 2, porcentaje: 50 }] })
    expect(expensePayload({ ...value, tipoReparto: 'MONTOS_FIJOS' }).participantes).toEqual([{ usuarioId: 1, importe: 300 }, { usuarioId: 2, importe: 300 }])
    expect(expensePayload({ ...value, tipoReparto: 'PROPORCIONAL_INGRESOS' })).toMatchObject({ regla: 'PROPORCIONAL_INGRESOS', participantes: [{ usuarioId: 1 }, { usuarioId: 2 }] })
  })
  it('separates drafts by user, space and kind and clears them on session cleanup', () => {
    saveDraft(1, 1, 'individual', { descripcion: 'Casa' })
    saveDraft(1, 2, 'lote', { gastos: [] })
    expect(readDraft(2, 1, 'individual')).toBeNull()
    expect(readDraft(1, 2, 'individual')).toBeNull()
    expect(readDraft(1, 1, 'individual')).toMatchObject({ descripcion: 'Casa' })
    clearSessionDrafts()
    expect(readDraft(1, 1, 'individual')).toBeNull()
    expect(sessionStorage.getItem(draftKey(1, 1, 'individual'))).toBeNull()
  })
  it('keeps the latest draft in memory if storage is blocked and does not revive discarded data', () => {
    saveDraft(1, 1, 'individual', { descripcion: 'Anterior' })
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota') })
    expect(saveDraft(1, 1, 'individual', { descripcion: 'Actual' })).toBe('memory')
    expect(readDraft(1, 1, 'individual')).toMatchObject({ descripcion: 'Actual' })
    removeDraft(1, 1, 'individual')
    expect(readDraft(1, 1, 'individual')).toBeNull()
    storage.mockRestore()
    sessionStorage.setItem(draftKey(1, 3, 'individual'), 'broken json')
    expect(readDraft(1, 3, 'individual')).toBeNull()
  })
})

describe('expense flows', () => {
  it('repeats an expense from its detail and preserves the participant subset', async () => {
    const user = userEvent.setup()
    const { api } = setup()
    await user.click(await screen.findByRole('button', { name: 'Ver detalle de Supermercado' }))
    await user.click(screen.getByRole('button', { name: 'Repetir gasto' }))
    expect(await screen.findByRole('textbox', { name: /Descripción del gasto/ })).toHaveValue('Supermercado')
    expect(screen.getByLabelText(/^Monto total/)).toHaveValue(600)
    expect(screen.getByLabelText(/^Fecha/)).toHaveValue(today())
    expect(screen.getByRole('checkbox', { name: /Incluir a Sol/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Incluir a Ana/ })).toBeChecked()
    expect(posts(api)).toHaveLength(0)
  })
  it('retains individual draft values and participant selections after leaving and remounting', async () => {
    const user = userEvent.setup()
    const first = setup()
    await newExpense(user)
    await user.type(screen.getByRole('textbox', { name: /Descripción del gasto/ }), 'Compra pendiente')
    await user.type(screen.getByLabelText(/^Monto total/), '321.29')
    await user.click(screen.getByRole('checkbox', { name: /Incluir a Sol/ }))
    await user.click(screen.getByRole('button', { name: 'Guardar borrador y salir' }))
    expect(await screen.findByRole('button', { name: 'Retomar gasto' })).toBeVisible()
    first.unmount()
    setup()
    await user.click(await screen.findByRole('button', { name: 'Retomar gasto' }))
    expect(await screen.findByRole('textbox', { name: /Descripción del gasto/ })).toHaveValue('Compra pendiente')
    expect(screen.getByLabelText(/^Monto total/)).toHaveValue(321.29)
    expect(screen.getByRole('checkbox', { name: /Incluir a Sol/ })).not.toBeChecked()
  })
  it('restores raw invalid percentage allocations so a draft can be corrected', async () => {
    const user = userEvent.setup()
    const view = setup()
    await newExpense(user)
    await user.type(screen.getByRole('textbox', { name: /Descripción del gasto/ }), 'Distribución pendiente')
    await user.selectOptions(screen.getByLabelText('Tipo de reparto'), 'PORCENTUAL')
    fireEvent.change(screen.getByLabelText('Porcentaje para Ana'), { target: { value: '70' } })
    fireEvent.change(screen.getByLabelText('Porcentaje para Luis'), { target: { value: '10' } })
    view.unmount()
    setup({ route: '/espacios/1/gastos?nuevo=1' })
    expect(await screen.findByLabelText('Porcentaje para Ana')).toHaveValue(70)
    expect(screen.getByLabelText('Porcentaje para Luis')).toHaveValue(10)
  })
  it('warns about duplicates, preserves input on cancel, then records only after accepting', async () => {
    const user = userEvent.setup()
    const { api } = setup()
    await newExpense(user)
    await screen.findByRole('heading', { name: 'Repetir un gasto anterior' })
    await user.type(screen.getByRole('textbox', { name: /Descripción del gasto/ }), 'Supermercado')
    await user.type(screen.getByLabelText(/^Monto total/), '600')
    await user.click(screen.getByRole('button', { name: 'Registrar gasto', exact: true }))
    const dialog = screen.getByRole('dialog', { name: 'Posible gasto repetido' })
    expect(dialog).toHaveTextContent('600,00')
    expect(posts(api)).toHaveLength(0)
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('textbox', { name: /Descripción del gasto/ })).toHaveValue('Supermercado')
    await user.click(screen.getByRole('button', { name: 'Registrar gasto', exact: true }))
    await user.click(screen.getByRole('button', { name: 'Registrar de todos modos' }))
    expect(await screen.findByRole('region', { name: 'Registro confirmado' })).toHaveTextContent('Gasto registrado')
    expect(posts(api)).toHaveLength(1)
    expect(readDraft(1, 1, 'individual')).toBeNull()
  })
  it('shows only the server-confirmed amount in the receipt and opens the actual detail', async () => {
    const user = userEvent.setup()
    setup({ responseAmount: 777 })
    await newExpense(user)
    await user.type(screen.getByRole('textbox', { name: /Descripción del gasto/ }), 'Cena')
    await user.type(screen.getByLabelText(/^Monto total/), '750')
    await user.click(screen.getByRole('button', { name: 'Registrar gasto', exact: true }))
    const receipt = await screen.findByRole('region', { name: 'Registro confirmado' })
    expect(receipt).toHaveTextContent('777,00')
    expect(receipt).not.toHaveTextContent('750,00')
    await user.click(within(receipt).getByRole('button', { name: 'Ver detalle de Cena' }))
    expect(screen.getByRole('dialog', { name: 'Cena' })).toHaveTextContent('777,00')
  })
  it('keeps filters in the URL and restores them after visiting incomes and returning', async () => {
    const user = userEvent.setup()
    setup()
    await user.type(await screen.findByRole('searchbox', { name: 'Buscar gastos por texto' }), 'Super')
    fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: '2026-01-01' } })
    await user.click(screen.getByRole('link', { name: 'Mis ingresos', exact: true }))
    await screen.findByRole('heading', { name: 'Mis ingresos', exact: true })
    expect(screen.getByRole('link', { name: 'Gastos', exact: true })).toHaveAttribute('href', '/espacios/1/gastos?q=Super&desde=2026-01-01')
    await user.click(screen.getByRole('link', { name: 'Gastos', exact: true }))
    expect(await screen.findByRole('searchbox', { name: 'Buscar gastos por texto' })).toHaveValue('Super')
    expect(screen.getByLabelText('Fecha desde')).toHaveValue('2026-01-01')
    await user.click(screen.getByRole('button', { name: 'Limpiar todos los filtros' }))
    expect(screen.getByRole('searchbox', { name: 'Buscar gastos por texto' })).toHaveValue('')
  })
  it('restores list scroll when returning from the form', async () => {
    const user = userEvent.setup()
    const scroll = vi.fn()
    window.scrollTo = scroll
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(480)
    setup()
    await newExpense(user)
    await user.click(screen.getByRole('button', { name: 'Volver al listado' }))
    await waitFor(() => expect(scroll).toHaveBeenCalledWith({ top: 480, behavior: 'instant' }))
  })
  it('preserves the batch draft and can undo a removed row before sending the real array payload', async () => {
    const user = userEvent.setup()
    const { api } = setup()
    await user.click(await screen.findByRole('button', { name: 'Registrar por lote' }))
    await user.click(await screen.findByRole('button', { name: 'Agregar otro gasto al lote' }))
    const desc = await screen.findAllByLabelText(/^Descripción/)
    await user.type(desc[0], 'Primero')
    await user.type(desc[1], 'Segundo')
    await user.type(screen.getAllByLabelText(/^Monto/)[0], '50')
    await user.type(screen.getAllByLabelText(/^Monto/)[1], '100')
    await user.click(screen.getByRole('button', { name: 'Quitar gasto número 1 del lote' }))
    expect(screen.queryByDisplayValue('Primero')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(screen.getAllByLabelText(/^Descripción/).map(input => input.value)).toEqual(['Primero', 'Segundo'])
    await user.click(screen.getByRole('button', { name: 'Guardar borrador y salir' }))
    await user.click(await screen.findByRole('button', { name: 'Retomar lote' }))
    expect((await screen.findAllByLabelText(/^Descripción/))[0]).toHaveValue('Primero')
    await user.click(screen.getByRole('button', { name: 'Revisar lote' }))
    expect(posts(api)).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Registrar lote', exact: true }))
    expect(await screen.findByRole('region', { name: 'Registro confirmado' })).toHaveTextContent('2 gastos registrados')
    const body = posts(api)[0][1].body
    expect(Array.isArray(body)).toBe(true)
    expect(body.map(item => item.descripcion)).toEqual(['Primero', 'Segundo'])
    expect(readDraft(1, 1, 'lote')).toBeNull()
  })
  it('keeps drafts and avoids receipts when the server rejects the expense', async () => {
    const user = userEvent.setup()
    setup({ failure: new Error('No se pudo guardar') })
    await newExpense(user)
    await user.type(screen.getByRole('textbox', { name: /Descripción del gasto/ }), 'Falla recuperable')
    await user.type(screen.getByLabelText(/^Monto total/), '100')
    await user.click(screen.getByRole('button', { name: 'Registrar gasto', exact: true }))
    await screen.findAllByText('No se pudo guardar')
    expect(screen.queryByRole('region', { name: 'Registro confirmado' })).not.toBeInTheDocument()
    expect(readDraft(1, 1, 'individual')).toMatchObject({ descripcion: 'Falla recuperable' })
  })
})


it('detecta duplicados dentro del lote sin enviarlo hasta la confirmación', async () => {
  const user = userEvent.setup()
  const { api } = setup()
  await user.click(await screen.findByRole('button', { name: 'Registrar por lote' }))
  await user.click(await screen.findByRole('button', { name: 'Agregar otro gasto al lote' }))
  const descriptions = await screen.findAllByLabelText(/^Descripción/)
  const amounts = screen.getAllByLabelText(/^Monto/)
  for (let index = 0; index < 2; index++) {
    await user.type(descriptions[index], 'Taxi')
    await user.type(amounts[index], '150')
  }
  await user.click(screen.getByRole('button', { name: 'Revisar lote' }))
  expect(screen.getByRole('dialog', { name: 'Revisar lote' })).toHaveTextContent('Taxi')
  expect(posts(api)).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Volver a editar', exact: true }))
  expect(screen.getAllByLabelText(/^Descripción/)).toHaveLength(2)
})

it('no mezcla borradores al cambiar de espacio', async () => {
  const user = userEvent.setup()
  setup()
  await newExpense(user)
  await user.type(screen.getByRole('textbox', { name: /Descripción del gasto/ }), 'Solo en Casa')
  await user.click(screen.getByLabelText('Cambiar espacio activo'))
  await user.click(screen.getByRole('link', { name: 'Viaje', exact: true }))
  await newExpense(user)
  expect(screen.getByRole('textbox', { name: /Descripción del gasto/ })).toHaveValue('')
  await user.click(screen.getByLabelText('Cambiar espacio activo'))
  await user.click(screen.getByRole('link', { name: 'Casa', exact: true }))
  await user.click(await screen.findByRole('button', { name: 'Retomar gasto' }))
  expect(await screen.findByRole('textbox', { name: /Descripción del gasto/ })).toHaveValue('Solo en Casa')
})

it('empieza con una fila y mantiene el reparto equitativo compacto hasta editarlo', async () => {
  const user = userEvent.setup()
  setup({ route: '/espacios/1/gastos?nuevo=1&modo=lote' })
  expect(await screen.findAllByRole('textbox', { name: /^Descripción/ })).toHaveLength(1)
  expect(screen.queryByRole('heading', { name: 'Los gastos del lote' })).not.toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: /Incluir a Ana/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Editar reparto' }))
  expect(screen.getByRole('checkbox', { name: /Incluir a Ana/ })).toBeChecked()
  await user.click(screen.getByRole('checkbox', { name: /Incluir a Sol/ }))
  await user.click(screen.getByRole('button', { name: 'Ocultar reparto' }))
  await user.click(screen.getByRole('button', { name: 'Editar reparto' }))
  expect(screen.getByRole('checkbox', { name: /Incluir a Sol/ })).not.toBeChecked()
})

it('plegar y agregar conservan los valores y el subconjunto de participantes', async () => {
  const user = userEvent.setup()
  const { api } = setup({ route: '/espacios/1/gastos?nuevo=1&modo=lote' })
  await user.type(await screen.findByRole('textbox', { name: /^Descripción/ }), 'Compras de casa')
  await user.type(screen.getByLabelText(/^Monto/), '101.01')
  await user.click(screen.getByRole('button', { name: 'Editar reparto' }))
  await user.click(screen.getByRole('checkbox', { name: /Incluir a Sol/ }))
  await user.click(screen.getByRole('button', { name: 'Agregar otro gasto al lote' }))
  expect(screen.getByRole('textbox', { name: /^Descripción/ })).toHaveValue('')
  expect(screen.getByRole('textbox', { name: /^Descripción/ })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Editar gasto 1: Compras de casa' }))
  const item = screen.getByRole('region', { name: 'Gasto 1', exact: true })
  expect(within(item).getByLabelText(/^Descripción/)).toHaveValue('Compras de casa')
  expect(within(item).getByLabelText(/^Monto/)).toHaveValue(101.01)
  expect(within(item).getByRole('checkbox', { name: /Incluir a Sol/ })).not.toBeChecked()
  await user.click(within(item).getByRole('button', { name: 'Plegar gasto 1' }))
  expect(screen.getByRole('button', { name: 'Editar gasto 1: Compras de casa' })).toHaveFocus()
  expect(posts(api)).toHaveLength(0)
})

it('revisa un snapshot, permite corregir y envía una sola vez los datos confirmados', async () => {
  const user = userEvent.setup()
  const { api } = setup({ route: '/espacios/1/gastos?nuevo=1&modo=lote' })
  await user.type(await screen.findByRole('textbox', { name: /^Descripción/ }), 'Cena')
  await user.type(screen.getByLabelText(/^Monto/), '30.01')
  await user.click(screen.getByRole('button', { name: 'Revisar lote' }))
  const review = screen.getByRole('dialog', { name: 'Revisar lote' })
  expect(review).toHaveTextContent('Cena')
  expect(review).toHaveTextContent('30,01')
  expect(review).toHaveTextContent('10,01')
  expect(review).toHaveTextContent('Reparto estimado')
  expect(posts(api)).toHaveLength(0)
  await user.click(within(review).getByRole('button', { name: 'Volver a editar' }))
  await user.clear(screen.getByLabelText(/^Monto/))
  await user.type(screen.getByLabelText(/^Monto/), '60.02')
  await user.click(screen.getByRole('button', { name: 'Revisar lote' }))
  expect(screen.getByRole('dialog')).toHaveTextContent('60,02')
  await user.dblClick(screen.getByRole('button', { name: 'Registrar lote', exact: true }))
  await screen.findByRole('region', { name: 'Registro confirmado' })
  expect(posts(api)).toHaveLength(1)
  expect(posts(api)[0][1].body[0].monto).toBe(60.02)
})

it('muestra la distribución personalizada y abre los errores sin enviar un lote inválido', async () => {
  const user = userEvent.setup()
  const { api } = setup({ route: '/espacios/1/gastos?nuevo=1&modo=lote' })
  await user.type(await screen.findByRole('textbox', { name: /^Descripción/ }), 'Servicios')
  await user.type(screen.getByLabelText(/^Monto/), '120')
  await user.selectOptions(screen.getByLabelText('Reparto'), 'PORCENTUAL')
  expect(screen.getByLabelText('Porcentaje para Ana')).toBeVisible()
  fireEvent.change(screen.getByLabelText('Porcentaje para Ana'), { target: { value: '10' } })
  await user.click(screen.getByRole('button', { name: 'Revisar lote' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Porcentaje para Ana')).toBeVisible()
  expect(screen.getByLabelText('Porcentaje para Ana')).toHaveValue(10)
  expect(screen.getAllByText(/La suma de porcentajes/).length).toBeGreaterThan(0)
  expect(posts(api)).toHaveLength(0)
})

it('informa que el reparto proporcional se calcula al registrar sin inventar importes', async () => {
  const user = userEvent.setup()
  setup({ route: '/espacios/1/gastos?nuevo=1&modo=lote' })
  await user.type(await screen.findByRole('textbox', { name: /^Descripción/ }), 'Alquiler')
  await user.type(screen.getByLabelText(/^Monto/), '300')
  await user.selectOptions(screen.getByLabelText('Reparto'), 'PROPORCIONAL_INGRESOS')
  await user.click(screen.getByRole('button', { name: 'Revisar lote' }))
  const review = screen.getByRole('dialog')
  expect(review).toHaveTextContent('Se calcula al registrar')
  expect(review).not.toHaveTextContent('100,00')
  await user.click(within(review).getByRole('button', { name: 'Volver a editar' }))
  expect(screen.getByRole('button', { name: 'Revisar lote' })).toHaveFocus()
})

it('expone un reparto sin participantes y exige confirmar explícitamente las coincidencias', async () => {
  const user = userEvent.setup()
  const { api } = setup({ route: '/espacios/1/gastos?nuevo=1&modo=lote' })
  await user.type(await screen.findByRole('textbox', { name: /^Descripción/ }), 'Supermercado')
  await user.type(screen.getByLabelText(/^Monto/), '600')
  await user.click(screen.getByRole('button', { name: 'Editar reparto' }))
  await user.click(screen.getByRole('button', { name: 'Ninguno' }))
  await user.click(screen.getByRole('button', { name: 'Revisar lote' }))
  expect(screen.getByRole('checkbox', { name: /Incluir a Ana/ })).toBeVisible()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Todos' }))
  await user.click(screen.getByRole('button', { name: 'Revisar lote' }))
  const review = screen.getByRole('dialog')
  expect(review).toHaveTextContent('Posibles gastos repetidos')
  expect(posts(api)).toHaveLength(0)
  expect(within(review).queryByRole('button', { name: 'Registrar lote', exact: true })).not.toBeInTheDocument()
  await user.click(within(review).getByRole('button', { name: 'Registrar de todos modos' }))
  await screen.findByRole('region', { name: 'Registro confirmado' })
  expect(posts(api)).toHaveLength(1)
})
