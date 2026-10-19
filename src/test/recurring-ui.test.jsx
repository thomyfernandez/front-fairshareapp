import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { expect, it, vi } from 'vitest'
import { AppRoutes } from '../app/AppRoutes'
import { UIProvider } from '../components/ui'
import { SessionContext } from '../features/auth/session-context'
import { money, nextMonth } from '../lib/format'

function setup({ templates = [], failUpdate = false } = {}) {
  const api = vi.fn(async (path, options = {}) => {
    if (options.method) {
      if (failUpdate && options.method === 'PUT') throw new Error('No pudimos actualizar la plantilla')
      return { id: 9, ...options.body }
    }
    if (path === '/api/v1/espacios') return [{ id: 1, nombre: 'Casa' }]
    if (path === '/api/v1/espacios/1') return { id: 1, nombre: 'Casa' }
    if (path.endsWith('/miembros')) return [{ usuarioId: 1, nombreUsuario: 'Ana', rol: 'ADMIN' }]
    if (path.endsWith('/favoritos')) return templates
    return []
  })
  render(<MemoryRouter initialEntries={['/espacios/1/recurrentes']}><SessionContext.Provider value={{ session: { usuario: { id: 1, nombre: 'Ana' } }, api }}><UIProvider><AppRoutes /></UIProvider></SessionContext.Provider></MemoryRouter>)
  return api
}

async function createForm(user) {
  await user.click(await screen.findByText('Crear plantilla', { selector: 'summary span' }))
  const form = screen.getByRole('form', { name: 'Crear plantilla recurrente' })
  await user.type(within(form).getByLabelText(/^Nombre/), 'Luz')
  return form
}

it('crea una plantilla sin exigir un importe adicional y envía cero en el contrato existente', async () => {
  const user = userEvent.setup()
  const api = setup()
  const form = await createForm(user)
  expect(within(form).getByLabelText(/^Importe adicional/)).not.toBeVisible()
  fireEvent.change(within(form).getByLabelText(/^Monto del gasto/), { target: { value: '34566' } })
  expect(within(form).getByRole('status')).toHaveTextContent(money(34566).replace(/\s/g, ' '))
  await user.click(within(form).getByRole('button', { name: 'Crear plantilla' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/api/v1/espacios/1/favoritos', expect.objectContaining({ method: 'POST', body: expect.objectContaining({ montoBase: 34566, montoVariable: 0 }) })))
})

it('suma el adicional con centavos y conserva su valor al plegarlo', async () => {
  const user = userEvent.setup()
  const api = setup()
  const form = await createForm(user)
  fireEvent.change(within(form).getByLabelText(/^Monto del gasto/), { target: { value: '1000.50' } })
  await user.click(within(form).getByText('Agregar un importe adicional'))
  const additional = within(form).getByLabelText(/^Importe adicional/)
  fireEvent.change(additional, { target: { value: '350.25' } })
  expect(within(form).getByRole('status')).toHaveTextContent(money(1350.75).replace(/\s/g, ' '))
  await user.click(within(form).getByText('Importe adicional (opcional)'))
  expect(additional).not.toBeVisible()
  expect(within(form).getByRole('status')).toHaveTextContent(money(1350.75).replace(/\s/g, ' '))
  await user.click(within(form).getByRole('button', { name: 'Crear plantilla' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/api/v1/espacios/1/favoritos', expect.objectContaining({ method: 'POST', body: expect.objectContaining({ montoBase: 1000.5, montoVariable: 350.25 }) })))
})

it('muestra los adicionales existentes al actualizar y preserva los importes si falla el envío', async () => {
  const user = userEvent.setup()
  const api = setup({ templates: [{ id: 9, nombre: 'Internet', montoBase: 100, montoVariable: 20, fechaProximaRevision: nextMonth(), vencido: false }], failUpdate: true })
  await user.click(await screen.findByText('Actualizar monto y revisión', { selector: 'summary span' }))
  const form = screen.getByRole('form', { name: 'Actualizar plantilla Internet' })
  const additional = within(form).getByLabelText(/^Importe adicional/)
  expect(additional).toBeVisible()
  expect(additional).toHaveValue(20)
  fireEvent.change(within(form).getByLabelText(/^Monto del gasto/), { target: { value: '200' } })
  expect(within(form).getByRole('status')).toHaveTextContent(money(220).replace(/\s/g, ' '))
  await user.click(within(form).getByRole('button', { name: 'Actualizar' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/api/v1/favoritos/9/actualizar-monto', expect.objectContaining({ method: 'PUT', body: expect.objectContaining({ nuevoMontoBase: 200, nuevoMontoVariable: 20 }) })))
  expect(await screen.findByText('No pudimos actualizar la plantilla')).toBeVisible()
  expect(within(form).getByLabelText(/^Monto del gasto/)).toHaveValue(200)
  expect(additional).toHaveValue(20)
})
