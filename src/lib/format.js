export const money = value => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
}).format(Number(value) || 0)

// Sum the API's two-decimal monetary amounts as integer cents.
export const cents = value => Math.round((Number(value) || 0) * 100)
export const sumMoney = values => values.reduce((total, value) => total + cents(value), 0) / 100
export function dateLabel(value) {
  if (!value) return 'Sin fecha'
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day))
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export const today = () => localDate()
export const nextMonth = () => {
  const date = new Date()
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + 1)
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, last))
  return localDate(date)
}
export const formData = event => Object.fromEntries(new FormData(event.currentTarget))
