import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UIProvider } from '../components/ui'
import { InviteCard } from '../features/miembros/InviteCard'

describe('InviteCard', () => {
  const writeTextMock = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })
  })

  it('renders nothing when space has no code', () => {
    const { container } = render(
      <UIProvider>
        <InviteCard space={{ id: 1, nombre: 'Casa' }} />
      </UIProvider>
    )
    expect(container.querySelector('.invite-card')).not.toBeInTheDocument()
  })

  it('renders invitation code and copies code to clipboard', async () => {
    const space = { id: 1, nombre: 'Casa', codigo: 'ABC-123' }

    render(
      <UIProvider>
        <InviteCard space={space} />
      </UIProvider>
    )

    expect(screen.getByTestId('invite-code')).toHaveTextContent('ABC-123')
    const copyCodeButton = screen.getByRole('button', { name: /copiar código/i })
    copyCodeButton.click()

    expect(writeTextMock).toHaveBeenCalledWith('ABC-123')
    expect(await screen.findByText('Código de invitación copiado.')).toBeInTheDocument()
  })

  it('copies full invite link with code query parameter', async () => {
    const space = { id: 1, nombre: 'Casa', codigo: 'XYZ-789' }

    render(
      <UIProvider>
        <InviteCard space={space} />
      </UIProvider>
    )

    const copyLinkButton = screen.getByRole('button', { name: /copiar enlace/i })
    copyLinkButton.click()

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('/espacios?unirse=1&codigo=XYZ-789')
    )
    expect(await screen.findByText('Enlace de invitación copiado.')).toBeInTheDocument()
  })
})
