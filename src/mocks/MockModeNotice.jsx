import { useLayoutEffect, useRef } from 'react'

export function MockModeNotice() {
  const notice = useRef(null)
  useLayoutEffect(() => {
    // La altura cambia al envolver el texto en móvil o ampliar la fuente.
    const root = document.documentElement
    const updateHeight = () => root.style.setProperty('--mock-notice-height', `${notice.current.getBoundingClientRect().height}px`)
    updateHeight()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateHeight)
    observer?.observe(notice.current)
    window.addEventListener('resize', updateHeight)
    return () => { observer?.disconnect(); window.removeEventListener('resize', updateHeight); root.style.removeProperty('--mock-notice-height') }
  }, [])
  return <aside ref={notice} className="mock-mode-notice" aria-label="Modo de demostración"><strong>Modo de demostración</strong><span>Datos de ejemplo. Los cambios se reinician al recargar.</span></aside>
}
