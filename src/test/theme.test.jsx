import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY, resolveTheme } from '../app/theme-preference'
import { useAppTheme, useThemePreference } from '../app/useAppTheme'

afterEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

function systemPrefers(scheme) {
  vi.stubGlobal('matchMedia', query => ({ matches: query === `(prefers-color-scheme: ${scheme})`, addEventListener: () => {}, removeEventListener: () => {} }))
}

function ThemedPage() {
  useAppTheme()
  const { theme, toggleTheme } = useThemePreference()
  return <button onClick={toggleTheme}>Tema actual: {theme}</button>
}

it('usa el tema oscuro de referencia cuando no hay preferencia ni dato del sistema', () => {
  expect(resolveTheme()).toBe('dark')
})

it('respeta la apariencia del sistema si el usuario no eligió un tema', () => {
  systemPrefers('light')
  expect(resolveTheme()).toBe('light')
})

it('prioriza la elección guardada sobre la apariencia del sistema', () => {
  systemPrefers('light')
  window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
  expect(resolveTheme()).toBe('dark')
})

it('ignora valores guardados desconocidos', () => {
  window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia')
  expect(resolveTheme()).toBe('dark')
})

it('cambia el tema del documento, lo recuerda y restaura la raíz al desmontar', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<ThemedPage />)
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  await user.click(screen.getByRole('button', { name: 'Tema actual: dark' }))
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  expect(screen.getByRole('button', { name: 'Tema actual: light' })).toBeInTheDocument()
  unmount()
  expect(document.documentElement).not.toHaveAttribute('data-theme')
})

it('sincroniza el tema cuando cambia en otra pestaña', () => {
  render(<ThemedPage />)
  act(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY }))
  })
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
})
