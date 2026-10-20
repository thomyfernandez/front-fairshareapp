// Preferencia visual del usuario. Es un ajuste de interfaz, no un dato sensible, por eso se guarda en el navegador.
// index.html replica esta resolución en línea para aplicar el tema antes de la primera pintura.
export const THEME_STORAGE_KEY = 'fairshare.theme'
export const THEMES = ['dark', 'light']
const DEFAULT_THEME = 'dark'

const listeners = new Set()
const systemQuery = () => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null

export function readStoredTheme() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return THEMES.includes(value) ? value : null
  } catch {
    return null
  }
}

// Sin una elección guardada se respeta la apariencia del sistema; la referencia oscura es el valor seguro.
export function resolveTheme() {
  const stored = readStoredTheme()
  if (stored) return stored
  const query = systemQuery()
  if (!query) return DEFAULT_THEME
  return query.matches ? 'light' : 'dark'
}

export function setThemePreference(theme) {
  if (!THEMES.includes(theme)) return
  try { window.localStorage.setItem(THEME_STORAGE_KEY, theme) } catch { /* El tema igual cambia durante la sesión. */ }
  listeners.forEach(listener => listener())
}

export function subscribeToTheme(listener) {
  listeners.add(listener)
  const query = systemQuery()
  const onSystemChange = () => { if (!readStoredTheme()) listener() }
  query?.addEventListener?.('change', onSystemChange)
  const onStorage = event => { if (event.key === THEME_STORAGE_KEY) listener() }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    query?.removeEventListener?.('change', onSystemChange)
    window.removeEventListener('storage', onStorage)
  }
}
