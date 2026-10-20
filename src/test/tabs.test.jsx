import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { Tabs } from '../components/ui'

function Example() {
  const [value, setValue] = useState('pending')
  return <Tabs label="Cierres" value={value} onChange={setValue} items={[{ value: 'pending', label: 'Pendientes', count: 4, content: <label>Nota<input /></label> }, { value: 'history', label: 'Historial', content: <p>Cierres anteriores</p> }]} />
}
it('supports arrow keys, Home and End with correct focus and preserves entered form data', async () => {
  const user = userEvent.setup({ delay: null })
  render(<Example />)
  await user.type(screen.getByLabelText('Nota'), 'Cierre de casa')
  await user.click(screen.getByRole('tab', { name: 'Pendientes' }))
  await user.keyboard('{ArrowRight}')
  expect(screen.getByRole('tab', { name: 'Historial' })).toHaveFocus()
  expect(screen.getByRole('tab', { name: 'Historial' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  await user.keyboard('{Home}')
  expect(screen.getByRole('tab', { name: 'Pendientes' })).toHaveFocus()
  expect(screen.getByLabelText('Nota')).toHaveValue('Cierre de casa')
  await user.keyboard('{End}')
  expect(screen.getByRole('tab', { name: 'Historial' })).toHaveFocus()
})
