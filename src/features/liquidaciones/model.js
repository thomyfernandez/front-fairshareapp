import { cents, sumMoney } from '../../lib/format'

// Estimación local del cierre: el backend vuelve a calcularlo y es quien confirma el resultado.
export function settlementPreview(expenses, selectedIds, presupuesto) {
  const selected = expenses.filter(expense => selectedIds.includes(expense.id))
  const total = sumMoney(selected.map(expense => expense.monto))
  const available = Number(presupuesto) || 0
  const remaining = (cents(available) - cents(total)) / 100
  return { count: selected.length, total, available, remaining, insufficient: remaining < 0, missing: remaining < 0 ? -remaining : 0 }
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
