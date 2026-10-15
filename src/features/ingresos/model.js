export const TIPO_LABELS = { FIJO: 'Fijo', VARIABLE: 'Variable' }
export const FRECUENCIA_LABELS = { MENSUAL: 'Mensual', QUINCENAL: 'Quincenal' }

// El backend guarda un solo ingreso por usuario y período (mes + año).
export function findByPeriod(incomes, mes, anio, exceptId = null) {
  return incomes.find(income => income.mes === Number(mes) && income.anio === Number(anio) && income.id !== exceptId) || null
}

export function sortByPeriodDesc(incomes) {
  return [...incomes].sort((a, b) => (b.anio - a.anio) || (b.mes - a.mes))
}
