import { cents, sumMoney, periodLabel } from '../../lib/format'

// Estimación local del cierre: el backend vuelve a calcularlo y es quien confirma el resultado.
export function settlementPreview(expenses, selectedIds, presupuesto) {
  const selected = expenses.filter(expense => selectedIds.includes(expense.id))
  const validAmounts = selected.every(expense => expense.monto != null && Number.isFinite(Number(expense.monto)) && Number(expense.monto) > 0)
  const total = validAmounts ? sumMoney(selected.map(expense => expense.monto)) : null
  const available = presupuesto != null && Number.isFinite(Number(presupuesto)) && Number(presupuesto) >= 0 ? Number(presupuesto) : null
  const remaining = available !== null && total !== null ? (cents(available) - cents(total)) / 100 : null
  const insufficient = remaining !== null && remaining < 0
  return { count: selected.length, total, available, remaining, insufficient, missing: insufficient ? -remaining : 0 }
}

export const FILTER_KEYS = ['modo', 'mes', 'anio', 'desde', 'hasta']

export function readFilters(searchParams) {
  return Object.fromEntries(FILTER_KEYS.map(key => [key, searchParams.get(key) || '']))
}

// El historial acepta un período (año y mes juntos) o un rango de fechas, nunca ambos.
export function historyQuery({ modo, mes, anio, desde, hasta } = {}) {
  if (modo === 'periodo') {
    if (!mes || !anio) return { query: '', error: null }
    return { query: new URLSearchParams({ anio, mes }).toString(), error: null }
  }
  if (modo === 'fechas') {
    if (desde && hasta && desde > hasta) return { query: '', error: 'La fecha desde debe ser anterior o igual a la fecha hasta.' }
    const params = new URLSearchParams(Object.entries({ desde, hasta }).filter(([, value]) => value))
    return { query: params.toString(), error: null }
  }
  return { query: '', error: null }
}

export function settlementExpenses(settlement, expenses) {
  const ids = settlement?.gastosLiquidadosIds || []
  const byId = new Map(expenses.map(expense => [expense.id, expense]))
  const found = ids.map(id => byId.get(id)).filter(Boolean)
  return { found, missing: ids.length - found.length }
}

// El período contable del cierre es independiente de las fechas de los gastos elegidos.
export function settlementPeriod(value) {
  if (!/^[2-9]\d{3}-(0[1-9]|1[0-2])$/.test(value)) return null
  const [anio, mes] = value.split('-').map(Number)
  return { anio, mes }
}

export function groupPendingExpenses(expenses) {
  const groups = new Map()
  for (const expense of expenses) {
    const valid = /^\d{4}-(0[1-9]|1[0-2])-\d{2}/.test(expense.fecha || '')
    const key = valid ? expense.fecha.slice(0, 7) : ''
    if (!groups.has(key)) {
      const [year, month] = key.split('-').map(Number)
      groups.set(key, { key, label: key ? periodLabel(month, year) : 'Sin fecha', expenses: [] })
    }
    groups.get(key).expenses.push(expense)
  }
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key)).map(group => ({ ...group, expenses: [...group.expenses].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || b.id - a.id) }))
}
