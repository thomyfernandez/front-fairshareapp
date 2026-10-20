const formatter = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatCurrencyInput(value) {
  return value != null && value !== '' && Number.isFinite(Number(value)) ? formatter.format(Number(value)) : ''
}

// Un único formato explícito evita interpretar 1.000 como un peso con decimales.
export function parseCurrencyInput(value) {
  const text = String(value).trim()
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) return null
  const amount = Number(text.replaceAll('.', '').replace(',', '.'))
  return Number.isFinite(amount) && amount <= 9999999999.99 ? amount : null
}
