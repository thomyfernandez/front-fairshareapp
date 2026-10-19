import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'
import { Notification } from './Notification'

import { UIContext } from './ui-context'

export function UIProvider({ children }) {
  const [notices, setNotices] = useState([])
  const [question, setQuestion] = useState(null)
  const resolver = useRef(null)
  const counter = useRef(0)
  const dismiss = useCallback(id => setNotices(list => list.filter(item => item.id !== id)), [])
  const notify = useCallback((message, tone = 'success') => {
    setNotices(list => [...list.slice(-2), { id: ++counter.current, message, tone }])
  }, [])
  const confirm = useCallback(options => {
    // Resolve an outstanding dialog before replacing it; no promise is left hanging.
    resolver.current?.(false)
    setQuestion(typeof options === 'string' ? { title: 'Confirmar acción', description: options } : options)
    return new Promise(resolve => { resolver.current = resolve })
  }, [])
  const answer = useCallback(value => { resolver.current?.(value); resolver.current = null; setQuestion(null) }, [])
  useEffect(() => () => resolver.current?.(false), [])
  return <UIContext.Provider value={{ notify, confirm }}>
    {children}
    <div className="notification-stack" aria-label="Notificaciones">{notices.map(item => <Notification key={item.id} notice={item} onDismiss={dismiss} />)}</div>
    <Modal open={Boolean(question)} title={question?.title || 'Confirmar acción'} description={question?.description} onClose={() => answer(false)} footer={<><Button variant="secondary" data-autofocus onClick={() => answer(false)}>Cancelar</Button><Button variant={question?.danger ? 'danger' : 'primary'} onClick={() => answer(true)}>{question?.confirmLabel || 'Confirmar'}</Button></>} />
  </UIContext.Provider>
}
