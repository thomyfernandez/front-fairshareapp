import { useEffect, useRef, useState } from 'react'
import { useWorkspace } from '../app/useWorkspace'
import { useApiResource } from './useApiResource'
import { useUI } from '../components/ui'

// Bridge for the extracted screens. Each feature owns its data and local pending state.
export function useFeature(path, options = {}) {
  const workspace = useWorkspace()
  const { notify, confirm } = useUI()
  const resource = useApiResource(workspace.api, path, { ...options, revision: workspace.revision })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const pending = useRef(false)
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const run = async (operation, message) => {
    if (pending.current) return { ok: false }
    pending.current = true
    setBusy(true)
    setError(null)
    try {
      const data = await operation()
      if (mounted.current && message) notify(message)
      return { ok: true, data }
    } catch (failure) {
      if (mounted.current) {
        setError(failure)
        if (failure.status !== 401) notify(failure.message, 'error')
      }
      return { ok: false, error: failure }
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }
  const refresh = async () => workspace.invalidate()
  const mutate = (url, method, body, message) => run(async () => {
    const data = await workspace.api(url, { method, body })
    workspace.invalidate()
    return data
  }, message)
  return { ...workspace, resource, busy, error, run, refresh, mutate, confirm }
}
