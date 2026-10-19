import { useLayoutEffect } from 'react'

// La raíz incluye también los diálogos y avisos que usan portales.
export function useAppTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement
    const previous = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'dark')
    return () => {
      if (previous === null) root.removeAttribute('data-theme')
      else root.setAttribute('data-theme', previous)
    }
  }, [])
}
