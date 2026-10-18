import { Link, NavLink } from 'react-router'
import { Icon } from '../components/ui'
import { useWorkspace } from './useWorkspace'
import { spaceSections } from './navigation'
import { SpaceSwitcher } from './SpaceSwitcher'
import { UserMenu } from '../features/auth/UserMenu'

export function Brand() {
  return <NavLink to="/" className="app-brand" aria-label="FairShare, ir al inicio"><span className="app-brand__mark">F<span /></span><span>fairshare<span className="app-brand__dot">.</span></span></NavLink>
}

export function Sidebar({ compact = false, onNavigate }) {
  const { spaceId, session } = useWorkspace()
  const accountName = [session?.usuario?.nombre, session?.usuario?.apellido].filter(Boolean).join(' ') || 'Mi cuenta'
  return <div className={`sidebar-content${compact ? ' sidebar-content--compact' : ''}`}>
    <div className="sidebar-brand"><Brand /></div>
    <SpaceSwitcher onNavigate={onNavigate} />
    <nav aria-label="Navegación principal" className="sidebar-nav" onClick={event => { if (event.target.closest('a')) onNavigate?.() }}>
      {compact ? <>
        {[{ slug: 'resumen', label: 'Inicio', icon: 'home' }, { slug: 'gastos', label: 'Gastos', icon: 'receipt' }, { slug: 'balance', label: 'Balance', icon: 'transfer' }, { slug: 'recurrentes', label: 'Recurrentes', icon: 'repeat' }].map(section => <NavLink key={section.slug} to={`/espacios/${spaceId}/${section.slug}`} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><Icon name={section.icon} />{section.label}</NavLink>)}
        <details className="sidebar-more"><summary><Icon name="more" />Más</summary><div>{spaceSections.filter(section => ['liquidaciones', 'miembros', 'configuracion'].includes(section.slug)).map(section => <NavLink key={section.slug} to={`/espacios/${spaceId}/${section.slug}`} className="nav-item"><Icon name={section.icon} />{section.label}</NavLink>)}<Link className="nav-item" to="/ingresos"><Icon name="wallet" />Mis ingresos</Link></div></details>
      </> : <><p className="nav-caption">TU CUENTA</p>
      <NavLink to="/espacios" end className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><Icon name="grid" />Mis espacios</NavLink>
      <NavLink to="/ingresos" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><Icon name="wallet" />Mis ingresos</NavLink>
      <p className="nav-caption nav-caption--space">ESPACIO ACTUAL</p>
      {spaceSections.map(section => spaceId
        ? <NavLink key={section.slug} to={`/espacios/${spaceId}/${section.slug}`} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><Icon name={section.icon} />{section.label}</NavLink>
        : <span key={section.slug} className="nav-item nav-item--disabled" aria-disabled="true"><Icon name={section.icon} />{section.label}</span>)}
      {!spaceId && <p className="nav-help">Elegí un espacio para ver sus gastos y movimientos.</p>}</>}
    </nav>
    <div className={`sidebar-account${compact ? ' sidebar-account--compact' : ''}`}>{compact ? <><p>{accountName}</p><div className="sidebar-account__links"><UserMenu compact /><span aria-hidden="true">·</span><Link to="/espacios" onClick={onNavigate}>Mis espacios</Link></div></> : <UserMenu />}</div>
  </div>
}
