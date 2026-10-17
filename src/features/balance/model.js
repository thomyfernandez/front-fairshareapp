import { sumMoney } from '../../lib/format'

export function debtRole(debt, userId) {
  if (debt.deudorId === userId) return 'deudor'
  if (debt.acreedorId === userId) return 'acreedor'
  return 'tercero'
}

export function personalSummary(debts, userId) {
  const payable = sumMoney(debts.filter(d => d.deudorId === userId).map(d => d.monto))
  const receivable = sumMoney(debts.filter(d => d.acreedorId === userId).map(d => d.monto))
  return { payable, receivable, net: receivable - payable }
}

export function generalSummary(debts) {
  return { count: debts.length, total: sumMoney(debts.map(d => d.monto)) }
}

// Las deudas propias (deudor o acreedor) van primero; el resto mantiene el orden recibido.
export function sortByRelevance(debts, userId) {
  return [...debts].sort((a, b) => {
    const ownA = debtRole(a, userId) !== 'tercero'
    const ownB = debtRole(b, userId) !== 'tercero'
    return ownA === ownB ? 0 : ownA ? -1 : 1
  })
}
