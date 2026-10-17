import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { UIProvider } from '../components/ui'
import { CreateSpaceForm } from '../features/espacios/CreateSpaceForm'
import { JoinSpaceForm } from '../features/espacios/JoinSpaceForm'
import SpaceSettings from '../features/espacios/SpaceSettings'

// Mocking useFeature hook for SpaceSettings test
vi.mock('../hooks/useFeature', () => ({
  useFeature: vi.fn(),
}))

import { useFeature } from '../hooks/useFeature'

describe('CreateSpaceForm', () => {
  it('renders correctly with default fields and explanation', () => {
    render(
      <UIProvider>
        <CreateSpaceForm />
      </UIProvider>
    )

    expect(screen.getByLabelText(/nombre del espacio/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/modalidad de reparto inicial/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/presupuesto base inicial/i)).toBeInTheDocument()
    expect(screen.getByText(/todos los participantes aportan la misma parte/i)).toBeInTheDocument()
  })

  it('submits parsed data on form submission', () => {
    const handleSubmit = vi.fn()
    render(
      <UIProvider>
        <CreateSpaceForm onSubmit={handleSubmit} />
      </UIProvider>
    )

    fireEvent.change(screen.getByLabelText(/nombre del espacio/i), {
      target: { value: 'Depto 4B' },
    })
    fireEvent.change(screen.getByLabelText(/presupuesto base inicial/i), {
      target: { value: '75000' },
    })

    fireEvent.click(screen.getByRole('button', { name: /crear espacio/i }))

    expect(handleSubmit).toHaveBeenCalledTimes(1)
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Depto 4B',
        presupuestoBase: 75000,
      })
    )
  })

  it('disables submit button and shows error when budget is negative', () => {
    render(
      <UIProvider>
        <CreateSpaceForm />
      </UIProvider>
    )

    const budgetInput = screen.getByLabelText(/presupuesto base inicial/i)
    fireEvent.change(budgetInput, { target: { value: '-100' } })

    expect(screen.getByText(/el presupuesto base no puede ser negativo/i)).toBeInTheDocument()
    const submitButton = screen.getByRole('button', { name: /crear espacio/i })
    expect(submitButton).toBeDisabled()
  })

  it('prevents minus key on keydown and blocks malformed numbers', () => {
    render(
      <UIProvider>
        <CreateSpaceForm />
      </UIProvider>
    )

    const budgetInput = screen.getByLabelText(/presupuesto base inicial/i)
    const event = new KeyboardEvent('keydown', { key: '-', bubbles: true, cancelable: true })
    const notPrevented = budgetInput.dispatchEvent(event)
    expect(notPrevented).toBe(false)

    fireEvent.change(budgetInput, { target: { value: '0-1' } })
    const submitButton = screen.getByRole('button', { name: /crear espacio/i })
    expect(submitButton).toBeDisabled()
  })
})

describe('JoinSpaceForm', () => {
  it('pre-fills initial code and transforms to uppercase on submit', () => {
    const handleSubmit = vi.fn()
    render(
      <UIProvider>
        <JoinSpaceForm initialCode="abc-123" onSubmit={handleSubmit} />
      </UIProvider>
    )

    const input = screen.getByLabelText(/código de invitación/i)
    expect(input).toHaveValue('ABC-123')

    fireEvent.change(input, { target: { value: 'xyz-789' } })
    fireEvent.click(screen.getByRole('button', { name: /unirme al espacio/i }))

    expect(handleSubmit).toHaveBeenCalledWith({
      codigo: 'XYZ-789',
    })
  })
})

describe('SpaceSettings', () => {
  const mockSpace = {
    id: 1,
    nombre: 'Convivencia',
    descripcion: 'Gastos del mes',
    tipo: 'HOGAR',
    reglaReparto: 'CINCUENTA_CINCUENTA',
    presupuestoBase: 120000,
    codigo: 'CONV-123',
  }

  it('renders read-only view when user is not admin', () => {
    useFeature.mockReturnValue({
      space: mockSpace,
      spaceId: 1,
      session: { usuario: { id: 2, nombre: 'Juan' } },
      isAdmin: false,
      api: vi.fn(),
      run: vi.fn(),
      invalidate: vi.fn(),
      confirm: vi.fn(),
      busy: false,
      error: null,
    })

    render(
      <MemoryRouter>
        <UIProvider>
          <SpaceSettings />
        </UIProvider>
      </MemoryRouter>
    )

    expect(screen.getByText(/estás visualizando la configuración como miembro/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /guardar cambios/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /eliminar este espacio/i })).not.toBeInTheDocument()
    expect(screen.getByTestId('invite-code')).toHaveTextContent('CONV-123')
  })

  it('renders full editing form and danger zone when user is admin', () => {
    useFeature.mockReturnValue({
      space: mockSpace,
      spaceId: 1,
      session: { usuario: { id: 1, nombre: 'Admin' } },
      isAdmin: true,
      api: vi.fn(),
      run: vi.fn(),
      invalidate: vi.fn(),
      confirm: vi.fn(),
      busy: false,
      error: null,
    })

    render(
      <MemoryRouter>
        <UIProvider>
          <SpaceSettings />
        </UIProvider>
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /eliminar este espacio/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/nombre del espacio/i)).toHaveValue('Convivencia')
  })
})
