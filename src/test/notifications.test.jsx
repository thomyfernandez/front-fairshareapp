import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { UIProvider, useUI } from '../components/ui'

function Trigger() {
  const { notify } = useUI()
  return <><button onClick={() => notify('Plantilla creada.')}>Crear</button><button onClick={() => notify('Plantilla actualizada.')}>Actualizar</button><button onClick={() => notify('No pudimos guardar.', 'error')}>Error</button></>
}
const advance = ms => act(() => { vi.advanceTimersByTime(ms) })
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())
const setup = () => render(<UIProvider><Trigger /></UIProvider>)

it('cierra cada notificación después de sus propios cinco segundos', () => {
  setup()
  fireEvent.click(screen.getByText('Crear'))
  advance(3000)
  fireEvent.click(screen.getByText('Actualizar'))
  advance(1999)
  expect(screen.getByText('Plantilla creada.')).toBeVisible()
  advance(1)
  expect(screen.queryByText('Plantilla creada.')).not.toBeInTheDocument()
  expect(screen.getByText('Plantilla actualizada.')).toBeVisible()
  advance(3000)
  expect(screen.queryByText('Plantilla actualizada.')).not.toBeInTheDocument()
})

it('pausa mientras se lee con el cursor o se enfoca con teclado y retoma el tiempo restante', () => {
  setup()
  fireEvent.click(screen.getByText('Crear'))
  advance(2000)
  const notice = screen.getByText('Plantilla creada.').closest('.ui-notice')
  fireEvent.mouseEnter(notice)
  advance(10000)
  fireEvent.focus(screen.getByRole('button', { name: 'Cerrar notificación' }))
  fireEvent.mouseLeave(notice)
  advance(10000)
  expect(screen.getByText('Plantilla creada.')).toBeVisible()
  fireEvent.blur(screen.getByRole('button', { name: 'Cerrar notificación' }), { relatedTarget: screen.getByText('Crear') })
  advance(2999)
  expect(screen.getByText('Plantilla creada.')).toBeVisible()
  advance(1)
  expect(screen.queryByText('Plantilla creada.')).not.toBeInTheDocument()
})

it('permite cerrar manualmente y limpia los temporizadores al desmontar', () => {
  const view = setup()
  fireEvent.click(screen.getByText('Error'))
  expect(screen.getByRole('alert')).toHaveTextContent('No pudimos guardar.')
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(vi.getTimerCount()).toBe(0)
  fireEvent.click(screen.getByText('Crear'))
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
})
