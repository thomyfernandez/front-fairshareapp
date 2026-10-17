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

export function createApi({ baseUrl = '', token = '', onUnauthorized = () => {}, fetcher = globalThis.fetch } = {}) {
  return async function api(path, { method = 'GET', body, signal } = {}) {
    const headers = { Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    let response
    let text
    try {
      response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method, headers, signal,
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
      if (response.status === 401 && token) onUnauthorized()
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
