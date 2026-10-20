import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, it } from 'vitest'
import { Brand } from '../app/Sidebar'

it('muestra el isotipo F igual sin alterar el nombre accesible del enlace al inicio', () => {
  render(<MemoryRouter><Brand /></MemoryRouter>)
  const link = screen.getByRole('link', { name: 'FairShare, ir al inicio' })
  expect(link).toHaveAttribute('href', '/')
  const mark = link.querySelector('svg.brand-mark')
  expect(mark).toHaveAttribute('aria-hidden', 'true')
  expect(link).toHaveTextContent(/^fairshare\.$/)
})
