export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', fieldErrors = {}, data = null, cause } = {}) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.data = data
  }
}

const fetchMock = (...args) => import('./mocks/mock-fetch').then(module => module.mockFetch(...args))

// Sesión con cookie HttpOnly: el JWT lo guarda y lo envía el navegador; este código nunca lo ve.
// Como el navegador adjunta la cookie solo, los métodos que modifican datos llevan además el
// token CSRF (patrón "double submit": cookie XSRF-TOKEN legible + header X-XSRF-TOKEN).
export const CSRF_COOKIE = 'XSRF-TOKEN'
export const CSRF_HEADER = 'X-XSRF-TOKEN'
export const CSRF_PATH = '/api/v1/usuarios/csrf'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
// Antes de iniciar sesión no hay cookie que un sitio externo pueda aprovechar; un 401 acá significa
// credenciales incorrectas, no una sesión vencida.
const PUBLIC_AUTH_PATHS = ['/api/v1/usuarios/login', '/api/v1/usuarios/registro']

export function readCookie(name) {
  if (typeof document === 'undefined') return ''
  const prefix = `${name}=`
  const entry = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith(prefix))
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : ''
}

export function createApi({ baseUrl = '', onUnauthorized = () => {}, fetcher = import.meta.env.MODE === 'mock' ? fetchMock : globalThis.fetch } = {}) {
  const root = baseUrl.replace(/\/$/, '')
  // Si el back está en otro origen (sin proxy), document.cookie no ve su XSRF-TOKEN: se usa el del body.
  let fallbackCsrf = ''
  async function csrfToken(signal) {
    const fromCookie = readCookie(CSRF_COOKIE)
    if (fromCookie) return fromCookie
    try {
      const response = await fetcher(`${root}${CSRF_PATH}`, { method: 'GET', headers: { Accept: 'application/json' }, credentials: 'include', signal })
      const data = response.ok ? await response.json().catch(() => null) : null
      fallbackCsrf = data?.token || fallbackCsrf
    } catch (cause) {
      if (cause.name === 'AbortError') throw cause
    }
    return readCookie(CSRF_COOKIE) || fallbackCsrf
  }
  return async function api(path, { method = 'GET', body, signal } = {}) {
    const headers = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const isPublicAuth = PUBLIC_AUTH_PATHS.includes(path)
    if (!SAFE_METHODS.has(method) && !isPublicAuth) {
      const token = await csrfToken(signal)
      if (token) headers[CSRF_HEADER] = token
    }
    let response
    let text
    try {
      response = await fetcher(`${root}${path}`, {
        method, headers, signal, credentials: 'include',
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })
      text = await response.text()
    } catch (cause) {
      if (cause.name === 'AbortError') throw cause
      throw new ApiError(method === 'GET' || method === 'HEAD'
        ? 'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.'
        : 'No pudimos confirmar el resultado. Revisá los movimientos antes de repetir esta acción.', { cause })
    }
    let data = null
    if (text) {
      try { data = JSON.parse(text) } catch {
        if (response.ok && text.trim() === 'OK') {
          data = text.trim()
        } else if (response.ok) {
          throw new ApiError('El servidor devolvió una respuesta que no pudimos interpretar.', {
            status: response.status, code: 'INVALID_RESPONSE',
          })
        }
      }
    }
    if (!response.ok) {
      if (response.status === 401 && !isPublicAuth) onUnauthorized()
      const fallback = response.status === 403 ? 'No tenés permiso para realizar esta acción.'
        : response.status === 401 ? 'No pudimos validar tus credenciales.'
        : 'No pudimos completar la solicitud. Intentá nuevamente.'
      throw new ApiError(data?.message || fallback, {
        status: response.status, code: data?.code || `HTTP_${response.status}`,
        fieldErrors: data?.fieldErrors || {}, data,
      })
    }
    return data
  }
}
