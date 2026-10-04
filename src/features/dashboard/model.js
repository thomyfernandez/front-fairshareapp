import { sumMoney } from '../../lib/format'

export function monthOptions(now = new Date()) {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(date),
    }
  })
}
export function expenseSummary(expenses, period) {
  const selected = expenses.filter(item => item.fecha?.startsWith(period))
  return {
    total: sumMoney(selected.map(item => item.monto)),
    count: selected.length,
    pending: sumMoney(selected.filter(item => item.estado === 'PENDIENTE').map(item => item.monto)),
    recent: [...selected].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id).slice(0, 5),
  }
}
export function personalBalance(debts, userId) {
  const pending = debts.filter(debt => debt.estado !== 'SALDADA')
  return {
    payable: sumMoney(pending.filter(item => item.deudorId === userId).map(item => item.monto)),
    receivable: sumMoney(pending.filter(item => item.acreedorId === userId).map(item => item.monto)),
  }
}
