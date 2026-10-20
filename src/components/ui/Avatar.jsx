import { getUserAvatar } from './user-avatars'

// El avatar confirmado llega de la API; null muestra iniciales, sin leer preferencias locales.
export function Avatar({ name = '', avatarId = null, size = 'normal', className = '' }) {
  const choice = getUserAvatar(avatarId)
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('es-AR')
  return <span className={`ui-avatar${choice ? ' ui-avatar--image' : ''} ui-avatar--${size} ${className}`.trim()} aria-hidden="true">
    {choice ? <img src={choice.path} alt="" className="ui-avatar__img" /> : initials || '?'}
  </span>
}
