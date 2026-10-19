// Representa a una persona; su nombre completo debe acompañar al avatar en el contenido.
export function Avatar({ name = '', size = 'normal' }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('es-AR')
  return <span className={`ui-avatar ui-avatar--${size}`} aria-hidden="true">{initials || '?'}</span>
}
