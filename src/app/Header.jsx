import { useLocation, useNavigate } from 'react-router'
import { Button, Icon } from '../components/ui'
import { UserMenu } from '../features/auth/UserMenu'
import { useWorkspace } from './useWorkspace'
import { sectionTitle, spaceDestination } from './navigation'

export function Header({ onOpenMenu }) {
  const { spaces, spacesState, space, spaceId, spaceState } = useWorkspace()
  const { pathname } = useLocation()
  const navigate = useNavigate()
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
    </div><UserMenu /></div>
  </header>
}
