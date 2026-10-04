import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { Icon } from './Icon'

export function Modal({ open, onClose, title, description, children, className = '', dismissible = true, footer }) {
  const ref = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!open) return
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    dialog.querySelector('[data-autofocus]')?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      if (dialog.open) dialog.close()
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus()
    }
  }, [open])
  if (!open) return null
  return createPortal(<dialog ref={ref} tabIndex={-1} className={`ui-modal ${className}`} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const controls = [...ref.current.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
        .filter(element => !element.disabled && element.tabIndex >= 0 && !element.closest('[hidden]'))
      const first = controls[0]
      const last = controls.at(-1)
      if (!first) { event.preventDefault(); ref.current.focus(); return }
      if (event.shiftKey && (document.activeElement === first || !ref.current.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !ref.current.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }}
    onCancel={event => { event.preventDefault(); if (dismissible) close.current() }}
    onClick={event => {
      if (event.target !== ref.current || !dismissible) return
      const rect = ref.current.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close.current()
    }}>
    <div className="ui-modal__header"><div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>{dismissible && <Button variant="ghost" size="icon" aria-label="Cerrar diálogo" onClick={onClose}><Icon name="close" /></Button>}</div>
    <div className="ui-modal__body">{children}</div>{footer && <div className="ui-modal__footer">{footer}</div>}
  </dialog>, document.body)
}
