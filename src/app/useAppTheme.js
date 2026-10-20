import { useCallback, useLayoutEffect, useSyncExternalStore } from 'react'
import { resolveTheme, setThemePreference, subscribeToTheme } from './theme-preference'

// Lee la preferencia vigente sin modificar el documento; la usan los controles que cambian el tema.
export function useThemePreference() {
  const theme = useSyncExternalStore(subscribeToTheme, resolveTheme, () => 'dark')
  const toggleTheme = useCallback(() => setThemePreference(theme === 'dark' ? 'light' : 'dark'), [theme])
  return { theme, toggleTheme }
}

// Solo los layouts aplican el tema. La raíz incluye también los diálogos y avisos que usan portales.
export function useAppTheme() {
  const { theme } = useThemePreference()
  useLayoutEffect(() => {
    const root = document.documentElement
    const previous = root.getAttribute('data-theme')
    root.setAttribute('data-theme', theme)
    return () => {
      if (previous === null) root.removeAttribute('data-theme')
      else root.setAttribute('data-theme', previous)
    }
  }, [theme])
}
