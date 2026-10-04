import { NavLink } from 'react-router'
import { Icon } from '../components/ui'
import { useWorkspace } from './useWorkspace'
import { spaceSections } from './navigation'

export function Brand() {
  return <NavLink to="/" className="app-brand" aria-label="FairShare, ir al inicio"><span className="app-brand__mark">F<span /></span><span>fairshare<span className="app-brand__dot">.</span></span></NavLink>
}

export function Sidebar({ onNavigate }) {
  const { spaceId } = useWorkspace()
  return <div className="sidebar-content">
    <div className="sidebar-brand"><Brand /><span className="sidebar-subtitle">Gastos claros, juntos.</span></div>
    <nav aria-label="Navegación principal" className="sidebar-nav" onClick={event => { if (event.target.closest('a')) onNavigate?.() }}>
      <p className="nav-caption">TU CUENTA</p>
      <NavLink to="/espacios" end className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><Icon name="grid" />Mis espacios</NavLink>
      <NavLink to="/ingresos" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><Icon name="wallet" />Mis ingresos</NavLink>
      <p className="nav-caption nav-caption--space">ESPACIO ACTUAL</p>
      {spaceSections.map(section => spaceId
        ? <NavLink key={section.slug} to={`/espacios/${spaceId}/${section.slug}`} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><Icon name={section.icon} />{section.label}</NavLink>
        : <span key={section.slug} className="nav-item nav-item--disabled" aria-disabled="true"><Icon name={section.icon} />{section.label}</span>)}
      {!spaceId && <p className="nav-help">Elegí un espacio para ver sus gastos y movimientos.</p>}
    </nav>
    <div className="sidebar-footer"><span className="sidebar-footer__icon"><Icon name="users" /></span><div><strong>Las cuentas, en orden.</strong><p>Más claridad para tu grupo.</p></div></div>
    <NavLink to="/componentes" className="design-system-link" onClick={onNavigate}>Componentes del equipo <Icon name="arrow" size={14} /></NavLink>
  </div>
}
