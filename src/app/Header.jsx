import { useLocation } from 'react-router'
import { Button, Icon } from '../components/ui'
import { sectionTitle } from './navigation'

export function Header({ onOpenMenu, onToggleSidebar, sidebarCollapsed }) {
  const { pathname } = useLocation()
  return <header className="app-header">
    <Button className="mobile-menu-button" variant="ghost" size="icon" aria-label="Abrir navegación" onClick={onOpenMenu}><Icon name="menu" /></Button>
    {sidebarCollapsed && (
      <Button className="desktop-sidebar-toggle" variant="ghost" size="icon" aria-label="Mostrar barra lateral" aria-controls="desktop-sidebar" aria-expanded="false" onClick={onToggleSidebar}>
        <Icon name="panel-left-open" size={20} />
      </Button>
    )}
    <div className="header-breadcrumb"><span>Tu cuenta</span><Icon name="chevron" size={14} /><strong>{sectionTitle(pathname)}</strong></div>
  </header>
}
