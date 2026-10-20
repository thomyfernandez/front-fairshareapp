import { isExpenseIcon } from '../components/ui/expense-icons.js'
import { cents, localDate } from '../lib/format.js'

export class MockFailure extends Error {
  constructor(message, status = 400, code = 'REGLA_INVALIDA', fieldErrors) {
    super(message)
    Object.assign(this, { status, code, fieldErrors })
  }
}
export const requireMock = (condition, message, status, code, fields) => { if (!condition) throw new MockFailure(message, status, code, fields) }
export const fullName = user => `${user.nombre} ${user.apellido}`.trim()
export function validMoney(value, zero = false) {
  return typeof value === 'number' && Number.isFinite(value) && value >= (zero ? 0 : 0.01) && value <= 9999999999.99 && Math.abs(value * 100 - Math.round(value * 100)) < 0.001
}

export function buildExpense(state, space, body, id, now) {
  requireMock(typeof body.descripcion === 'string' && body.descripcion.trim().length > 0 && body.descripcion.trim().length <= 255, 'Ingresá una descripción válida.')
  requireMock(validMoney(body.monto), 'El monto debe ser positivo y tener hasta dos decimales.')
  const date = body.fecha || localDate(now)
  requireMock(/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)), 'La fecha no es válida.')
  const members = state.members.filter(member => member.espacioId === space.id)
  const payer = state.users.find(user => user.id === body.pagadorId)
  requireMock(payer && members.some(member => member.usuarioId === payer.id), 'El pagador debe pertenecer al espacio.')
  const parts = body.participantes
  requireMock(Array.isArray(parts) && parts.length > 0, 'Elegí al menos un participante.')
  requireMock(new Set(parts.map(part => part.usuarioId)).size === parts.length && parts.every(part => members.some(member => member.usuarioId === part.usuarioId)), 'Los participantes deben ser miembros distintos del espacio.')
  const rule = body.regla || 'EQUITATIVA'
  requireMock(['EQUITATIVA', 'PARTICIPACION_PARCIAL', 'PROPORCIONAL_INGRESOS', 'PERSONALIZADA'].includes(rule), 'Regla de reparto inválida.')
  requireMock(body.icono == null || isExpenseIcon(body.icono), 'Elegí un ícono disponible.')
  const total = cents(body.monto)
  let amounts, percentages
  if (rule === 'PERSONALIZADA') {
    const fixed = parts.every(part => part.importe != null && part.porcentaje == null)
    const percent = parts.every(part => part.porcentaje != null && part.importe == null)
    requireMock(fixed || percent, 'Usá porcentajes o montos fijos, sin mezclarlos.')
    if (fixed) {
      requireMock(parts.every(part => validMoney(part.importe, true)) && parts.reduce((sum, part) => sum + cents(part.importe), 0) === total, 'Los importes deben sumar el total.')
      amounts = parts.map(part => cents(part.importe))
      percentages = amounts.map(amount => Math.round(amount * 10000 / total) / 100)
    } else {
      requireMock(parts.every(part => typeof part.porcentaje === 'number' && part.porcentaje >= 0 && part.porcentaje <= 100) && Math.abs(parts.reduce((sum, part) => sum + part.porcentaje, 0) - 100) < 0.001, 'Los porcentajes deben sumar 100%.')
      percentages = parts.map(part => part.porcentaje)
      amounts = parts.map(part => Math.round(total * part.porcentaje / 100))
    }
  } else {
    const weights = parts.map(part => {
      if (rule !== 'PROPORCIONAL_INGRESOS') return 1
      const incomes = state.incomes.filter(income => income.usuarioId === part.usuarioId).sort((a, b) => b.anio - a.anio || b.mes - a.mes)
      const [year, month] = date.split('-').map(Number)
      const income = part.sueldo || incomes.find(item => item.anio === year && item.mes === month)?.monto || incomes[0]?.monto
      requireMock(income > 0, 'Todos los participantes deben tener un ingreso positivo para repartir según ingresos.')
      return cents(income)
    })
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0)
    amounts = weights.map(weight => Math.floor(total * weight / weightTotal))
    percentages = weights.map(weight => Math.round(weight * 10000 / weightTotal) / 100)
  }
  amounts[0] += total - amounts.reduce((sum, amount) => sum + amount, 0)
  const category = state.categories?.find(item => item.id === body.categoriaId)
  requireMock(body.categoriaId == null || category, 'Categoría no encontrada.', 404, 'RECURSO_NO_ENCONTRADO')
  return {
    id, descripcion: body.descripcion.trim(), icono: body.icono ?? null, monto: total / 100, fecha: date, espacioId: space.id, espacioNombre: space.nombre,
    pagadorId: payer.id, pagadorNombre: fullName(payer), pagadorEmail: payer.email,
    categoriaId: body.categoriaId ?? null, categoriaNombre: category?.nombre ?? null,
    regla: rule, estado: 'PENDIENTE', participantes: parts.map((part, index) => {
      const user = state.users.find(item => item.id === part.usuarioId)
      return { id: id * 100 + index + 1, usuarioId: user.id, usuarioNombre: fullName(user), usuarioEmail: user.email, importe: amounts[index] / 100, porcentaje: percentages[index], sueldo: part.sueldo ?? null }
    }),
  }
}

export function calculateBalance(state, space) {
  const balances = new Map()
  const add = (id, value) => balances.set(id, (balances.get(id) || 0) + value)
  for (const expense of state.expenses.filter(item => item.espacioId === space.id)) {
    for (const participant of expense.participantes) { add(participant.usuarioId, -cents(participant.importe)); add(expense.pagadorId, cents(participant.importe)) }
  }
  for (const payment of state.payments.filter(item => item.spaceId === space.id)) { add(payment.deudorId, cents(payment.monto)); add(payment.acreedorId, -cents(payment.monto)) }
  const creditors = [...balances].filter(([, amount]) => amount > 0).map(([id, amount]) => ({ id, amount }))
  const debtors = [...balances].filter(([, amount]) => amount < 0).map(([id, amount]) => ({ id, amount: -amount }))
  const debts = []
  for (const debtor of debtors) {
    for (const creditor of creditors) {
      const amount = Math.min(debtor.amount, creditor.amount)
      if (amount <= 0) continue
      const key = `${space.id}:${debtor.id}:${creditor.id}`
      let debt = state.debts.find(item => item.key === key)
      if (!debt) { debt = { key, id: Math.max(0, ...state.debts.map(item => item.id)) + 1 }; state.debts.push(debt) }
      debts.push({ id: debt.id, deudorId: debtor.id, deudorNombre: fullName(state.users.find(user => user.id === debtor.id)), acreedorId: creditor.id, acreedorNombre: fullName(state.users.find(user => user.id === creditor.id)), monto: amount / 100, estado: 'PENDIENTE', liquidacionId: null })
      debtor.amount -= amount
      creditor.amount -= amount
    }
  }
  return { espacioId: space.id, espacioNombre: space.nombre, deudas: debts }
}
