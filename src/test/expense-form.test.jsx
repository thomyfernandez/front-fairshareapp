import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UIProvider } from '../components/ui'
import { ExpenseForm } from '../features/gastos/ExpenseForm.jsx'
import { ParticipantsSelector } from '../features/gastos/ParticipantsSelector.jsx'
import { ApiError } from '../api'

const mockMembers = [
  { usuarioId: 1, nombreUsuario: 'Ana', rol: 'ADMIN' },
  { usuarioId: 2, nombreUsuario: 'Carlos', rol: 'MIEMBRO' },
  { usuarioId: 3, nombreUsuario: 'Lucía', rol: 'MIEMBRO' },
]

function renderWithUI(ui) {
  return render(<UIProvider>{ui}</UIProvider>)
}

describe('ExpenseForm & ParticipantsSelector', () => {
  it('ParticipantsSelector: modo EQUITATIVA reparte en partes iguales y muestra estimación en vivo', () => {
    const onChange = vi.fn()
    renderWithUI(
      <ParticipantsSelector
        members={mockMembers}
        tipoReparto="EQUITATIVA"
        monto={1500}
        onChange={onChange}
      />
    )

    // Al inicio los 3 miembros están seleccionados: 1500 / 3 = 500 c/u
    expect(screen.getByText('3 personas · $ 500,00 c/u')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ usuarioId: 1, importe: 500 }),
        expect.objectContaining({ usuarioId: 2, importe: 500 }),
        expect.objectContaining({ usuarioId: 3, importe: 500 }),
      ]),
      expect.objectContaining({ isValid: true })
    )
  })

  it('ParticipantsSelector: modo PORCENTUAL valida en tiempo real que la suma sea exactamente 100%', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    renderWithUI(
      <ParticipantsSelector
        members={mockMembers}
        tipoReparto="PORCENTUAL"
        monto={1000}
        onChange={onChange}
      />
    )

    // Buscamos los inputs de porcentaje
    const inputs = screen.getAllByRole('spinbutton')
    // Cambiamos el primer input a 60 y el segundo a 20 (suma = 80%, falta 20%)
    await user.clear(inputs[0])
    await user.type(inputs[0], '60')
    await user.clear(inputs[1])
    await user.type(inputs[1], '20')
    await user.clear(inputs[2])
    await user.type(inputs[2], '10')

    // Suma = 90%, debe mostrar error en tiempo real
    expect(await screen.findByText(/Falta asignar 10.00%/)).toBeInTheDocument()

    // Ajustamos para que sume 100%
    await user.clear(inputs[2])
    await user.type(inputs[2], '20')

    expect(await screen.findByText('Total: 100% asignado ✓')).toBeInTheDocument()
  })

  it('ParticipantsSelector: modo MONTOS_FIJOS valida que la suma coincida con el total del gasto', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    renderWithUI(
      <ParticipantsSelector
        members={mockMembers}
        tipoReparto="MONTOS_FIJOS"
        monto={1000}
        onChange={onChange}
      />
    )

    const inputs = screen.getAllByRole('spinbutton')
    await user.type(inputs[0], '500')
    await user.type(inputs[1], '300')

    // Suma = 800, faltan 200
    expect(await screen.findByText(/Faltan asignar \$ 200,00 del total/)).toBeInTheDocument()

    // Completamos con 200
    await user.type(inputs[2], '200')
    expect(await screen.findByText('Total: $ 1.000,00 asignado ✓')).toBeInTheDocument()
  })

  it('ExpenseForm: construye y envía la estructura JSON exacta requerida por el backend', async () => {
    const user = userEvent.setup()
    const mockApi = vi.fn().mockResolvedValue({ id: 101, status: 'CREATED' })
    const onSuccess = vi.fn()

    renderWithUI(
      <ExpenseForm
        spaceId="1"
        members={mockMembers}
        api={mockApi}
        onSuccess={onSuccess}
      />
    )

    await user.type(screen.getByLabelText(/^Descripción del gasto/), 'Cena de bienvenida')
    await user.type(screen.getByLabelText(/^Monto total/), '3000')

    // Seleccionar pagador
    await user.selectOptions(screen.getByLabelText(/^¿Quién pagó\?/), '1')

    // Enviar formulario
    await user.click(screen.getByRole('button', { name: 'Registrar gasto' }))

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledTimes(1)
    })

    const [calledPath, calledOptions] = mockApi.mock.calls[0]
    expect(calledPath).toBe('/api/v1/espacios/1/gastos')
    expect(calledOptions.method).toBe('POST')

    const body = calledOptions.body
    expect(body).toEqual({
      descripcion: 'Cena de bienvenida',
      monto: 3000,
      fecha: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      pagadorId: 1,
      tipoReparto: 'EQUITATIVA',
      participantes: [
        { usuarioId: 1, porcentaje: 33.33, importe: 1000 },
        { usuarioId: 2, porcentaje: 33.33, importe: 1000 },
        { usuarioId: 3, porcentaje: 33.33, importe: 1000 },
      ],
    })
    expect(onSuccess).toHaveBeenCalled()
  })

  it('UX Crítica: si la petición falla (ej. error 400), conserva TODOS los datos para que el usuario pueda corregirlos', async () => {
    const user = userEvent.setup()
    const mockApi = vi.fn().mockRejectedValue(
      new ApiError('Error 400: El servicio rechazó la operación.', {
        status: 400,
        code: 'BAD_REQUEST',
        fieldErrors: { descripcion: 'Descripción repetida en el período.' },
      })
    )

    renderWithUI(
      <ExpenseForm
        spaceId="1"
        members={mockMembers}
        api={mockApi}
      />
    )

    const descInput = screen.getByLabelText(/^Descripción del gasto/)
    const montoInput = screen.getByLabelText(/^Monto total/)
    const pagadorSelect = screen.getByLabelText(/^¿Quién pagó\?/)

    await user.type(descInput, 'Supermercado quincenal')
    await user.type(montoInput, '4500.50')
    await user.selectOptions(pagadorSelect, '2')

    // Click en registrar gasto
    await user.click(screen.getByRole('button', { name: 'Registrar gasto' }))

    // Verificar que se mostró el error
    expect(await screen.findByText('Error 400: El servicio rechazó la operación.')).toBeInTheDocument()

    // VERIFICACIÓN CRÍTICA DE UX:
    // Los campos NO deben haberse borrado ni reseteado
    expect(descInput).toHaveValue('Supermercado quincenal')
    expect(montoInput).toHaveValue(4500.5)
    expect(pagadorSelect).toHaveValue('2')

    // El error de campo también debe mostrarse
    expect(screen.getByText('Descripción repetida en el período.')).toBeInTheDocument()
  })
})
