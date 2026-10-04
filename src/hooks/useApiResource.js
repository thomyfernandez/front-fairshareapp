import { useCallback, useEffect, useRef, useState } from 'react'

const EMPTY = []

// A request belongs to its URL and API instance. Old responses cannot replace a new space/session.
export function useApiResource(api, path, { initialData = EMPTY, revision = 0 } = {}) {
  const fallback = useRef(initialData)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ path: null, api: null, data: fallback.current, error: null, loading: false })
  useEffect(() => {
    if (!path) return
    let active = true
    const controller = new AbortController()
    setState(previous => ({
      path, api, data: previous.path === path && previous.api === api ? previous.data : fallback.current,
      error: null, loading: true,
    }))
    api(path, { signal: controller.signal }).then(data => {
      if (active) setState({ path, api, data: data ?? fallback.current, error: null, loading: false })
    }).catch(error => {
      if (active && error.name !== 'AbortError') setState({ path, api, data: fallback.current, error, loading: false })
    })
    return () => { active = false; controller.abort() }
  }, [api, path, revision, attempt])
  const reload = useCallback(() => setAttempt(value => value + 1), [])
  const belongsHere = path && state.path === path && state.api === api
  return {
    data: belongsHere ? state.data : fallback.current,
    error: belongsHere ? state.error : null,
    loading: Boolean(path) && (!belongsHere || state.loading), reload,
  }
}
