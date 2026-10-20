// Mapa visual de categorías; los identificadores del catálogo se obtienen de la API.
export const expenseIconChoices = [
  { value: 'RECIBO', label: 'Recibo', icon: 'receipt' },
  { value: 'COMPRAS', label: 'Compras', icon: 'basket' },
  { value: 'HOGAR', label: 'Hogar', icon: 'home' },
  { value: 'TRANSPORTE', label: 'Transporte', icon: 'bus' },
  { value: 'SERVICIOS', label: 'Servicios', icon: 'bolt' },
  { value: 'INTERNET', label: 'Internet', icon: 'wifi' },
  { value: 'COMIDAS', label: 'Comidas', icon: 'utensils' },
  { value: 'SALUD', label: 'Salud', icon: 'heart' },
  { value: 'OCIO', label: 'Ocio', icon: 'ticket' },
  { value: 'ESTUDIO', label: 'Estudio', icon: 'book' },
  { value: 'DEPORTES', label: 'Deportes', icon: 'ball' },
  { value: 'TRABAJO', label: 'Trabajo', icon: 'briefcase' },
  { value: 'REGALOS', label: 'Regalos', icon: 'gift' },
  { value: 'MASCOTAS', label: 'Mascotas', icon: 'paw' },
]
export const isExpenseIcon = value => expenseIconChoices.some(choice => choice.value === value)

// La categoría confirmada determina el ícono; se conserva el valor antiguo solo sin categoría.
export function expenseIcon(category, description, selected) {
  const choice = expenseIconChoices.find(item => item.value === selected)
  if (!category && choice) return choice.icon
  const normalized = String(category || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR')
  if (/supermercado|aliment|compras/.test(normalized)) return 'basket'
  if (/comida|restaurante/.test(normalized)) return 'utensils'
  if (/mascota/.test(normalized)) return 'paw'
  if (/regalo/.test(normalized)) return 'gift'
  if (/transporte|movilidad|viaje/.test(normalized)) return 'bus'
  if (/alquiler|vivienda|hogar/.test(normalized)) return 'home'
  if (/internet|conectividad/.test(normalized)) return 'wifi'
  if (/luz|electric|agua|gas|servicio/.test(normalized)) return 'bolt'
  if (/salud|farmacia/.test(normalized)) return 'heart'
  if (/ocio|entretenimiento/.test(normalized)) return 'ticket'
  if (/estudio|educacion/.test(normalized)) return 'book'
  if (/deporte/.test(normalized)) return 'ball'
  if (/trabajo/.test(normalized)) return 'briefcase'
  if (!normalized && String(description || '').trim().toLocaleLowerCase('es-AR') === 'alquiler') return 'home'
  if (!normalized && ['dia', 'día', 'coto', 'carrefour', 'jumbo', 'disco', 'vea'].includes(String(description || '').trim().toLocaleLowerCase('es-AR'))) return 'basket'
  return 'receipt'
}
