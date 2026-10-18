import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Modal } from '../components/ui'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { sectionTitle } from './navigation'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const main = useRef(null)
  const isSummary = /^\/espacios\/[1-9]\d*\/resumen\/?$/.test(pathname)
  const theme = isSummary || pathname === '/componentes' ? 'dark' : 'light'
  // El tema también alcanza a los diálogos y avisos que se montan fuera del shell.
  useLayoutEffect(() => {
    const root = document.documentElement
    const previous = root.getAttribute('data-theme')
    root.setAttribute('data-theme', theme)
    return () => {
      if (previous === null) root.removeAttribute('data-theme')
      else root.setAttribute('data-theme', previous)
    }
  }, [theme])
  useEffect(() => {
    setMenuOpen(false)
    document.title = `${sectionTitle(pathname)} · FairShare`
    // Focus the destination after navigating, without moving focus during async reloads.
    main.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return <div className={`app-layout${isSummary ? ' app-layout--summary' : ''}`}><a className="skip-link" href="#main-content">Saltar al contenido</a>
    <aside className="desktop-sidebar"><Sidebar compact={isSummary} /></aside>
    <div className="app-workspace"><Header onOpenMenu={() => setMenuOpen(true)} /><main id="main-content" ref={main} tabIndex={-1} className="app-main"><Outlet /></main>
      <footer className="app-footer"><span>FairShare · Gastos compartidos</span><span>Hecho para compartir con claridad.</span></footer>
    </div>
    <Modal open={menuOpen} title="Navegación" onClose={() => setMenuOpen(false)} className="navigation-drawer"><Sidebar compact={isSummary} onNavigate={() => setMenuOpen(false)} /></Modal>
  </div>
}
