import { Link, NavLink } from 'react-router'
import { Icon } from '../components/ui'
import { useWorkspace } from './useWorkspace'
import { expenseDestination, incomeDestination, spaceSections } from './navigation'
import { SpaceSwitcher } from './SpaceSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from '../features/auth/UserMenu'

export function Brand() {
  return <NavLink to="/" className="app-brand" aria-label="FairShare, ir al inicio"><span className="app-brand__mark">F<span /></span><span>fairshare<span className="app-brand__dot">.</span></span></NavLink>
}

export function Sidebar({ compact = false, onNavigate }) {
  const { spaceId, session, expenseViews } = useWorkspace()
  const accountName = [session?.usuario?.nombre, session?.usuario?.apellido].filter(Boolean).join(' ') || 'Mi cuenta'
  return <div className={`sidebar-content${compact ? ' sidebar-content--compact' : ''}`}>
    <div className="sidebar-brand"><Brand /></div>
    <SpaceSwitcher onNavigate={onNavigate} />
    <nav aria-label="Navegación principal" className="sidebar-nav" onClick={event => { if (event.target.closest('a')) onNavigate?.() }}>
      {compact && spaceId ? <>
        <div className="sidebar-nav__group" role="group" aria-label="Actividad del espacio">
          {[{ slug: 'resumen', label: 'Inicio', icon: 'home' }, { slug: 'gastos', label: 'Gastos', icon: 'receipt' }, { slug: 'balance', label: 'Balance', icon: 'transfer' }, { slug: 'recurrentes', label: 'Recurrentes', icon: 'repeat' }, { slug: 'liquidaciones', label: 'Liquidaciones', icon: 'check' }].map(section => <NavLink key={section.slug} to={section.slug === 'gastos' ? expenseDestination(spaceId, expenseViews) : `/espacios/${spaceId}/${section.slug}`}  className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><Icon name={section.icon} />{section.label}</NavLink>)}
        </div>
        <div className="sidebar-nav__group sidebar-nav__group--secondary" role="group" aria-label="Administración del espacio">
          {spaceSections.filter(section => ['miembros', 'configuracion'].includes(section.slug)).map(section => <NavLink key={section.slug} to={section.slug === 'gastos' ? expenseDestination(spaceId, expenseViews) : `/espacios/${spaceId}/${section.slug}`}  className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><Icon name={section.icon} />{section.label}</NavLink>)}
        </div>
      </> : <><p className="nav-caption">TU CUENTA</p>
      <NavLink to="/espacios" end className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><Icon name="grid" />Mis espacios</NavLink>
      <NavLink to={incomeDestination(spaceId)} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><Icon name="wallet" />Mis ingresos</NavLink>
      {spaceId && <p className="nav-caption nav-caption--space">ESPACIO ACTUAL</p>}
      {spaceId && spaceSections.map(section => spaceId
        ? <NavLink key={section.slug} to={section.slug === 'gastos' ? expenseDestination(spaceId, expenseViews) : `/espacios/${spaceId}/${section.slug}`}  className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><Icon name={section.icon} />{section.label}</NavLink>
        : <span key={section.slug} className="nav-item nav-item--disabled" aria-disabled="true"><Icon name={section.icon} />{section.label}</span>)}
      {!spaceId && <p className="nav-help">Elegí un espacio para ver sus gastos y movimientos.</p>}</>}
    </nav>
    <div className={`sidebar-account${compact ? ' sidebar-account--compact' : ''}`}>{compact && spaceId && <nav aria-label="Tu cuenta" className="sidebar-account__navigation"><NavLink to={incomeDestination(spaceId)} onClick={onNavigate} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><Icon name="wallet" />Mis ingresos</NavLink></nav>}{compact ? <><p>{accountName}</p><div className="sidebar-account__links"><UserMenu compact />{spaceId && <><span aria-hidden="true">·</span><Link to="/espacios" onClick={onNavigate}>Mis espacios</Link></>}</div></> : <UserMenu />}<ThemeToggle className="sidebar-account__theme" /></div>
  </div>
}
