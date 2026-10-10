import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button, Icon } from '../components/ui'
import { useSession } from '../features/auth/useSession'
import { useWorkspace } from './useWorkspace'
import { sectionTitle, spaceDestination } from './navigation'

export function Header({ onOpenMenu }) {
  const { session, signOut } = useSession()
  const { spaces, spacesState, space, spaceId, spaceState } = useWorkspace()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const account = useRef(null)
  useEffect(() => { account.current?.removeAttribute('open') }, [pathname])
  useEffect(() => {
    const closeOutside = event => { if (!account.current?.contains(event.target)) account.current?.removeAttribute('open') }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])
  const name = session?.usuario?.nombre || session?.usuario?.usuario || session?.nombre || 'Mi cuenta'
  return <header className="app-header">
    <div className="header-left"><Button className="mobile-menu-button" variant="ghost" size="icon" aria-label="Abrir navegación" onClick={onOpenMenu}><Icon name="menu" /></Button>
      <div className="header-breadcrumb"><span>Tu cuenta</span><Icon name="chevron" size={14} /><strong>{sectionTitle(pathname)}</strong></div>
    </div>
    <div className="header-right"><div className="space-switcher"><label htmlFor="active-space">Espacio activo</label>
      <select id="active-space" value={spaceId || ''} disabled={spacesState.loading || Boolean(spacesState.error) || !spaces.length} onChange={event => navigate(spaceDestination(event.target.value, pathname))}>
        <option value="" disabled>{spacesState.loading ? 'Cargando espacios…' : spacesState.error ? 'Espacios no disponibles' : 'Elegí un espacio'}</option>
        {spaceId && !spaces.some(item => String(item.id) === spaceId) && <option value={spaceId}>{space?.nombre || (spaceState.loading ? 'Cargando espacio…' : 'Espacio no disponible')}</option>}
        {spaces.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
      </select>
    </div><details ref={account} className="account-menu" onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.removeAttribute('open'); event.currentTarget.querySelector('summary')?.focus() } }}><summary aria-label={`Cuenta de ${name}`}><span className="avatar">{name.slice(0, 1).toUpperCase()}</span><span className="account-name">{name}</span></summary>
      <div className="account-menu__panel"><strong>{name}</strong><span>{session?.usuario?.email || session?.email}</span><Button variant="ghost" onClick={() => { signOut(); navigate('/login', { replace: true }) }}><Icon name="logout" size={17} />Cerrar sesión</Button></div>
    </details></div>
  </header>
}
