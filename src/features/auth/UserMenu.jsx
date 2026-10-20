import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Avatar, AvatarPickerModal, Button, Icon } from '../../components/ui'
import { useSession } from './useSession'
import { readAvatar, subscribeAvatarChanges } from '../../lib/avatar-storage'

export function UserMenu({ compact = false }) {
  const { session, signOut } = useSession()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const menu = useRef(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const usuario = session?.usuario
  const [avatar, setAvatar] = useState(() => (usuario?.id ? readAvatar(usuario.id) : null))

  useEffect(() => {
    if (!usuario?.id) return
    setAvatar(readAvatar(usuario.id))
    return subscribeAvatarChanges((changedId, newAvatar) => {
      if (String(changedId) === String(usuario.id)) {
        setAvatar(newAvatar)
      }
    })
  }, [usuario?.id])

  useEffect(() => { menu.current?.removeAttribute('open') }, [pathname])
  useEffect(() => {
    const closeOutside = event => { if (!menu.current?.contains(event.target)) menu.current?.removeAttribute('open') }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])

  const name = usuario?.nombre || usuario?.usuario || 'Mi cuenta'
  const fullName = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ') || name
  const closeWithEscape = event => {
    if (event.key !== 'Escape') return
    event.currentTarget.removeAttribute('open')
    event.currentTarget.querySelector('summary')?.focus()
  }

  return (
    <>
      <details ref={menu} className={`account-menu${compact ? ' account-menu--compact' : ''}`} onKeyDown={closeWithEscape}>
        <summary aria-label={`Cuenta de ${name}`}>
          {compact ? 'Mi cuenta' : <>
            <Avatar name={name} avatar={avatar} size="small" className="avatar" />
            <span className="account-name">{name}</span>
          </>}
        </summary>
        <div className="account-menu__panel">
          <strong>{fullName}</strong>
          {usuario?.email && <span>{usuario.email}</span>}
          <Button variant="ghost" onClick={() => { menu.current?.removeAttribute('open'); setPickerOpen(true) }}>
            <Icon name="heart" size={17} />
            Elegir avatar
          </Button>
          <Button variant="ghost" onClick={() => { signOut(); navigate('/login', { replace: true }) }}>
            <Icon name="logout" size={17} />
            Cerrar sesión
          </Button>
        </div>
      </details>
      <AvatarPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        userId={usuario?.id}
        userName={name}
      />
    </>
  )
}
