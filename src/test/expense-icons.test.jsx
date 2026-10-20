import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { UIProvider } from '../components/ui'
import { ExpenseIconPicker } from '../features/gastos/ExpenseIconPicker'
import { ExpenseForm } from '../features/gastos/ExpenseForm'
import { ExpenseBatchForm } from '../features/gastos/ExpenseBatchForm'
import { WorkspaceContext } from '../app/workspace-context'
import { expenseIcon, expenseIconChoices } from '../components/ui/expense-icons'
import { expensePayload, repeatExpense } from '../features/gastos/expense-experience'
import { today } from '../lib/format'

const members = [{ usuarioId: 1, nombreUsuario: 'Ana Ruiz', rol: 'ADMIN' }, { usuarioId: 2, nombreUsuario: 'Thomas Fernandez', rol: 'MIEMBRO' }]
function wrap(ui) { return render(<UIProvider><WorkspaceContext.Provider value={{ members, session: { usuario: { id: 1 } }, invalidate: vi.fn() }}>{ui}</WorkspaceContext.Provider></UIProvider>) }
async function choose(user, trigger, name) {
  await user.click(trigger)
  await user.click(screen.getByRole('button', { name: `Usar ícono: ${name}` }))
}

it('permite elegir cualquiera de los 14 íconos sin confundirlo con una categoría', () => {
  for (const choice of expenseIconChoices) expect(expenseIcon('Supermercado', 'Coto', choice.value)).toBe(choice.icon)
  expect(expenseIcon('Supermercado', 'Coto', 'REGALOS')).toBe('gift')
  expect(expenseIcon('Supermercado', 'Coto', 'RECIBO')).toBe('receipt')
  expect(expenseIcon('Supermercado', 'Coto', null)).toBe('basket')
  expect(expenseIcon('Supermercado', 'Coto', 'DESCONOCIDO')).toBe('basket')
  const value = { descripcion: 'Coto', monto: '100', fecha: today(), pagadorId: 1, tipoReparto: 'EQUITATIVA', categoriaId: 9, icono: 'MASCOTAS', participantes: [{ usuarioId: 1 }] }
  expect(expensePayload(value)).toMatchObject({ categoriaId: 9, icono: 'MASCOTAS' })
  expect(expensePayload({ ...value, icono: null })).not.toHaveProperty('icono')
  expect(repeatExpense(value, members)).toMatchObject({ categoriaId: 9, icono: 'MASCOTAS' })
})

it('ofrece selección, automático, cancelación y retorno del foco con el diálogo compartido', async () => {
  const user = userEvent.setup({ delay: null })
  function Picker() { const [value, setValue] = useState(null); return <ExpenseIconPicker value={value} onChange={setValue} description="Coto" /> }
  wrap(<Picker />)
  await user.click(screen.getByRole('button', { name: 'Cambiar ícono del gasto: Automático' }))
  const dialog = screen.getByRole('dialog', { name: 'Elegí un ícono' })
  expect(within(dialog).getAllByRole('button', { name: /^Usar ícono:/ })).toHaveLength(15)
  expect(within(dialog).getByRole('button', { name: 'Usar ícono: Automático' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(within(dialog).getByRole('button', { name: 'Usar ícono: Regalos' }))
  const selected = screen.getByRole('button', { name: 'Cambiar ícono del gasto: Regalos' })
  expect(selected).toHaveFocus()
  await user.click(selected)
  expect(screen.getByRole('button', { name: 'Usar ícono: Regalos' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent(screen.getByRole('dialog', { name: 'Elegí un ícono' }), new Event('cancel', { cancelable: true }))
  expect(selected).toHaveFocus()
  await choose(user, selected, 'Automático')
  expect(screen.getByRole('button', { name: 'Cambiar ícono del gasto: Automático' })).toHaveFocus()
})

it('mantiene el ícono elegido al guardar y retomar un borrador individual', async () => {
  const user = userEvent.setup({ delay: null })
  const saveDraft = vi.fn()
  const initial = { descripcion: 'Comida de mascota', monto: '200', fecha: today(), pagadorId: '1', tipoReparto: 'EQUITATIVA', participantes: [{ usuarioId: 1 }, { usuarioId: 2 }] }
  const first = wrap(<ExpenseForm spaceId="1" members={members} api={vi.fn()} initialValues={initial} onDraftChange={saveDraft} />)
  await choose(user, screen.getByRole('button', { name: 'Cambiar ícono del gasto: Automático' }), 'Mascotas')
  await waitFor(() => expect(saveDraft.mock.lastCall[0]).toMatchObject({ icono: 'MASCOTAS', touched: true }))
  const draft = saveDraft.mock.lastCall[0]
  first.unmount()
  const api = vi.fn().mockRejectedValue(new Error('Falló el registro'))
  wrap(<ExpenseForm spaceId="1" members={members} api={api} initialValues={draft} />)
  expect(screen.getByRole('button', { name: 'Cambiar ícono del gasto: Mascotas' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Registrar gasto', exact: true }))
  expect(await screen.findByText('Falló el registro')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Cambiar ícono del gasto: Mascotas' })).toBeVisible()
  expect(api).toHaveBeenCalledWith('/api/v1/espacios/1/gastos', expect.objectContaining({ body: expect.objectContaining({ icono: 'MASCOTAS' }) }))
})

it('envía un ícono independiente por gasto al registrar varios juntos', async () => {
  const user = userEvent.setup({ delay: null })
  const api = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }])
  const values = { gastos: ['Regalo de cumpleaños', 'Taxi'].map((descripcion, index) => ({ tempId: index + 1, descripcion, monto: '100', fecha: today(), pagadorId: '1', tipoReparto: 'EQUITATIVA', participantes: [{ usuarioId: 1 }, { usuarioId: 2 }] })) }
  wrap(<ExpenseBatchForm spaceId="1" members={members} api={api} initialValues={values} />)
  await choose(user, screen.getByRole('button', { name: 'Cambiar ícono del gasto 1: Automático' }), 'Regalos')
  await choose(user, screen.getByRole('button', { name: 'Cambiar ícono del gasto 2: Automático' }), 'Transporte')
  await user.click(screen.getByRole('button', { name: 'Registrar 2 gastos' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar registro', exact: true }))
  await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
  expect(api.mock.calls[0][1].body.map(row => row.icono)).toEqual(['REGALOS', 'TRANSPORTE'])
})
