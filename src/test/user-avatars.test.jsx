import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Avatar, AvatarPickerModal } from '../components/ui'
import { isUserAvatar, userAvatarChoices } from '../components/ui/user-avatars'
import { clearAvatarsMemory, readAvatar, saveAvatar } from '../lib/avatar-storage'

describe('User Avatars and AvatarPickerModal', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAvatarsMemory()
  })

  afterEach(() => {
    localStorage.clear()
    clearAvatarsMemory()
  })

  it('valida la lista de avatares disponibles incluyendo carpincho y tero', () => {
    expect(userAvatarChoices.length).toBeGreaterThanOrEqual(18)
    expect(isUserAvatar('carpincho')).toBe(true)
    expect(isUserAvatar('tero')).toBe(true)
    expect(isUserAvatar('astro')).toBe(true)
    expect(isUserAvatar('inexistente')).toBe(false)
  })

  it('guarda y recupera avatares de usuario correctamente', () => {
    expect(readAvatar(42)).toBeNull()
    saveAvatar(42, 'carpincho')
    expect(readAvatar(42)).toBe('carpincho')
    saveAvatar(42, null)
    expect(readAvatar(42)).toBeNull()
  })

  it('renderiza iniciales cuando no hay avatar seleccionado', () => {
    const { container } = render(<Avatar name="Ana Ruiz" />)
    const avatar = container.querySelector('.ui-avatar')
    expect(avatar).toHaveTextContent('AR')
    expect(avatar.querySelector('img')).toBeNull()
  })

  it('renderiza la imagen del avatar cuando se especifica avatarId', () => {
    const { container } = render(<Avatar name="Ana Ruiz" avatar="carpincho" />)
    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/avatars/carpincho.svg')
  })

  it('renderiza el avatar guardado cuando se especifica userId', () => {
    saveAvatar(10, 'tero')
    const { container } = render(<Avatar name="Thomas Fernandez" userId={10} />)
    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/avatars/tero.svg')
  })

  it('AvatarPickerModal permite seleccionar y guardar un nuevo avatar', async () => {
    const user = userEvent.setup()
    let closed = false

    render(
      <AvatarPickerModal
        open={true}
        onClose={() => { closed = true }}
        userId={5}
        userName="Sol Gomez"
      />
    )

    expect(screen.getByRole('heading', { name: 'Elegí tu avatar' })).toBeInTheDocument()

    // Clic en la opción Carpincho
    const carpinchoBtn = screen.getByRole('button', { name: /seleccionar avatar: carpincho/i })
    await user.click(carpinchoBtn)
    expect(carpinchoBtn).toHaveAttribute('aria-pressed', 'true')

    // Guardar
    const saveBtn = screen.getByRole('button', { name: 'Guardar avatar' })
    await user.click(saveBtn)

    expect(readAvatar(5)).toBe('carpincho')
    expect(closed).toBe(true)
  })

  it('AvatarPickerModal permite volver a iniciales clásicas', async () => {
    saveAvatar(7, 'beat')
    const user = userEvent.setup()

    render(
      <AvatarPickerModal
        open={true}
        onClose={() => {}}
        userId={7}
        userName="Lucas Perez"
      />
    )

    const initialsBtn = screen.getByRole('button', { name: /seleccionar avatar: iniciales/i })
    await user.click(initialsBtn)

    const saveBtn = screen.getByRole('button', { name: 'Guardar avatar' })
    await user.click(saveBtn)

    expect(readAvatar(7)).toBeNull()
  })
})
