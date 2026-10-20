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

export function createMockFetcher({ fetcher = globalThis.fetch, now, base } = {}) {
  let engine
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
    const result = request(input, { method: options.method || 'GET', body, token: headers.get('Authorization')?.replace(/^Bearer /, '') })
    return new Response(result.status === 204 ? null : JSON.stringify(result.body), { status: result.status, headers: { 'Content-Type': 'application/json' } })
  }
}

export const mockFetch = createMockFetcher()
