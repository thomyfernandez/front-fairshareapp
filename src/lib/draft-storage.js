const prefix = 'fairshare:draft:v1:'
const memory = new Map()
export const draftKey = (userId, spaceId, kind) => `${prefix}${userId}:${spaceId}:${kind}`

export function readDraft(userId, spaceId, kind) {
  if (!userId || !spaceId) return null
  const key = draftKey(userId, spaceId, kind)
  if (memory.has(key)) return memory.get(key)
  try {
    const raw = sessionStorage.getItem(key)
    if (raw) {
      const data = JSON.parse(raw)
      if (data && data.version === 1 && data.value && typeof data.value === 'object') return data.value
      sessionStorage.removeItem(key)
    }
  } catch { /* El almacenamiento puede estar deshabilitado; se conserva en memoria. */ }
  return memory.get(key) || null
}

export function saveDraft(userId, spaceId, kind, value) {
  if (!userId || !spaceId) return 'unavailable'
  const key = draftKey(userId, spaceId, kind)
  memory.set(key, value)
  try {
    sessionStorage.setItem(key, JSON.stringify({ version: 1, value }))
    return 'tab'
  } catch {
    try { sessionStorage.removeItem(key) } catch { /* Evita retomar una copia anterior si se agotó el espacio. */ }
    return 'memory'
  }
}

export function removeDraft(userId, spaceId, kind) {
  const key = draftKey(userId, spaceId, kind)
  memory.set(key, null)
  try { sessionStorage.removeItem(key) } catch { /* La copia en memoria ya se eliminó. */ }
}

export function clearSessionDrafts() {
  memory.clear()
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(prefix)) sessionStorage.removeItem(key)
  } catch { /* No existe almacenamiento persistente disponible. */ }
}
