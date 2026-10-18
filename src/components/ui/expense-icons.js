// El ícono orienta la lectura sin modificar la categoría financiera guardada.
export function expenseIcon(category, description) {
  const normalized = String(category || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR')
  if (/supermercado|aliment|comida|compras/.test(normalized)) return 'basket'
  if (/transporte|movilidad|viaje/.test(normalized)) return 'bus'
  if (/alquiler|vivienda|hogar/.test(normalized)) return 'home'
  if (/internet|conectividad/.test(normalized)) return 'wifi'
  if (/luz|electric|agua|gas|servicio/.test(normalized)) return 'bolt'
  if (/salud|farmacia/.test(normalized)) return 'heart'
  if (/ocio|entretenimiento/.test(normalized)) return 'ticket'
  if (!normalized && ['dia', 'día', 'coto', 'carrefour', 'jumbo', 'disco', 'vea'].includes(String(description || '').trim().toLocaleLowerCase('es-AR'))) return 'basket'
  return 'receipt'
}
