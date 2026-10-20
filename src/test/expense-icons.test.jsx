import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { UIProvider } from '../components/ui'
import { ExpenseCategoryPicker } from '../features/gastos/ExpenseCategoryPicker'
import { ExpenseForm } from '../features/gastos/ExpenseForm'
import { ExpenseBatchForm } from '../features/gastos/ExpenseBatchForm'
import { WorkspaceContext } from '../app/workspace-context'
import { expenseIcon } from '../components/ui/expense-icons'
import { expensePayload, repeatExpense } from '../features/gastos/expense-experience'
import { today } from '../lib/format'

const members = [{ usuarioId: 1, nombreUsuario: 'Ana Ruiz', rol: 'ADMIN' }, { usuarioId: 2, nombreUsuario: 'Thomas Fernandez', rol: 'MIEMBRO' }]
const data = [{ id: 91, nombre: 'Mascotas' }, { id: 42, nombre: 'Regalos' }, { id: 83, nombre: 'Transporte' }]
const resource = { data, loading: false, error: null }
function wrap(ui) { return render(<UIProvider><WorkspaceContext.Provider value={{ members, session: { usuario: { id: 1 } }, invalidate: vi.fn() }}>{ui}</WorkspaceContext.Provider></UIProvider>) }
const apiWith = handler => vi.fn((path, options) => path === '/api/v1/categorias' ? Promise.resolve(data) : handler(path, options))
async function choose(user, trigger, name) {
  await user.click(trigger)
  await user.click(await screen.findByRole('button', { name: `Usar categoría: ${name}` }))
}

it('deriva el ícono de la categoría y envía su ID real, sin una elección independiente de ícono', () => {
  expect(expenseIcon('Mascotas', 'Coto', 'COMPRAS')).toBe('paw')
  expect(expenseIcon('Regalos', 'Coto', 'RECIBO')).toBe('gift')
  expect(expenseIcon('Comidas')).toBe('utensils')
  expect(expenseIcon('Supermercado')).toBe('basket')
  const value = { descripcion: 'Alimento', monto: '100', fecha: today(), pagadorId: 1, tipoReparto: 'EQUITATIVA', categoriaId: 91, categoriaNombre: 'Mascotas', icono: 'COMPRAS', participantes: [{ usuarioId: 1 }] }
  expect(expensePayload(value)).toMatchObject({ categoriaId: 91 })
  expect(expensePayload(value)).not.toHaveProperty('icono')
  expect(repeatExpense(value, members)).toMatchObject({ categoriaId: 91, categoriaNombre: 'Mascotas' })
})

it('ofrece selección de categoría, cancelación y retorno del foco con el diálogo compartido', async () => {
  const user = userEvent.setup({ delay: null })
  function Picker() { const [value, setValue] = useState(null); return <ExpenseCategoryPicker value={value} onChange={next => setValue(next.id)} categories={resource} description="Coto" /> }
  wrap(<Picker />)
  await user.click(screen.getByRole('button', { name: 'Cambiar categoría: Sin categoría' }))
  const dialog = screen.getByRole('dialog', { name: 'Elegí una categoría' })
  expect(within(dialog).getAllByRole('button', { name: /^Usar categoría:/ })).toHaveLength(4)
  expect(within(dialog).getByRole('button', { name: 'Usar categoría: Sin categoría' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(within(dialog).getByRole('button', { name: 'Usar categoría: Regalos' }))
  const selected = screen.getByRole('button', { name: 'Cambiar categoría: Regalos' })
  expect(selected).toHaveFocus()
  await user.click(selected)
  expect(screen.getByRole('button', { name: 'Usar categoría: Regalos' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent(screen.getByRole('dialog', { name: 'Elegí una categoría' }), new Event('cancel', { cancelable: true }))
  expect(selected).toHaveFocus()
  await choose(user, selected, 'Sin categoría')
  expect(screen.getByRole('button', { name: 'Cambiar categoría: Sin categoría' })).toHaveFocus()
})

it('mantiene la categoría al guardar y retomar un borrador individual', async () => {
  const user = userEvent.setup({ delay: null })
  const saveDraft = vi.fn()
  const initial = { descripcion: 'Comida de mascota', monto: '200', fecha: today(), pagadorId: '1', tipoReparto: 'EQUITATIVA', participantes: [{ usuarioId: 1 }, { usuarioId: 2 }] }
  const first = wrap(<ExpenseForm spaceId="1" members={members} api={apiWith(() => Promise.resolve({}))} initialValues={initial} onDraftChange={saveDraft} />)
  await choose(user, screen.getByRole('button', { name: 'Cambiar categoría: Sin categoría' }), 'Mascotas')
  await waitFor(() => expect(saveDraft.mock.lastCall[0]).toMatchObject({ categoriaId: 91, categoriaNombre: 'Mascotas', touched: true }))
  const draft = saveDraft.mock.lastCall[0]
  first.unmount()
  const api = apiWith(() => Promise.reject(new Error('Falló el registro')))
  wrap(<ExpenseForm spaceId="1" members={members} api={api} initialValues={draft} />)
  expect(screen.getByRole('button', { name: 'Cambiar categoría: Mascotas' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Registrar gasto', exact: true }))
  expect(await screen.findByText('Falló el registro')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Cambiar categoría: Mascotas' })).toBeVisible()
  expect(api).toHaveBeenCalledWith('/api/v1/espacios/1/gastos', expect.objectContaining({ body: expect.objectContaining({ categoriaId: 91 }) }))
})

it('envía la categoría de cada gasto al registrar varios juntos', async () => {
  const user = userEvent.setup({ delay: null })
  const api = apiWith(() => Promise.resolve([{ id: 1 }, { id: 2 }]))
  const values = { gastos: ['Regalo de cumpleaños', 'Taxi'].map((descripcion, index) => ({ tempId: index + 1, descripcion, monto: '100', fecha: today(), pagadorId: '1', tipoReparto: 'EQUITATIVA', participantes: [{ usuarioId: 1 }, { usuarioId: 2 }] })) }
  wrap(<ExpenseBatchForm spaceId="1" members={members} api={api} initialValues={values} />)
  await choose(user, screen.getByRole('button', { name: 'Cambiar categoría del gasto 1: Sin categoría' }), 'Regalos')
  await choose(user, screen.getByRole('button', { name: 'Cambiar categoría del gasto 2: Sin categoría' }), 'Transporte')
  await user.click(screen.getByRole('button', { name: 'Registrar 2 gastos' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar registro', exact: true }))
  await waitFor(() => expect(api.mock.calls.filter(([, opts]) => opts?.method === 'POST')).toHaveLength(1))
  const post = api.mock.calls.find(([, opts]) => opts?.method === 'POST')
  expect(post[1].body.map(row => row.categoriaId)).toEqual([42, 83])
  expect(post[1].body.every(row => !('icono' in row))).toBe(true)
  expect(api.mock.calls.filter(([path]) => path === '/api/v1/categorias')).toHaveLength(1)
})

it('muestra el error del catálogo y permite reintentar sin perder el gasto', async () => {
  const user = userEvent.setup({ delay: null })
  let attempts = 0
  const api = vi.fn(() => ++attempts === 1 ? Promise.reject(new Error('Sin conexión')) : Promise.resolve(data))
  wrap(<ExpenseForm spaceId="1" members={members} api={api} initialValues={{ descripcion: 'Mi gasto' }} />)
  await user.click(screen.getByRole('button', { name: 'Cambiar categoría: Sin categoría' }))
  expect(await screen.findByText(/No pudimos cargar las categorías/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Reintentar' }))
  await user.click(await screen.findByRole('button', { name: 'Usar categoría: Mascotas' }))
  expect(screen.getByLabelText(/^Descripción del gasto/)).toHaveValue('Mi gasto')
})
