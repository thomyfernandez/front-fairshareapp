import { assertContract } from './contract'
import { createMockEngine } from './mock-engine'

export async function loadMockFixtures(fetcher, base = import.meta.env.BASE_URL || '/') {
  const directory = `${base.replace(/\/$/, '')}/data/`
  async function json(file) {
    if (!/^[a-z0-9-]+\.json$/.test(file)) throw new Error('Nombre de archivo JSON inválido.')
    const response = await fetcher(`${directory}${file}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
    if (!response.ok) throw new Error(`No se pudo cargar ${file}.`)
    return response.json()
  }
  const manifest = await json('index.json')
  const entries = await Promise.all(Object.entries(manifest.fixtures).map(async ([key, entry]) => {
    const value = await json(entry.file)
    assertContract(entry.dto, value, entry.file)
    return [key, value]
  }))
  return Object.fromEntries(entries)
}

const json = (body, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export function createMockFetcher({ fetcher = globalThis.fetch, now, base } = {}) {
  let engine
  // Simula la cookie HttpOnly del backend: la guarda "el navegador" (este fetcher), nunca el código
  // de la app. Vive en memoria, así que en modo mock un F5 cierra la sesión (no hay servidor real).
  let sessionCookie = null
  return async function fetchMock(input, options = {}) {
    if (options.signal?.aborted) throw new DOMException('Solicitud cancelada', 'AbortError')
    let request
    try {
      // Compartir una única carga evita reiniciar la simulación al renovar la instancia de createApi.
      engine ??= loadMockFixtures(fetcher, base).then(fixtures => createMockEngine(fixtures, { now })).catch(error => { engine = null; throw error })
      request = await engine
    } catch (error) {
      return new Response(JSON.stringify({ timestamp: new Date().toISOString(), status: 500, code: 'MOCK_DATA_ERROR', message: `No pudimos cargar los JSON de demostración. ${error.message}`, path: new URL(input, 'http://mock.local').pathname }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    if (options.signal?.aborted) throw new DOMException('Solicitud cancelada', 'AbortError')
    const headers = new Headers(options.headers)
    let body
    try { body = options.body ? JSON.parse(options.body) : undefined } catch {
      return new Response(JSON.stringify({ timestamp: new Date().toISOString(), status: 400, code: 'JSON_MALFORMADO', message: 'JSON inválido.', path: new URL(input, 'http://mock.local').pathname }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const method = options.method || 'GET'
    const path = new URL(input, 'http://mock.local').pathname
    if (path === '/api/v1/usuarios/csrf') return json({ headerName: 'X-XSRF-TOKEN', token: 'mock-csrf' })
    if (path === '/api/v1/usuarios/logout' && method === 'POST') {
      sessionCookie = null
      return json(null, 204)
    }
    const result = request(input, { method, body, token: sessionCookie ?? headers.get('Authorization')?.replace(/^Bearer /, '') })
    if (path === '/api/v1/usuarios/login' && result.status === 200) {
      // Igual que el backend: el token va a la "cookie" y el body solo lleva datos del usuario.
      const { token, tokenType: _tokenType, expiresIn: _expiresIn, ...user } = result.body
      sessionCookie = token
      return json(user)
    }
    return json(result.body, result.status)
  }
}

export const mockFetch = createMockFetcher()
