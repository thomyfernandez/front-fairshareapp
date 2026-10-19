import { isExpenseIcon } from '../../components/ui/expense-icons'
import { cents, today } from '../../lib/format'

export const EXPENSE_PAGE_SIZES = [10, 20, 50]

export const hasDraftContent = value => Boolean(value && (value.touched || value.descripcion?.trim() || String(value.monto || '').trim()))
export const normalizedConcept = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-AR')
export function similarExpenses(value, expenses) {
  if (!value.descripcion?.trim() || !Number(value.monto) || !value.fecha) return []
  return expenses.filter(item => normalizedConcept(item.descripcion) === normalizedConcept(value.descripcion) && cents(item.monto) === cents(value.monto) && item.fecha?.slice(0, 10) === value.fecha)
}

export function repeatExpense(expense, members) {
  const ids = members.map(member => Number(member.usuarioId ?? member.id))
  const mode = expense.tipoReparto || (expense.regla === 'PERSONALIZADA' ? 'MONTOS_FIJOS' : expense.regla === 'PROPORCIONAL_INGRESOS' ? 'PROPORCIONAL_INGRESOS' : 'EQUITATIVA')
  return {
    icono: isExpenseIcon(expense.icono) ? expense.icono : null,
    ...(expense.categoriaId != null ? { categoriaId: expense.categoriaId, categoriaNombre: expense.categoriaNombre } : {}),
    descripcion: expense.descripcion || '', monto: expense.monto == null ? '' : String(expense.monto), fecha: today(),
    pagadorId: ids.includes(Number(expense.pagadorId)) ? String(expense.pagadorId) : '',
    tipoReparto: mode, selection: { equal: Object.fromEntries(ids.map(id => [id, expense.participantes?.some(part => Number(part.usuarioId) === id) || false])) }, participantes: expense.participantes?.filter(participant => ids.includes(Number(participant.usuarioId))) || [],
  }
}

export function frequentExpenses(expenses) {
  const groups = new Map()
  for (const item of expenses) {
    const key = normalizedConcept(item.descripcion)
    if (!key) continue
    const group = groups.get(key) || { count: 0, expense: item }
    group.count++
    if ((item.fecha || '') > (group.expense.fecha || '')) group.expense = item
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || (b.expense.fecha || '').localeCompare(a.expense.fecha || '')).slice(0, 4)
}

// El backend recibe regla y acepta porcentajes o importes, nunca ambos en PERSONALIZADA.
export function expensePayload(value) {
  const custom = ['PORCENTUAL', 'MONTOS_FIJOS'].includes(value.tipoReparto)
  return {
    descripcion: value.descripcion.trim(), monto: Number(Number(value.monto).toFixed(2)), fecha: value.fecha,
    pagadorId: Number(value.pagadorId), regla: custom ? 'PERSONALIZADA' : value.tipoReparto === 'PROPORCIONAL_INGRESOS' ? 'PROPORCIONAL_INGRESOS' : 'EQUITATIVA',
    ...(value.categoriaId != null ? { categoriaId: Number(value.categoriaId) } : {}),
    ...(isExpenseIcon(value.icono) ? { icono: value.icono } : {}),
    participantes: value.participantes.map(part => ({ usuarioId: Number(part.usuarioId), ...(custom ? value.tipoReparto === 'PORCENTUAL' ? { porcentaje: Number(Number(part.porcentaje).toFixed(2)) } : { importe: Number(Number(part.importe).toFixed(2)) } : {}) })),
  }
}

export const validExpenseAmount = value => /^\d+(?:\.\d{1,2})?$/.test(String(value)) && Number(value) > 0 && Number(value) <= 9999999999.99

export const batchMemberName = (members, id) => {
  const member = members.find(item => Number(item.usuarioId ?? item.id) === Number(id))
  return member?.nombreUsuario ?? member?.nombre ?? `Usuario ${id}`
}
export const batchSplitLabel = mode => ({ EQUITATIVA: 'Partes iguales', PROPORCIONAL_INGRESOS: 'Según los ingresos', PORCENTUAL: 'Porcentajes', MONTOS_FIJOS: 'Montos fijos' }[mode] || mode)

// El error legado de Java identifica al participante por ID; la interfaz conoce sus nombres.
export function expenseErrorMessage(error, members, fallback) {
  const message = error?.message || fallback
  const missingIncome = message?.match(/^El usuario con id (\d+) no cuenta con un sueldo registrado mayor a cero para aplicar la divisi[oó]n proporcional\.?$/i)
  if (!missingIncome) return message
  const member = members.find(item => String(item.usuarioId ?? item.id) === missingIncome[1])
  const name = member?.nombreUsuario?.trim() || [member?.nombre, member?.apellido].filter(Boolean).join(' ').trim()
  return `${name || 'Una de las personas del reparto'} necesita registrar un ingreso mayor a cero para usar el reparto según ingresos. También podés elegir otro tipo de reparto.`
}
