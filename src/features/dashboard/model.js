import { cents, sumMoney } from '../../lib/format'

export function monthOptions(now = new Date()) {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    const month = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(date)
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: `${month[0].toUpperCase()}${month.slice(1)} ${date.getFullYear()}`,
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
    payable: sumMoney(pending.filter(item => String(item.deudorId) === String(userId)).map(item => item.monto)),
    receivable: sumMoney(pending.filter(item => String(item.acreedorId) === String(userId)).map(item => item.monto)),
  }
}

// El presupuesto es saldo actual: los gastos liquidados ya se descontaron en el servidor.
export function budgetProjection(available, pending) {
  if (available == null || !Number.isFinite(Number(available))) return null
  const balance = cents(available)
  const committed = cents(pending)
  return {
    remaining: (balance - committed) / 100,
    percent: balance > 0 ? committed / balance * 100 : null,
    progress: balance > 0 ? Math.min(100, Math.max(0, committed / balance * 100)) : committed > 0 ? 100 : 0,
    exceeded: committed > balance,
  }
}

// Identifica a las contrapartes sin repetir importes ni confundir pagos con cobros.
export function balanceCounterpart(debts, userId) {
  const active = debts.filter(item => item.estado !== 'SALDADA' && Number(item.monto) > 0)
  const outgoing = active.filter(item => String(item.deudorId) === String(userId))
  const incoming = active.filter(item => String(item.acreedorId) === String(userId))
  if ((!outgoing.length && !incoming.length) || (outgoing.length && incoming.length)) return null
  const direction = outgoing.length ? 'acreedor' : 'deudor'
  const relevant = outgoing.length ? outgoing : incoming
  if (relevant.some(item => item[`${direction}Id`] == null)) return null
  const people = new Map()
  for (const item of relevant) {
    const id = String(item[`${direction}Id`])
    people.set(id, item[`${direction}Nombre`] || people.get(id))
  }
  const label = people.size === 1 ? [...people.values()][0] || 'un integrante' : `${people.size} integrantes`
  return `${outgoing.length ? 'A' : 'De'} ${label}`
}

// Acorta el pagador solo cuando su primer nombre identifica inequívocamente a un integrante.
export function payerDisplayName(name, members) {
  if (!name || !members.length) return name
  const first = name.trim().split(/\s+/)[0]
  const matches = members.filter(member => member.nombreUsuario?.trim().split(/\s+/)[0].toLocaleLowerCase('es-AR') === first.toLocaleLowerCase('es-AR'))
  return matches.length === 1 ? first : name
}
