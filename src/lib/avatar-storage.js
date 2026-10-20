import { isUserAvatar } from '../components/ui/user-avatars'

const prefix = 'fairshare:avatar:v1:'
const memory = new Map()
const listeners = new Set()

export const avatarKey = (userId) => `${prefix}${userId}`

export function readAvatar(userId) {
  if (!userId) return null
  const key = avatarKey(userId)
  if (memory.has(key)) return memory.get(key)
  try {
    const raw = localStorage.getItem(key)
    if (raw && isUserAvatar(raw)) {
      memory.set(key, raw)
      return raw
    }
  } catch {
    // Si localStorage no está disponible, se utiliza memoria.
  }
  return null
}

export function saveAvatar(userId, avatarId) {
  if (!userId) return
  const key = avatarKey(userId)
  const valid = isUserAvatar(avatarId) ? avatarId : null
  if (valid) {
    memory.set(key, valid)
    try {
      localStorage.setItem(key, valid)
    } catch {
      // Almacenamiento restringido
    }
  } else {
    memory.delete(key)
    try {
      localStorage.removeItem(key)
    } catch {
      // Almacenamiento restringido
    }
  }
  listeners.forEach(fn => {
    try {
      fn(userId, valid)
    } catch {
      // Ignorar errores en callbacks
    }
  })
}

export function subscribeAvatarChanges(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function clearAvatarsMemory() {
  memory.clear()
}
