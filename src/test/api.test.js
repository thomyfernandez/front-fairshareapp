import { describe, expect, it, vi } from 'vitest'
import { ApiError, createApi } from '../api'

describe('API client', () => {
  it('preserves HTTP status, category and individual field errors', async () => {
    const data = { code: 'VALIDATION_ERROR', message: 'Datos inválidos', fieldErrors: { email: 'Email inválido' } }
    const api = createApi({ fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status: 400 })) })
    await expect(api('/registro')).rejects.toMatchObject({ name: 'ApiError', status: 400, code: 'VALIDATION_ERROR', fieldErrors: data.fieldErrors })
  })
  it('sends the session cookie, JSON and the cancellation signal and accepts 204, without a Bearer token', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-test'
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const signal = new AbortController().signal
    const api = createApi({ baseUrl: 'https://example.test/', fetcher })
    expect(await api('/gastos/1', { method: 'DELETE', body: { id: 1 }, signal })).toBeNull()
    expect(fetcher).toHaveBeenCalledWith('https://example.test/gastos/1', expect.objectContaining({ method: 'DELETE', signal, body: '{"id":1}', credentials: 'include', headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'csrf-test' }) }))
    expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty('Authorization')
    document.cookie = 'XSRF-TOKEN=; max-age=0'
  })
  it('asks for the CSRF token before the first change and never sends it on reads or login', async () => {
    const fetcher = vi.fn(async url => url.endsWith('/csrf')
      ? new Response(JSON.stringify({ headerName: 'X-XSRF-TOKEN', token: 'desde-body' }), { status: 200 })
      : new Response('{}', { status: 200 }))
    const api = createApi({ fetcher })
    await api('/api/v1/espacios')
    await api('/api/v1/usuarios/login', { method: 'POST', body: {} })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls.every(([, options]) => !options.headers['X-XSRF-TOKEN'])).toBe(true)
    await api('/api/v1/espacios', { method: 'POST', body: {} })
    expect(fetcher.mock.calls[2][0]).toBe('/api/v1/usuarios/csrf')
    expect(fetcher.mock.calls[3][1].headers['X-XSRF-TOKEN']).toBe('desde-body')
  })
  it('expires the session on 401, but not on 403 or on wrong login credentials', async () => {
    const onUnauthorized = vi.fn()
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 403 }))
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('', { status: 401 }))
    const api = createApi({ onUnauthorized, fetcher })
    await expect(api('/space')).rejects.toMatchObject({ status: 403 })
    expect(onUnauthorized).not.toHaveBeenCalled()
    await expect(api('/api/v1/usuarios/login', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).not.toHaveBeenCalled()
    await expect(api('/space')).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })
  it('distinguishes network errors from cancellations and malformed successful responses', async () => {
    await expect(createApi({ fetcher: () => Promise.reject(new Error('offline')) })('/api')).rejects.toBeInstanceOf(ApiError)
    const abort = new DOMException('Aborted', 'AbortError')
    await expect(createApi({ fetcher: () => Promise.reject(abort) })('/api')).rejects.toBe(abort)
    await expect(createApi({ fetcher: () => Promise.resolve(new Response('<html>')) })('/api')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })
})
