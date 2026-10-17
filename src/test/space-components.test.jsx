import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { UIProvider } from '../components/ui'
import { InvitationCode } from '../features/espacios/InvitationCode'
import { SpaceCard } from '../features/espacios/SpaceCard'

describe('InvitationCode component', () => {
  const writeTextMock = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })
  })

  it('renders nothing when code is not provided', () => {
    const { container } = render(
      <UIProvider>
        <InvitationCode code="" />
      </UIProvider>
    )
    expect(container.querySelector('.invite-code-box')).not.toBeInTheDocument()
  })

  it('renders code and handles copy action', async () => {
    render(
      <UIProvider>
        <InvitationCode code="ESPACIO-999" spaceName="Casa Quinta" />
      </UIProvider>
    )

    expect(screen.getByTestId('invite-code')).toHaveTextContent('ESPACIO-999')
    const copyButton = screen.getByRole('button', { name: /copiar código/i })
    copyButton.click()

    expect(writeTextMock).toHaveBeenCalledWith('ESPACIO-999')
    expect(await screen.findByText('Código de invitación copiado.')).toBeInTheDocument()
  })
})

describe('SpaceCard component', () => {
  it('renders space details correctly', () => {
    const mockSpace = {
      id: 10,
      nombre: 'Viaje a Bariloche',
      descripcion: 'Vacaciones de invierno con amigos.',
      tipo: 'VIAJE',
      presupuestoBase: 500000,
      reglaReparto: 'PROPORCIONAL',
      codigo: 'BARI-2026',
    }

    render(
      <MemoryRouter>
        <UIProvider>
          <SpaceCard space={mockSpace} />
        </UIProvider>
      </MemoryRouter>
    )

    expect(screen.getByText('Viaje a Bariloche')).toBeInTheDocument()
    expect(screen.getByText('Vacaciones de invierno con amigos.')).toBeInTheDocument()
    expect(screen.getByText('Viaje')).toBeInTheDocument()
    expect(screen.getByText('Proporcional')).toBeInTheDocument()
    expect(screen.getByText('BARI-2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /abrir espacio viaje a bariloche/i })).toHaveAttribute(
      'href',
      '/espacios/10/resumen'
    )
  })
})
