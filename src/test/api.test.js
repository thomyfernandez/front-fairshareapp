import { describe, expect, it, vi } from 'vitest'
import { ApiError, createApi } from '../api'

describe('API client', () => {
  it('preserves HTTP status, category and individual field errors', async () => {
    const data = { code: 'VALIDATION_ERROR', message: 'Datos inválidos', fieldErrors: { email: 'Email inválido' } }
    const api = createApi({ fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status: 400 })) })
    await expect(api('/registro')).rejects.toMatchObject({ name: 'ApiError', status: 400, code: 'VALIDATION_ERROR', fieldErrors: data.fieldErrors })
  })
  it('sends authorization, JSON and the cancellation signal and accepts 204', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const signal = new AbortController().signal
    const api = createApi({ baseUrl: 'https://example.test/', token: 'token-test', fetcher })
    expect(await api('/gastos/1', { method: 'DELETE', body: { id: 1 }, signal })).toBeNull()
    expect(fetcher).toHaveBeenCalledWith('https://example.test/gastos/1', expect.objectContaining({ method: 'DELETE', signal, body: '{"id":1}', headers: expect.objectContaining({ Authorization: 'Bearer token-test' }) }))
  })
  it('expires an authenticated session on 401, but does not log out on 403', async () => {
    const onUnauthorized = vi.fn()
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('', { status: 403 })).mockResolvedValueOnce(new Response('', { status: 401 }))
    const api = createApi({ token: 'token-test', onUnauthorized, fetcher })
    await expect(api('/space')).rejects.toMatchObject({ status: 403 })
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
