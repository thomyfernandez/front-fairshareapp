import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { Button, Icon } from '../components/ui'
import { useWorkspace } from './useWorkspace'
import { spaceDestination } from './navigation'

export function SpaceSwitcher({ onNavigate }) {
  const { spaces, spacesState, space, spaceId, expenseViews } = useWorkspace()
  const { pathname, search } = useLocation()
  const ref = useRef(null)
  useEffect(() => { ref.current?.removeAttribute('open') }, [pathname, search])
  useEffect(() => {
    const close = event => { if (!ref.current?.contains(event.target)) ref.current?.removeAttribute('open') }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  return <details ref={ref} className="workspace-switcher" onKeyDown={event => {
    if (event.key === 'Escape') { ref.current.removeAttribute('open'); ref.current.querySelector('summary').focus() }
  }}>
    <summary aria-label="Cambiar espacio activo"><span className="workspace-switcher__initial" aria-hidden="true">{space?.nombre?.slice(0, 1).toUpperCase() || 'F'}</span><span className="workspace-switcher__name">{space?.nombre || 'Elegí un espacio'}</span><Icon name="chevron" size={14} /></summary>
    <div className="workspace-switcher__panel">
      <p>TUS ESPACIOS</p>
      {spacesState.loading ? <span role="status">Cargando espacios…</span> : spacesState.error ? <><span>No pudimos cargar los espacios.</span><Button variant="ghost" onClick={spacesState.reload}>Reintentar</Button></> : <div className="workspace-switcher__list">{spaces.map(item => <Link key={item.id} to={spaceDestination(item.id, pathname, expenseViews)} aria-current={String(item.id) === spaceId ? 'true' : undefined} onClick={onNavigate}><span>{item.nombre}</span>{String(item.id) === spaceId && <Icon name="check" size={16} />}</Link>)}{!spaces.length && <span>Todavía no tenés espacios.</span>}</div>}
      <Link className="workspace-switcher__create" to="/espacios?crear=1" onClick={onNavigate}><Icon name="plus" size={16} />Crear nuevo espacio</Link>
    </div>
  </details>
}
