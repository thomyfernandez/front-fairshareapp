import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Modal } from '../components/ui'
import { useAppTheme } from './useAppTheme'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { sectionTitle } from './navigation'

const SIDEBAR_COLLAPSED_KEY = 'fairshare:sidebar-collapsed'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
    } catch {
      return false
    }
  })
  const { pathname } = useLocation()
  const main = useRef(null)
  const layout = useRef(null)
  const focusToggle = useRef(false)
  useAppTheme()
  useEffect(() => {
    setMenuOpen(false)
    document.title = `${sectionTitle(pathname)} · FairShare`
    // Focus the destination after navigating, without moving focus during async reloads.
    main.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  useEffect(() => {
    if (!focusToggle.current) return
    focusToggle.current = false
    layout.current?.querySelector(sidebarCollapsed ? '.desktop-sidebar-toggle' : '.sidebar-collapse-button')?.focus({ preventScroll: true })
  }, [sidebarCollapsed])

  const toggleSidebar = () => {
    focusToggle.current = true
    setSidebarCollapsed(prev => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  return <div ref={layout} className={`app-layout app-layout--cercana${sidebarCollapsed ? ' app-layout--sidebar-collapsed' : ''}`}><a className="skip-link" href="#main-content">Saltar al contenido</a>
    <aside id="desktop-sidebar" className="desktop-sidebar" inert={sidebarCollapsed}><Sidebar compact onToggleCollapse={toggleSidebar} /></aside>
    <div className="app-workspace">
      <Header onOpenMenu={() => setMenuOpen(true)} onToggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />
      <main id="main-content" ref={main} tabIndex={-1} className="app-main"><Outlet /></main>
      <footer className="app-footer"><span>FairShare · Gastos compartidos</span><span>Hecho para compartir con claridad.</span></footer>
    </div>
    <Modal open={menuOpen} title="Navegación" onClose={() => setMenuOpen(false)} className="navigation-drawer"><Sidebar compact onNavigate={() => setMenuOpen(false)} /></Modal>
  </div>
}
