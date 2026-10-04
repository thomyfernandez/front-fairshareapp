import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Modal } from '../components/ui'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { sectionTitle } from './navigation'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const main = useRef(null)
  useEffect(() => {
    setMenuOpen(false)
    document.title = `${sectionTitle(pathname)} · FairShare`
    // Focus the destination after navigating, without moving focus during async reloads.
    main.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return <div className="app-layout"><a className="skip-link" href="#main-content">Saltar al contenido</a>
    <aside className="desktop-sidebar"><Sidebar /></aside>
    <div className="app-workspace"><Header onOpenMenu={() => setMenuOpen(true)} /><main id="main-content" ref={main} tabIndex={-1} className="app-main"><Outlet /></main>
      <footer className="app-footer"><span>FairShare · Gastos compartidos</span><span>Hecho para compartir con claridad.</span></footer>
    </div>
    <Modal open={menuOpen} title="Navegación" onClose={() => setMenuOpen(false)} className="navigation-drawer"><Sidebar onNavigate={() => setMenuOpen(false)} /></Modal>
  </div>
}
