import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'

export function Notification({ notice, onDismiss }) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const remaining = useRef(5000)
  const paused = hovered || focused

  useEffect(() => {
    if (paused) return
    const started = Date.now()
    const timer = setTimeout(() => onDismiss(notice.id), remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current = Math.max(0, remaining.current - (Date.now() - started))
    }
  }, [notice.id, onDismiss, paused])

  return <div className={`ui-notice ui-notice--${notice.tone}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    <div role={notice.tone === 'error' ? 'alert' : 'status'}><Icon name={notice.tone === 'success' ? 'check' : 'info'} /><span>{notice.message}</span></div>
    <Button variant="ghost" size="icon" aria-label="Cerrar notificación" onClick={() => onDismiss(notice.id)}><Icon name="close" size={16} /></Button>
  </div>
}
