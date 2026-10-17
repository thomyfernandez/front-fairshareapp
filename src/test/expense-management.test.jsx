import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UIProvider } from '../components/ui'
import { ExpenseFilters } from '../features/gastos/ExpenseFilters.jsx'
import { ExpenseDetail } from '../features/gastos/ExpenseDetail.jsx'
import { ExpenseList } from '../features/gastos/ExpenseList.jsx'
import { ExpenseBatchForm } from '../features/gastos/ExpenseBatchForm.jsx'
import { ApiError } from '../api'

const mockMembers = [
  { usuarioId: 1, nombreUsuario: 'Ana', rol: 'ADMIN' },
  { usuarioId: 2, nombreUsuario: 'Carlos', rol: 'MIEMBRO' },
  { usuarioId: 3, nombreUsuario: 'Lucía', rol: 'MIEMBRO' },
]

const mockExpenses = [
  {
    id: 10,
    descripcion: 'Supermercado Mensual',
    monto: 6000,
    fecha: '2026-10-01',
    pagadorId: 1,
    pagadorNombre: 'Ana',
    estado: 'PENDIENTE',
    tipoReparto: 'EQUITATIVA',
    participantes: [
      { usuarioId: 1, usuarioNombre: 'Ana', porcentaje: 33.33, importe: 2000 },
      { usuarioId: 2, usuarioNombre: 'Carlos', porcentaje: 33.33, importe: 2000 },
      { usuarioId: 3, usuarioNombre: 'Lucía', porcentaje: 33.33, importe: 2000 },
    ],
  },
  {
    id: 11,
    descripcion: 'Salida de Pizza',
    monto: 3000,
    fecha: '2026-10-02',
    pagadorId: 2,
    pagadorNombre: 'Carlos',
    estado: 'LIQUIDADO',
    tipoReparto: 'EQUITATIVA',
    participantes: [
      { usuarioId: 1, usuarioNombre: 'Ana', porcentaje: 50, importe: 1500 },
      { usuarioId: 2, usuarioNombre: 'Carlos', porcentaje: 50, importe: 1500 },
    ],
  },
]

function renderWithUI(ui) {
  return render(<UIProvider>{ui}</UIProvider>)
}

describe('ExpenseFilters, ExpenseDetail, ExpenseList & ExpenseBatchForm', () => {
  it('ExpenseFilters: emite cambios de búsqueda y fechas y permite limpiar', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    const onDesdeChange = vi.fn()
    const onClear = vi.fn()

    renderWithUI(
      <ExpenseFilters
        search="Super"
        onSearchChange={onSearchChange}
        desde="2026-10-01"
        onDesdeChange={onDesdeChange}
        onClear={onClear}
        totalResults={1}
      />
    )

    expect(screen.getByDisplayValue('Super')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-10-01')).toBeInTheDocument()
    expect(screen.getByText(/1 resultado encontrado/)).toBeInTheDocument()

    // Clic en limpiar filtros
    const clearButton = screen.getByRole('button', { name: /Limpiar todos los filtros/i })
    await user.click(clearButton)
    expect(onClear).toHaveBeenCalled()
  })

  it('ExpenseDetail: muestra quién pagó y el desglose de los participantes', () => {
    renderWithUI(
      <ExpenseDetail
        gasto={mockExpenses[0]}
        members={mockMembers}
        open={true}
        onClose={vi.fn()}
        asModal={false}
      />
    )

    expect(screen.getByText('Supermercado Mensual')).toBeInTheDocument()
    expect(screen.getByText('$ 6.000,00')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText(/Abonó el importe total/i)).toBeInTheDocument()
    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText('Lucía')).toBeInTheDocument()
  })

  it('ExpenseList: lista gastos y abre modal de confirmación al eliminar', async () => {
    const user = userEvent.setup()

    renderWithUI(
      <ExpenseList
        expenses={mockExpenses}
        members={mockMembers}
        spaceId="1"
      />
    )

    expect(screen.getByText('Supermercado Mensual')).toBeInTheDocument()
    expect(screen.getByText('Salida de Pizza')).toBeInTheDocument()

    // Abrir modal de detalle
    const detalleButtons = screen.getAllByRole('button', { name: /Ver detalle/i })
    await user.click(detalleButtons[0])
    expect(screen.getByText('Desglose del pago y distribución entre miembros.')).toBeInTheDocument()

    // Cerrar detalle
    await user.click(screen.getByRole('button', { name: /Cerrar detalle/i }))

    // Clic en eliminar (gasto 10 es PENDIENTE)
    const deleteButton = screen.getByRole('button', { name: /Eliminar Supermercado Mensual/i })
    await user.click(deleteButton)

    // Modal de confirmación abierto
    expect(screen.getByRole('heading', { name: '¿Eliminar este gasto?' })).toBeInTheDocument()
    expect(screen.getByText(/Esta acción recalculará los balances/i)).toBeInTheDocument()
  })

  it('ExpenseBatchForm: construye y envía un único payload con { gastos: [...] }', async () => {
    const user = userEvent.setup()
    const mockApi = vi.fn().mockResolvedValue({ status: 'OK', count: 2 })
    const onSuccess = vi.fn()

    renderWithUI(
      <ExpenseBatchForm
        spaceId="1"
        members={mockMembers}
        api={mockApi}
        onSuccess={onSuccess}
      />
    )

    expect(screen.getByText('Registro de gastos por lote')).toBeInTheDocument()
    expect(screen.getByText(/Registro transaccional en lote/i)).toBeInTheDocument()

    // Completar el primer gasto
    const descInputs = screen.getAllByLabelText(/^Descripción/)
    const montoInputs = screen.getAllByLabelText(/^Monto/)
    const pagadorSelects = screen.getAllByLabelText(/^Pagó/)

    await user.type(descInputs[0], 'Gasto Lote 1')
    await user.type(montoInputs[0], '1500')
    await user.selectOptions(pagadorSelects[0], '1')

    await user.type(descInputs[1], 'Gasto Lote 2')
    await user.type(montoInputs[1], '2500')
    await user.selectOptions(pagadorSelects[1], '2')

    // Enviar lote
    const submitBtn = screen.getByRole('button', { name: /Registrar lote/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledTimes(1)
    })

    const [calledUrl, calledOpts] = mockApi.mock.calls[0]
    expect(calledUrl).toBe('/api/v1/espacios/1/gastos/lote')
    expect(calledOpts.body).toEqual({
      gastos: expect.arrayContaining([
        expect.objectContaining({ descripcion: 'Gasto Lote 1', monto: 1500 }),
        expect.objectContaining({ descripcion: 'Gasto Lote 2', monto: 2500 }),
      ]),
    })
    expect(onSuccess).toHaveBeenCalled()
  })

  it('ExpenseBatchForm UX: ante un error 400 del servidor, conserva todos los datos ingresados', async () => {
    const user = userEvent.setup()
    const mockApi = vi.fn().mockRejectedValue(
      new ApiError('Error 400: Lote rechazado por datos inconsistentes.', { status: 400 })
    )

    renderWithUI(
      <ExpenseBatchForm
        spaceId="1"
        members={mockMembers}
        api={mockApi}
      />
    )

    const descInputs = screen.getAllByLabelText(/^Descripción/)
    const montoInputs = screen.getAllByLabelText(/^Monto/)

    await user.type(descInputs[0], 'Compra no confirmada')
    await user.type(montoInputs[0], '800')

    const submitBtn = screen.getByRole('button', { name: /Registrar lote/i })
    await user.click(submitBtn)

    // Mensaje de error visible
    expect(await screen.findByText('Error 400: Lote rechazado por datos inconsistentes.')).toBeInTheDocument()

    // Los datos DEBEN preservarse
    expect(descInputs[0]).toHaveValue('Compra no confirmada')
    expect(montoInputs[0]).toHaveValue(800)
  })
})
