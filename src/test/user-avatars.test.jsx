import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { Avatar, AvatarPickerModal, UIProvider } from '../components/ui'
import { isUserAvatar, userAvatarChoices } from '../components/ui/user-avatars'
import { WorkspaceContext } from '../app/workspace-context'
import { UserMenu } from '../features/auth/UserMenu'
import { SessionContext } from '../features/auth/session-context'
import { SessionProvider } from '../features/auth/SessionProvider'
import { useSession } from '../features/auth/useSession'

it('valida el catálogo y usa iniciales si la API no devuelve un avatar reconocido', () => {
  expect(userAvatarChoices).toHaveLength(18)
  expect(isUserAvatar('carpincho')).toBe(true)
  expect(isUserAvatar('tero')).toBe(true)
  expect(isUserAvatar('../otro.svg')).toBe(false)
  const { container, rerender } = render(<Avatar name="Ana Ruiz" avatarId={null} />)
  expect(container.querySelector('.ui-avatar')).toHaveTextContent('AR')
  rerender(<Avatar name="Ana Ruiz" avatarId="no-existe" />)
  expect(container.querySelector('img')).toBeNull()
  rerender(<Avatar name="Ana Ruiz" avatarId="carpincho" />)
  expect(container.querySelector('img')).toHaveAttribute('src', '/avatars/carpincho.svg')
})

it('ignora las preferencias anteriores del navegador y usa el valor confirmado por la API', () => {
  localStorage.setItem('fairshare:avatar:v1:1', 'carpincho')
  const { container, rerender } = render(<Avatar name="Ana Ruiz" userId={1} avatarId={null} />)
  expect(container.querySelector('img')).toBeNull()
  rerender(<Avatar name="Ana Ruiz" avatarId="tero" />)
  expect(container.querySelector('img')).toHaveAttribute('src', '/avatars/tero.svg')
  localStorage.removeItem('fairshare:avatar:v1:1')
})

it('espera la confirmación del guardado y bloquea envíos duplicados', async () => {
  const user = userEvent.setup({ delay: null })
  let resolve
  const onSave = vi.fn(() => new Promise(done => { resolve = done }))
  const onClose = vi.fn()
  render(<AvatarPickerModal open userId={1} userName="Ana Ruiz" value="carpincho" onSave={onSave} onClose={onClose} />)
  await user.click(screen.getByRole('button', { name: 'Seleccionar avatar: Tero' }))
  await user.click(screen.getByRole('button', { name: 'Guardar avatar' }))
  expect(onSave).toHaveBeenCalledWith('tero')
  expect(onClose).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Seleccionar avatar: Tero' })).toBeDisabled()
  const pending = screen.getByRole('button', { name: 'Guardar avatar' })
  expect(pending).toBeDisabled()
  fireEvent.click(pending)
  expect(onSave).toHaveBeenCalledTimes(1)
  await act(async () => resolve())
  expect(onClose).toHaveBeenCalledTimes(1)
})

it('un error mantiene la selección, permite reintentar y puede restaurar iniciales con null', async () => {
  const user = userEvent.setup({ delay: null })
  const onSave = vi.fn().mockRejectedValueOnce(new Error('No pudimos guardar tu avatar')).mockResolvedValue({ avatarId: null })
  const onClose = vi.fn()
  render(<AvatarPickerModal open userId={1} value="carpincho" onSave={onSave} onClose={onClose} />)
  await user.click(screen.getByRole('button', { name: 'Seleccionar avatar: Iniciales' }))
  await user.click(screen.getByRole('button', { name: 'Guardar avatar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar tu avatar')
  expect(screen.getByRole('button', { name: 'Seleccionar avatar: Iniciales' })).toHaveAttribute('aria-pressed', 'true')
  expect(onClose).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Guardar avatar' }))
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  expect(onSave.mock.calls).toEqual([[null], [null]])
})

it('cancelar descarta la selección provisional y al reabrir recupera el avatar de la cuenta', async () => {
  const user = userEvent.setup({ delay: null })
  const onSave = vi.fn()
  function Picker() {
    const [open, setOpen] = useState(false)
    return <><button onClick={() => setOpen(true)}>Abrir avatar</button><AvatarPickerModal open={open} onClose={() => setOpen(false)} userId={42} value="carpincho" onSave={onSave} userName="Ana Ruiz" /></>
  }
  render(<Picker />)
  await user.click(screen.getByRole('button', { name: 'Abrir avatar' }))
  await user.click(screen.getByRole('button', { name: 'Seleccionar avatar: Astro' }))
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(onSave).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Abrir avatar' }))
  expect(screen.getByRole('button', { name: 'Seleccionar avatar: Carpincho' })).toHaveAttribute('aria-pressed', 'true')
})

it('el selector se reinicia al cambiar de cuenta', () => {
  const { rerender } = render(<AvatarPickerModal open userId={1} value="carpincho" onClose={() => {}} />)
  expect(screen.getByRole('button', { name: 'Seleccionar avatar: Carpincho' })).toHaveAttribute('aria-pressed', 'true')
  rerender(<AvatarPickerModal open userId={2} value="tero" onClose={() => {}} />)
  expect(screen.getByRole('button', { name: 'Seleccionar avatar: Tero' })).toHaveAttribute('aria-pressed', 'true')
})

const profile = { id: 1, nombre: 'Ana', apellido: 'Ruiz', email: 'ana@example.test', avatarId: 'carpincho' }
function AccountProbe() {
  const { session, signIn, signOut, updateAvatar } = useSession()
  const [error, setError] = useState('')
  return <>
    <button onClick={() => signIn({ token: 'token-a', usuario: profile })}>Ingresar Ana</button>
    <button onClick={() => { signOut(); signIn({ token: 'token-b', usuario: { ...profile, id: 2, avatarId: 'tero' } }) }}>Cambiar cuenta</button>
    <button onClick={() => updateAvatar('astro').catch(failure => setError(failure.message))}>Actualizar</button>
    <output>{session?.usuario?.avatarId}</output><span>{error}</span>
  </>
}

it('la sesión actualiza el avatar con PATCH autenticado después de la respuesta del servidor', async () => {
  const user = userEvent.setup({ delay: null })
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ ...profile, avatarId: 'astro' }), { status: 200 }))
  vi.stubGlobal('fetch', fetcher)
  render(<SessionProvider><AccountProbe /></SessionProvider>)
  await user.click(screen.getByRole('button', { name: 'Ingresar Ana' }))
  await user.click(screen.getByRole('button', { name: 'Actualizar' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('astro'))
  expect(fetcher).toHaveBeenCalledWith('/api/v1/usuarios/me/avatar', expect.objectContaining({ method: 'PATCH', headers: expect.objectContaining({ Authorization: 'Bearer token-a' }), body: JSON.stringify({ avatarId: 'astro' }) }))
})

it('una respuesta pendiente no modifica otra cuenta si la sesión cambia durante el envío', async () => {
  const user = userEvent.setup({ delay: null })
  let resolve
  vi.stubGlobal('fetch', vi.fn(() => new Promise(done => { resolve = done })))
  render(<SessionProvider><AccountProbe /></SessionProvider>)
  await user.click(screen.getByRole('button', { name: 'Ingresar Ana' }))
  await user.click(screen.getByRole('button', { name: 'Actualizar' }))
  await user.click(screen.getByRole('button', { name: 'Cambiar cuenta' }))
  await act(async () => resolve(new Response(JSON.stringify({ ...profile, avatarId: 'astro' }), { status: 200 })))
  expect(screen.getByRole('status')).toHaveTextContent('tero')
  expect(screen.getByText('La sesión cambió. Volvé a abrir tu cuenta.')).toBeVisible()
})


it('al cerrar el selector devuelve el foco al menú de cuenta visible', async () => {
  const user = userEvent.setup({ delay: null })
  render(<MemoryRouter><UIProvider><WorkspaceContext.Provider value={{ invalidate: vi.fn() }}><SessionContext.Provider value={{ session: { usuario: profile }, signOut: vi.fn(), updateAvatar: vi.fn() }}><UserMenu compact /></SessionContext.Provider></WorkspaceContext.Provider></UIProvider></MemoryRouter>)
  const trigger = screen.getByText('Mi cuenta', { selector: 'summary' })
  await user.click(trigger)
  await user.click(screen.getByRole('button', { name: 'Elegir avatar' }))
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  await waitFor(() => expect(trigger).toHaveFocus())
})
