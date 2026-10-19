export const spaceSections = [
  { slug: 'resumen', label: 'Resumen', icon: 'home' },
  { slug: 'gastos', label: 'Gastos', icon: 'receipt' },
  { slug: 'balance', label: 'Balance y pagos', icon: 'balance' },
  { slug: 'recurrentes', label: 'Recurrentes', icon: 'repeat' },
  { slug: 'liquidaciones', label: 'Liquidaciones', icon: 'check' },
  { slug: 'miembros', label: 'Miembros', icon: 'users' },
  { slug: 'configuracion', label: 'Configuración', icon: 'settings' },
]
export function sectionTitle(pathname) {
  if (pathname === '/espacios') return 'Mis espacios'
  if (pathname === '/ingresos') return 'Mis ingresos'
  if (pathname === '/componentes') return 'Sistema de diseño'
  return spaceSections.find(section => pathname.endsWith(`/${section.slug}`))?.label || 'Inicio'
}
export function spaceDestination(id, pathname, expenseViews = {}) {
  if (pathname === '/ingresos') return incomeDestination(id)
  const slug = spaceSections.find(section => pathname.endsWith(`/${section.slug}`))?.slug || 'resumen'
  if (slug === 'gastos') return expenseDestination(id, expenseViews)
  return `/espacios/${id}/${slug}`
}

export function expenseDestination(id, views = {}) {
  const query = views[id]?.query
  return `/espacios/${id}/gastos${query ? `?${query}` : ''}`
}

export function incomeDestination(spaceId) {
  return /^[1-9]\d*$/.test(String(spaceId || '')) ? `/ingresos?espacio=${spaceId}` : '/ingresos'
}
