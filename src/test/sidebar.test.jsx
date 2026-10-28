import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { AppLayout } from '../app/AppLayout'
import { WorkspaceContext } from '../app/workspace-context'
import { SessionContext } from '../features/auth/session-context'
import { UIProvider } from '../components/ui'
import { storeWrapper } from './store-wrapper'

it('permite ocultar y reabrir la navegación con teclado sin dejar el foco en contenido oculto', async () => {
  localStorage.removeItem('fairshare:sidebar-collapsed')
  const user = userEvent.setup({ delay: null })
  const session = { usuario: { id: 1, nombre: 'Ana', apellido: 'Ruiz' } }
  const workspace = { session, spaceId: '1', space: { nombre: 'Nuestro hogar' }, spaces: [], spacesState: {} }
  const { container } = render(<MemoryRouter initialEntries={['/espacios/1/miembros']}><UIProvider><SessionContext.Provider value={{ session, signOut: vi.fn() }}><WorkspaceContext.Provider value={workspace}><AppLayout /></WorkspaceContext.Provider></SessionContext.Provider></UIProvider></MemoryRouter>, storeWrapper())
  const sidebar = container.querySelector('#desktop-sidebar')
  const close = within(sidebar).getByRole('button', { name: 'Ocultar barra lateral' })
  await user.click(close)
  const open = screen.getByRole('button', { name: 'Mostrar barra lateral' })
  expect(open).toHaveFocus()
  expect(open).toHaveAttribute('aria-controls', sidebar.id)
  expect(open).toHaveAttribute('aria-expanded', 'false')
  expect(sidebar).toHaveAttribute('inert')
  expect(localStorage.getItem('fairshare:sidebar-collapsed')).toBe('true')
  await user.keyboard('{Enter}')
  expect(sidebar).not.toHaveAttribute('inert')
  expect(close).toHaveFocus()
  expect(close).toHaveAttribute('aria-expanded', 'true')
  expect(localStorage.getItem('fairshare:sidebar-collapsed')).toBe('false')
  localStorage.removeItem('fairshare:sidebar-collapsed')
})
