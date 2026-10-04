import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useApiResource } from '../hooks/useApiResource'

const deferred = () => {
  let resolve
  const promise = new Promise(complete => { resolve = complete })
  return { promise, resolve }
}

describe('isolated resource loading', () => {
  it('never exposes the previous space, even if its response arrives late', async () => {
    const first = deferred()
    const second = deferred()
    const api = vi.fn(path => path === '/spaces/1' ? first.promise : second.promise)
    const { result, rerender } = renderHook(({ path }) => useApiResource(api, path), { initialProps: { path: '/spaces/1' } })
    const oldSignal = api.mock.calls[0][1].signal
    rerender({ path: '/spaces/2' })
    expect(oldSignal.aborted).toBe(true)
    expect(result.current.data).toEqual([])
    await act(async () => second.resolve(['space-2']))
    await waitFor(() => expect(result.current.data).toEqual(['space-2']))
    await act(async () => first.resolve(['space-1']))
    expect(result.current.data).toEqual(['space-2'])
  })
  it('clears data when the authenticated client changes on the same URL', async () => {
    const next = deferred()
    const firstApi = vi.fn().mockResolvedValue(['private-data-first-user'])
    const secondApi = vi.fn(() => next.promise)
    const { result, rerender } = renderHook(({ api }) => useApiResource(api, '/api/space'), { initialProps: { api: firstApi } })
    await waitFor(() => expect(result.current.data).toEqual(['private-data-first-user']))
    rerender({ api: secondApi })
    expect(result.current.data).toEqual([])
    await act(async () => next.resolve(['second-user']))
    expect(result.current.data).toEqual(['second-user'])
  })
  it('can recover one failed resource without reloading unrelated data', async () => {
    const api = vi.fn().mockRejectedValueOnce(new Error('Failed')).mockResolvedValueOnce(['recovered'])
    const { result } = renderHook(() => useApiResource(api, '/api/gastos'))
    await waitFor(() => expect(result.current.error?.message).toBe('Failed'))
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.data).toEqual(['recovered']))
    expect(result.current.error).toBeNull()
  })
})
