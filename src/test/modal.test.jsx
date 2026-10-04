import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Button, Modal } from '../components/ui'

it('labels the dialog, allows Escape and restores focus to its opener', async () => {
  function Example() {
    const [open, setOpen] = useState(false)
    return <><Button onClick={() => setOpen(true)}>Abrir</Button><Modal open={open} title="Revisar operación" onClose={() => setOpen(false)} footer={<Button data-autofocus onClick={() => setOpen(false)}>Cancelar</Button>}><p>Revisá los datos.</p></Modal></>
  }
  render(<Example />)
  const trigger = screen.getByRole('button', { name: 'Abrir' })
  await userEvent.click(trigger)
  const dialog = screen.getByRole('dialog', { name: 'Revisar operación' })
  expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  fireEvent.keyDown(screen.getByRole('button', { name: 'Cancelar' }), { key: 'Tab' })
  expect(screen.getByRole('button', { name: 'Cerrar diálogo' })).toHaveFocus()
  fireEvent.keyDown(screen.getByRole('button', { name: 'Cerrar diálogo' }), { key: 'Tab', shiftKey: true })
  expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

it('does not dismiss an operation when dismissal is disabled', () => {
  const close = vi.fn()
  render(<Modal open title="Procesando" dismissible={false} onClose={close}>Esperá.</Modal>)
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
  expect(close).not.toHaveBeenCalled()
})
