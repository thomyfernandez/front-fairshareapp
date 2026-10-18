import { useLocation } from 'react-router'
import { Button, Icon } from '../components/ui'
import { sectionTitle } from './navigation'

export function Header({ onOpenMenu }) {
  const { pathname } = useLocation()
  return <header className="app-header">
    <Button className="mobile-menu-button" variant="ghost" size="icon" aria-label="Abrir navegación" onClick={onOpenMenu}><Icon name="menu" /></Button>
    <div className="header-breadcrumb"><span>Tu cuenta</span><Icon name="chevron" size={14} /><strong>{sectionTitle(pathname)}</strong></div>
  </header>
}
