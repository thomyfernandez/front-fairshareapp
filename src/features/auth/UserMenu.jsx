import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button, Icon } from '../../components/ui'
import { useSession } from './useSession'

export function UserMenu() {
  const { session, signOut } = useSession()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const menu = useRef(null)
  useEffect(() => { menu.current?.removeAttribute('open') }, [pathname])
  useEffect(() => {
    const closeOutside = event => { if (!menu.current?.contains(event.target)) menu.current?.removeAttribute('open') }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])
  const usuario = session?.usuario
  const name = usuario?.nombre || usuario?.usuario || 'Mi cuenta'
  const fullName = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ') || name
  const closeWithEscape = event => {
    if (event.key !== 'Escape') return
    event.currentTarget.removeAttribute('open')
    event.currentTarget.querySelector('summary')?.focus()
  }
  return <details ref={menu} className="account-menu" onKeyDown={closeWithEscape}>
    <summary aria-label={`Cuenta de ${name}`}><span className="avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span><span className="account-name">{name}</span></summary>
    <div className="account-menu__panel">
      <strong>{fullName}</strong>
      {usuario?.email && <span>{usuario.email}</span>}
      <Button variant="ghost" onClick={() => { signOut(); navigate('/login', { replace: true }) }}><Icon name="logout" size={17} />Cerrar sesión</Button>
    </div>
  </details>
}
