import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, createApi } from '../../api'

import { SessionContext } from './session-context'
import { isUserAvatar } from '../../components/ui/user-avatars'
import { clearSessionDrafts } from '../../lib/draft-storage'

// Login, /me y el avatar devuelven el usuario plano; el mock lo anida en `usuario`.
function toUsuario(data) {
  const source = data && typeof data.usuario === 'object' && data.usuario !== null ? data.usuario : data
  if (!source || typeof source !== 'object' || Array.isArray(source) || source.id == null) return null
  return {
    id: source.id,
    nombre: source.nombre || source.usuario || 'Usuario',
    apellido: source.apellido || '',
    email: source.email || '',
    usuario: source.usuario || source.nombre || 'usuario',
    avatarId: source.avatarId ?? null,
  }
}

// Sesión con cookie HttpOnly: el JWT nunca llega a JavaScript ni a localStorage/sessionStorage.
// Al recargar (F5) la sesión se recupera preguntando al servidor quién es el usuario (/me);
// el navegador adjunta la cookie solo. La expiración la decide el servidor: un 401 cierra la sesión.
export function SessionProvider({ children }) {
  const [session, setSession] = useState(null)
  // 'loading' mientras se consulta /me al abrir la app; evita mandar a /login a alguien con sesión válida.
  const [status, setStatus] = useState('loading')
  // Why the last session ended ('expired' | 'signedOut'), shown once on the login screen.
  const [notice, setNotice] = useState(null)
  const active = useRef(null)
  const sessionCount = useRef(0)
  const signIn = useCallback(auth => {
    const usuario = toUsuario(auth)
    if (!usuario) {
      active.current = null
      setSession(null)
      return
    }
    // `key` identifica esta sesión para descartar respuestas que llegan después de cambiar de cuenta.
    const sessionData = { key: ++sessionCount.current, usuario }
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
  const api = useMemo(() => createApi({
    baseUrl: import.meta.env.VITE_API_URL || '',
    onUnauthorized: () => endSession('expired'),
  }), [endSession])
  useEffect(() => {
    const controller = new AbortController()
    api('/api/v1/usuarios/me', { signal: controller.signal })
      .then(data => { if (!active.current) signIn(data) })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setStatus('ready') })
    return () => controller.abort()
  }, [api, signIn])
  const signOut = useCallback(() => {
    // El servidor borra la cookie HttpOnly (JS no puede hacerlo); la interfaz se cierra sin esperar.
    api('/api/v1/usuarios/logout', { method: 'POST' }).catch(() => {})
    endSession('signedOut')
  }, [api, endSession])
  const updateAvatar = useCallback(async avatarId => {
    const current = active.current
    if (!current) throw new ApiError('Iniciá sesión para cambiar tu avatar.', { status: 401 })
    const usuario = await api('/api/v1/usuarios/me/avatar', { method: 'PATCH', body: { avatarId } })
    if (active.current?.key !== current.key || active.current?.usuario?.id !== current.usuario.id)
      throw new ApiError('La sesión cambió. Volvé a abrir tu cuenta.')
    if (usuario?.id !== current.usuario.id || !Object.hasOwn(usuario, 'avatarId') || (usuario.avatarId !== null && !isUserAvatar(usuario.avatarId)))
      throw new ApiError('No pudimos confirmar el avatar guardado.', { code: 'INVALID_RESPONSE' })
    const next = { ...active.current, usuario: { ...active.current.usuario, ...usuario } }
    active.current = next
    setSession(next)
    return usuario
  }, [api])
  return <SessionContext.Provider value={{ session, status, api, signIn, signOut, updateAvatar, notice }}>{children}</SessionContext.Provider>
}
