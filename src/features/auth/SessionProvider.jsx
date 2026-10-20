import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, createApi } from '../../api'

import { SessionContext } from './session-context'
import { tokenExpiry } from './session'
import { isUserAvatar } from '../../components/ui/user-avatars'
import { clearSessionDrafts } from '../../lib/draft-storage'

// setTimeout overflows above ~24.8 days; longer tokens rely on the server's 401 instead.
const MAX_TIMER_MS = 2 ** 31 - 1

// Integration adapter for integrante 1: keep the existing in-memory JWT policy.
export function SessionProvider({ children }) {
  const [session, setSession] = useState(null)
  // Why the last session ended ('expired' | 'signedOut'), shown once on the login screen.
  const [notice, setNotice] = useState(null)
  const active = useRef(null)
  const signIn = useCallback(auth => {
    if (!auth) {
      active.current = null
      setSession(null)
      return
    }
    const usuario = auth.usuario || {
      id: auth.id || auth.usuarioId || 1,
      nombre: auth.nombre || auth.usuario || 'Usuario',
      apellido: auth.apellido || '',
      email: auth.email || '',
      usuario: auth.usuario || auth.nombre || 'usuario',
      avatarId: auth.avatarId ?? null,
    }
    const sessionData = {
      ...auth,
      token: auth.token,
      usuario,
    }
    active.current = sessionData
    setNotice(null)
    setSession(sessionData)
  }, [])
  const endSession = useCallback(reason => {
    if (!active.current) return
    const email = active.current.usuario?.email
    clearSessionDrafts()
    active.current = null
    setSession(null)
    setNotice({ reason, email })
  }, [])
  const signOut = useCallback(() => endSession('signedOut'), [endSession])
  useEffect(() => {
    const expiresAt = tokenExpiry(session?.token)
    if (!expiresAt) return
    const delay = expiresAt - Date.now()
    if (delay > MAX_TIMER_MS) return
    const timer = setTimeout(() => endSession('expired'), Math.max(0, delay))
    return () => clearTimeout(timer)
  }, [session?.token, endSession])
  const api = useMemo(() => createApi({
    baseUrl: import.meta.env.VITE_API_URL || '', token: session?.token,
    onUnauthorized: () => {
      if (!active.current || active.current.token !== session?.token) return
      endSession('expired')
    },
  }), [session?.token, endSession])
  const updateAvatar = useCallback(async avatarId => {
    const current = active.current
    if (!current) throw new ApiError('Iniciá sesión para cambiar tu avatar.', { status: 401 })
    const usuario = await api('/api/v1/usuarios/me/avatar', { method: 'PATCH', body: { avatarId } })
    if (active.current?.token !== current.token || active.current?.usuario?.id !== current.usuario.id)
      throw new ApiError('La sesión cambió. Volvé a abrir tu cuenta.')
    if (usuario?.id !== current.usuario.id || !Object.hasOwn(usuario, 'avatarId') || (usuario.avatarId !== null && !isUserAvatar(usuario.avatarId)))
      throw new ApiError('No pudimos confirmar el avatar guardado.', { code: 'INVALID_RESPONSE' })
    const next = { ...active.current, usuario: { ...active.current.usuario, ...usuario } }
    active.current = next
    setSession(next)
    return usuario
  }, [api])
  return <SessionContext.Provider value={{ session, api, signIn, signOut, updateAvatar, notice }}>{children}</SessionContext.Provider>
}
