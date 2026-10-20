import { useEffect, useState } from 'react'
import { getUserAvatar } from './user-avatars'
import { readAvatar, subscribeAvatarChanges } from '../../lib/avatar-storage'

// Representa a una persona; su nombre completo debe acompañar al avatar en el contenido.
export function Avatar({ name = '', avatar = null, userId = null, size = 'normal', className = '' }) {
  const [storedAvatar, setStoredAvatar] = useState(() => (userId ? readAvatar(userId) : null))

  useEffect(() => {
    if (!userId) return
    setStoredAvatar(readAvatar(userId))
    return subscribeAvatarChanges((changedUserId, newAvatar) => {
      if (String(changedUserId) === String(userId)) {
        setStoredAvatar(newAvatar)
      }
    })
  }, [userId])

  const effectiveAvatarId = avatar || storedAvatar
  const avatarChoice = getUserAvatar(effectiveAvatarId)

  if (avatarChoice) {
    return (
      <span className={`ui-avatar ui-avatar--image ui-avatar--${size} ${className}`.trim()} aria-hidden="true">
        <img src={avatarChoice.path} alt="" className="ui-avatar__img" />
      </span>
    )
  }

  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('es-AR')
  return <span className={`ui-avatar ui-avatar--${size} ${className}`.trim()} aria-hidden="true">{initials || '?'}</span>
}
