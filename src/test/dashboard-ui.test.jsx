import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import Dashboard from '../features/dashboard/Dashboard'
import { WorkspaceContext } from '../app/workspace-context'
import { UIProvider } from '../components/ui'
import { localDate } from '../lib/format'

// Simula los contratos reales y conserva el efecto de pagos parciales e invalidación.
function setup({ debts, balanceError, recurringError, expensesError, paymentError, overdue = true, budget = 1000, balanceData, extraExpenses = 0 } = {}) {
  const now = localDate()
  const user = userEvent.setup({ delay: null })
  const payments = debts || [{ id: 9, deudorId: 1, deudorNombre: 'Ana', acreedorId: 2, acreedorNombre: 'Thomas', monto: 75, estado: 'PENDIENTE' }]
  const api = vi.fn(async (path, options = {}) => {
    if (options.method === 'POST') {
      if (paymentError) throw new Error('No pudimos registrar el pago')
      const debt = payments.find(item => String(item.id) === path.split('/').at(-2))
      debt.monto -= options.body.monto
      if (!debt.monto) debt.estado = 'SALDADA'
      return { ok: true }
    }
    if (path.endsWith('/balance')) {
      if (balanceError) throw new Error('Balance no disponible')
      return balanceData === undefined ? { deudas: payments.map(item => ({ ...item })) } : balanceData
    }
    if (path.endsWith('/favoritos')) {
      if (recurringError) throw new Error('Recurrentes no disponibles')
      return overdue ? [{ id: 4, nombre: 'Internet', vencido: true }] : []
    }
    if (expensesError) throw new Error('Gastos no disponibles')
    return Array.from({ length: 1 + extraExpenses }, (_, index) => ({ id: 3 + index, descripcion: index ? `Compra ${index}` : 'Supermercado', fecha: now, monto: 150, pagadorId: 2, pagadorNombre: 'Thomas', estado: 'PENDIENTE', participantes: [{ usuarioId: 1, importe: 75 }, { usuarioId: 2, importe: 75 }] }))
  })
  // Provee el mismo contexto e invalidación que usa la aplicación al confirmar una operación.
  function Harness() {
    const [revision, setRevision] = useState(0)
    return <WorkspaceContext.Provider value={{
      spaceId: '1', space: { nombre: 'Casa', presupuestoBase: budget, reglaReparto: 'PROPORCIONAL', codigo: 'CASA-123' },
      session: { usuario: { id: 1, nombre: 'Ana' } }, api, revision, invalidate: () => setRevision(value => value + 1),
      members: [{ id: 1, usuarioId: 1, nombreUsuario: 'Ana' }, { id: 2, usuarioId: 2, nombreUsuario: 'Thomas' }],
      membersState: { loading: false, error: null },
    }}><Dashboard /></WorkspaceContext.Provider>
  }
  render(<MemoryRouter><UIProvider><Harness /></UIProvider></MemoryRouter>)
  return { user, api }
}

it('separa el mes del balance acumulado y conserva el detalle real de gastos', async () => {
  const { user } = setup()
  await user.click(await screen.findByRole('button', { name: 'Ver detalle de Supermercado' }))
  expect(screen.getByRole('dialog', { name: 'Supermercado' })).toBeInTheDocument()
  expect(screen.getByText('Participantes y división (2)')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Cerrar detalle' }))
  expect(screen.getByRole('button', { name: 'Ver detalle de Supermercado' })).toHaveFocus()
  const month = screen.getByRole('combobox', { name: 'Mes de los gastos' })
  const previousMonth = within(month).getAllByRole('option')[1].value
  await user.selectOptions(month, previousMonth)
  expect(await screen.findByRole('heading', { name: 'Todavía no hay gastos este mes' })).toBeInTheDocument()
  expect(screen.getByText('A Thomas')).toBeInTheDocument()
  expect(screen.getByText('Todos los períodos')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Registrar pago' })).toBeInTheDocument()
})

it('presenta un solo importe por deuda y retira la información administrativa del resumen', async () => {
  setup()
  const balance = await screen.findByRole('region', { name: 'Tu balance acumulado' })
  await within(balance).findByText('A Thomas')
  expect(balance.querySelectorAll('.money')).toHaveLength(1)
  expect(screen.queryByText('Por pagar')).not.toBeInTheDocument()
  expect(screen.queryByText('Tu posición neta')).not.toBeInTheDocument()
  expect(screen.queryByText('Atención requerida')).not.toBeInTheDocument()
  expect(screen.queryByText('Tu equipo')).not.toBeInTheDocument()
  expect(screen.queryByText('CASA-123')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Agregar gasto' })).toHaveAttribute('href', '/espacios/1/gastos?nuevo=1')
  expect(screen.getByRole('link', { name: 'Ver detalle del balance' })).toHaveAttribute('href', '/espacios/1/balance')
})

it('registra el pago solo después de confirmar y actualiza el balance', async () => {
  const { user, api } = setup()
  await user.click(await screen.findByRole('button', { name: 'Registrar pago' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(api.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false)
  const dialog = screen.getByRole('dialog', { name: 'Confirmar pago' })
  expect(within(dialog).getByText(/no realiza ninguna/)).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar pago' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/api/v1/deudas/9/saldar', { method: 'POST', body: { monto: 75 } }))
  expect(await screen.findByRole('heading', { name: 'Estás al día' })).toBeInTheDocument()
})

it('permite elegir deuda y registrar un pago parcial sin perder el mes seleccionado', async () => {
  const { user, api } = setup({ debts: [
    { id: 9, deudorId: 1, deudorNombre: 'Ana', acreedorId: 2, acreedorNombre: 'Thomas', monto: 75 },
    { id: 10, deudorId: 1, deudorNombre: 'Ana', acreedorId: 3, acreedorNombre: 'María', monto: 25 },
  ] })
  await screen.findByText('A 2 integrantes')
  const month = screen.getByRole('combobox', { name: 'Mes de los gastos' })
  const previousMonth = within(month).getAllByRole('option')[1].value
  await user.selectOptions(month, previousMonth)
  await user.click(screen.getByRole('button', { name: 'Registrar pago' }))
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Thomas/ }))
  await user.click(screen.getByRole('radio', { name: 'Pago parcial' }))
  await user.type(screen.getByRole('spinbutton', { name: /^Monto a registrar/ }), '25')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(api.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false)
  await user.click(screen.getByRole('button', { name: 'Confirmar pago' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/api/v1/deudas/9/saldar', { method: 'POST', body: { monto: 25 } }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(month).toHaveValue(previousMonth)
  expect(screen.getByRole('heading', { name: 'Te queda por pagar' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Estás al día' })).not.toBeInTheDocument()
})

it('conserva la confirmación y el saldo cuando falla el registro de pago', async () => {
  const { user } = setup({ paymentError: true })
  await user.click(await screen.findByRole('button', { name: 'Registrar pago' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar pago' }))
  const dialog = screen.getByRole('dialog', { name: 'Confirmar pago' })
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('No pudimos registrar el pago')
  expect(screen.queryByText('Pago registrado. El balance se actualizó.')).not.toBeInTheDocument()
})

it('mantiene ambos saldos cuando se compensan en un neto cero', async () => {
  setup({ debts: [
    { id: 1, deudorId: 1, acreedorId: 2, acreedorNombre: 'Thomas', monto: 75 },
    { id: 2, deudorId: 2, acreedorId: 1, monto: 75 },
  ] })
  expect(await screen.findByRole('heading', { name: 'Tenés pagos y cobros pendientes' })).toBeInTheDocument()
  const position = screen.getByRole('region', { name: 'Tu balance acumulado' })
  expect(within(position).getByText('Por pagar')).toBeInTheDocument()
  expect(within(position).getByText('Por cobrar')).toBeInTheDocument()
  expect(position.querySelectorAll('.money')).toHaveLength(2)
  expect(screen.queryByText('Estás al día')).not.toBeInTheDocument()
})

it('muestra la revisión del recurrente sin repetir deudas', async () => {
  setup()
  expect(await screen.findByRole('link', { name: 'Revisar' })).toHaveAttribute('href', '/espacios/1/recurrentes?revisar=4')
  expect(screen.getAllByRole('button', { name: 'Registrar pago' })).toHaveLength(1)
  expect(screen.queryByText('Le debés a Thomas')).not.toBeInTheDocument()
})

it('mantiene gastos disponibles cuando falla el balance y no inventa un estado al día', async () => {
  setup({ balanceError: true, recurringError: true })
  expect(await screen.findByRole('heading', { name: 'Tu balance no está disponible' })).toBeInTheDocument()
  expect(await screen.findByRole('button', { name: 'Ver detalle de Supermercado' })).toBeInTheDocument()
  expect(screen.queryByText('Todo en orden')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Reintentar revisión' })).toBeInTheDocument()
})

it('no convierte una respuesta de balance incompleta en un saldo cero', async () => {
  setup({ balanceData: {} })
  expect(await screen.findByRole('heading', { name: 'Tu balance no está disponible' })).toBeInTheDocument()
  expect(screen.queryByText('Estás al día')).not.toBeInTheDocument()
})

it('no ofrece registrar un pago cuando solo hay dinero por cobrar', async () => {
  setup({ debts: [{ id: 9, deudorId: 2, deudorNombre: 'Thomas', acreedorId: 1, monto: 75 }] })
  expect(await screen.findByRole('heading', { name: 'Te tienen que devolver' })).toBeInTheDocument()
  expect(screen.getByText('De Thomas')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument()
})

it('deja el presupuesto a demanda y no interpreta una falla de gastos como una lista vacía', async () => {
  const { user } = setup({ expensesError: true })
  expect(await screen.findByRole('heading', { name: 'No pudimos cargar los gastos del mes' })).toBeInTheDocument()
  expect(screen.queryByText('Todavía no hay gastos este mes')).not.toBeInTheDocument()
  const details = screen.getByText('Presupuesto del espacio').closest('details')
  expect(details).not.toHaveAttribute('open')
  await user.click(within(details).getByText('Presupuesto del espacio'))
  expect(within(details).getByText('Saldo actual')).toBeVisible()
  expect(within(details).getByText(/La estimación estará disponible/)).toBeVisible()
  expect(within(details).queryByText('Saldo estimado tras liquidarlos')).not.toBeInTheDocument()
})

it('avisa si el saldo no alcanza sin presentar el presupuesto como un límite mensual', async () => {
  setup({ budget: 100 })
  expect(await screen.findByRole('link', { name: 'Ver liquidaciones' })).toHaveAttribute('href', '/espacios/1/liquidaciones')
  expect(screen.getByText(/El saldo no alcanza para los pendientes de/)).toBeInTheDocument()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
})

it('omite avisos sin tareas reales y construye el enlace de gastos para el mes elegido', async () => {
  setup({ overdue: false, extraExpenses: 6, budget: 10000 })
  const all = await screen.findByRole('link', { name: 'Ver todos los gastos' })
  const now = new Date()
  const period = localDate(now).slice(0, 7)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  expect(all).toHaveAttribute('href', `/espacios/1/gastos?desde=${period}-01&hasta=${period}-${lastDay}`)
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
})
