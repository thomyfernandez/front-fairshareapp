export const spaceTypes = { HOGAR: 'Hogar', VIAJE: 'Viaje', PAREJA: 'Pareja', TRABAJO: 'Trabajo o proyecto', OTRO: 'Otro' }
export const splitOptions = [
  { value: 'CINCUENTA_CINCUENTA', label: 'En partes iguales', description: 'Cada participante del gasto aporta la misma parte.' },
  { value: 'PROPORCIONAL', label: 'Según los ingresos', description: 'El aporte depende de los ingresos declarados de cada participante.' },
]
export const splitLabel = value => splitOptions.find(option => option.value === value)?.label || 'Sin modalidad definida'
