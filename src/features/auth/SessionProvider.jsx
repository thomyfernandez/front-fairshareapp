import { useCallback, useMemo, useRef, useState } from 'react'
import { createApi } from '../../api'
import { useUI } from '../../components/ui'

import { SessionContext } from './session-context'

// Integration adapter for integrante 1: keep the existing in-memory JWT policy.
export function SessionProvider({ children }) {
  const [session, setSession] = useState(null)
  const active = useRef(null)
  const { notify } = useUI()
  const signIn = useCallback(auth => { active.current = auth; setSession(auth) }, [])
  const signOut = useCallback(() => { active.current = null; setSession(null) }, [])
  const api = useMemo(() => createApi({
    baseUrl: import.meta.env.VITE_API_URL || '', token: session?.token,
    onUnauthorized: () => {
      if (!active.current || active.current.token !== session?.token) return
      signOut()
      notify('Tu sesión venció. Iniciá sesión nuevamente para continuar.', 'info')
    },
  }), [session?.token, signOut, notify])
  return <SessionContext.Provider value={{ session, api, signIn, signOut }}>{children}</SessionContext.Provider>
}
