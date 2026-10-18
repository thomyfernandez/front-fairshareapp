import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BalanceSummary, Button, ExpenseRow, Money, UIProvider } from '../components/ui'
import { expenseIcon } from '../components/ui/expense-icons'
import { SummaryPreview } from '../features/design-system/SummaryPreview'

describe('balance protagonista', () => {
  it('muestra la deuda una sola vez y permite iniciar el registro sin ejecutar un pago', async () => {
    const register = vi.fn()
    const user = userEvent.setup()
    render(<BalanceSummary payable={111382} receivable={0} counterpart="A Thomas Fernandez" onRegisterPayment={register} detailAction={<Button variant="ghost">Ver balance</Button>} />)
    const region = screen.getByRole('region', { name: 'Tu balance acumulado' })
    expect(within(region).getByRole('heading', { name: 'Te queda por pagar' })).toBeInTheDocument()
    expect(region.querySelectorAll('.money')).toHaveLength(1)
    expect(within(region).queryByText('Por cobrar')).not.toBeInTheDocument()
    expect(within(region).getByText('A Thomas Fernandez')).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
    await user.click(within(region).getByRole('button', { name: 'Registrar pago' }))
    expect(register).toHaveBeenCalledTimes(1)
  })

  it('mantiene pagos y cobros aunque su neto sea cero', () => {
    render(<BalanceSummary payable={75} receivable={75} onRegisterPayment={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Tenés pagos y cobros pendientes' })).toBeInTheDocument()
    expect(screen.getByText('Por pagar')).toBeInTheDocument()
    expect(screen.getByText('Por cobrar')).toBeInTheDocument()
    expect(screen.queryByText('Estás al día')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar pago' })).toBeInTheDocument()
  })

  it('no propone registrar un pago si solo hay dinero por cobrar', () => {
    render(<BalanceSummary payable={0} receivable={125.5} onRegisterPayment={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Te tienen que devolver' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument()
    expect(screen.getByText(',50')).toBeVisible()
  })

  it('reserva el estado al día para dos saldos confirmados en cero', () => {
    const { container } = render(<BalanceSummary payable={0} receivable={0} />)
    expect(screen.getByRole('heading', { name: 'Estás al día' })).toBeInTheDocument()
    expect(container.querySelector('.money')).toBeNull()
  })

  it.each([null, undefined, NaN, Infinity, -1])('no convierte un saldo inválido (%s) en un cero', value => {
    render(<BalanceSummary payable={value} receivable={0} onRegisterPayment={() => {}} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Tu balance no está disponible')
    expect(screen.queryByText('Estás al día')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument()
  })

  it('oculta el saldo anterior durante la carga y ofrece reintentar un error', async () => {
    const retry = vi.fn()
    const user = userEvent.setup()
    const { rerender, container } = render(<BalanceSummary payable={125} receivable={0} loading onRegisterPayment={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent('Consultando tu balance')
    expect(container.querySelector('.money')).toBeNull()
    rerender(<BalanceSummary payable={125} receivable={0} error={new Error('Sin conexión')} onRetry={retry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(retry).toHaveBeenCalledOnce()
  })
})

it('omite solo decimales cero sin redondear centavos ni cambiar la lectura accesible', () => {
  const { container, rerender } = render(<Money value={111382} hideZeroDecimals />)
  expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent(/^\$\s111\.382$/)
  expect(container.querySelector('.sr-only')).toHaveTextContent(/^\$\s111\.382,00$/)
  rerender(<Money value={111382.5} hideZeroDecimals />)
  expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent(/^\$\s111\.382,50$/)
  rerender(<Money value={111382} />)
  expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent(/^\$\s111\.382,00$/)
})

it('permite abrir un gasto con teclado y comunica la falta de importe', async () => {
  const user = userEvent.setup()
  const select = vi.fn()
  const { rerender } = render(<ExpenseRow description="DIA" payerName="Thomas" date="2026-10-08" amount={231232} onSelect={select} />)
  await user.tab()
  expect(screen.getByRole('button', { name: 'Ver detalle de DIA' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(select).toHaveBeenCalledOnce()
  rerender(<ExpenseRow description="DIA" amount={null} />)
  expect(screen.getByText('Importe no disponible')).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it('mantiene el balance acumulado al cambiar el mes en la galería y permite probar estados', async () => {
  const user = userEvent.setup()
  render(<UIProvider><SummaryPreview /></UIProvider>)
  await user.selectOptions(screen.getByRole('combobox', { name: 'Mes de los gastos' }), '2026-09')
  expect(screen.getByRole('heading', { name: 'Todavía no hay gastos este mes' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Te queda por pagar' })).toBeInTheDocument()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Situación del balance' }), 'offset')
  expect(screen.getByRole('heading', { name: 'Tenés pagos y cobros pendientes' })).toBeInTheDocument()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Situación del balance' }), 'error')
  await user.click(screen.getByRole('button', { name: 'Reintentar' }))
  expect(screen.getByRole('heading', { name: 'Te queda por pagar' })).toBeInTheDocument()
})

it('abre el detalle desde la fila de demostración y permite cerrarlo', async () => {
  const user = userEvent.setup()
  render(<UIProvider><SummaryPreview /></UIProvider>)
  await user.click(screen.getByRole('button', { name: 'Ver detalle de DIA' }))
  const dialog = screen.getByRole('dialog', { name: 'DIA' })
  expect(within(dialog).getByText('Importe completo')).toBeInTheDocument()
  expect(within(dialog).getByText(/sin operaciones reales/)).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: 'Cerrar detalle' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})


it.each([
  ['Alimentación', 'Compra semanal', 'basket'],
  ['Transporte', 'Subte', 'bus'],
  ['Internet', 'Servicio del hogar', 'wifi'],
  ['Salud', 'Farmacia', 'heart'],
  [undefined, 'DIA', 'basket'],
  [undefined, 'Coto', 'basket'],
  ['Otros', 'DIA', 'receipt'],
  [undefined, 'Compra sin categoría', 'receipt'],
])('elige un ícono orientativo para %s sin modificar la clasificación del gasto', (category, description, expected) => {
  expect(expenseIcon(category, description)).toBe(expected)
})
