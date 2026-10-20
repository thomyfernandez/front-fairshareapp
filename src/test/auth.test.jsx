import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../app/AppRoutes'
import { UIProvider } from '../components/ui'
import { SessionProvider } from '../features/auth/SessionProvider'
import { tokenExpiry } from '../features/auth/session'

const base64url = value => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const jwt = exp => `${base64url({ alg: 'HS256' })}.${base64url({ sub: 'ana@example.test', exp })}.firma`

// Mirrors the backend contract: errors are plain-text bodies, registration answers "OK".
function mockApi({ login = () => [200, { token: 'test-token', email: 'ana@example.test', nombre: 'Ana', apellido: 'Pérez' }], registro = () => [201, 'OK'] } = {}) {
  const fetcher = vi.fn(async (url, options = {}) => {
    const path = url.split('?')[0]
    if (path.endsWith('/login')) {
      const [status, body] = login(JSON.parse(options.body))
      return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
    }
    if (path.endsWith('/registro')) {
      const result = registro(JSON.parse(options.body))
      if (result instanceof Error) throw result
      return new Response(result[1], { status: result[0] })
    }
    return new Response('[]', { status: 200 })
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}
function RouteProbe() {
  return <output data-testid="route">{useLocation().pathname}</output>
}
function setup(route = '/login', options) {
  const fetcher = mockApi(options)
  render(<MemoryRouter initialEntries={[route]}><UIProvider><SessionProvider><AppRoutes /><RouteProbe /></SessionProvider></UIProvider></MemoryRouter>)
  return { fetcher, user: userEvent.setup({ delay: null }) }
}
const email = () => screen.getByRole('textbox', { name: /^Email/ })
const password = () => screen.getByLabelText(/^Contraseña/)

afterEach(() => vi.useRealTimers())

describe('login', () => {
  it('shows errors next to each field without calling the server', async () => {
    const { fetcher, user } = setup()
    await user.click(await screen.findByRole('button', { name: 'Iniciar sesión' }))
    expect(screen.getByText('Ingresá tu email.')).toBeInTheDocument()
    expect(screen.getByText('Ingresá tu contraseña.')).toBeInTheDocument()
    expect(email()).toHaveFocus()
    expect(email()).toHaveAccessibleDescription('Ingresá tu email.')
    await user.type(email(), 'ana@')
    await user.tab()
    expect(screen.getByText(/Ingresá un email válido/)).toBeInTheDocument()
    await user.type(email(), 'example.test')
    expect(screen.queryByText(/Ingresá un email válido/)).not.toBeInTheDocument()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('explains wrong credentials and keeps the email typed', async () => {
    const { user } = setup('/login', { login: () => [401, 'Email o contraseña incorrectos'] })
    await user.type(email(), 'ana@example.test')
    await user.type(password(), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('El email o la contraseña no son correctos.')
    expect(email()).toHaveValue('ana@example.test')
    expect(screen.getByTestId('route')).toHaveTextContent('/login')
  })

  it('explains server and connection failures', async () => {
    const { user } = setup('/login', { login: () => [500, 'Ocurrio un error inesperado'] })
    await user.type(email(), 'ana@example.test')
    await user.type(password(), 'password-test')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('El servicio no está disponible en este momento.')
  })

  it('toggles password visibility from the keyboard without losing the value', async () => {
    const { user } = setup()
    await user.type(password(), 'secreto123')
    expect(password()).toHaveAttribute('type', 'password')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(password()).toHaveAttribute('type', 'text')
    expect(password()).toHaveValue('secreto123')
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeInTheDocument()
  })

  it('signs out from the user menu and confirms it on the login screen', async () => {
    const { user } = setup()
    await user.type(email(), 'ana@example.test')
    await user.type(password(), 'password-test')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await user.click(await screen.findByLabelText('Cuenta de Ana'))
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByText('Cerraste sesión correctamente.')).toBeInTheDocument()
    expect(screen.getByTestId('route')).toHaveTextContent('/login')
    expect(email()).toHaveValue('ana@example.test')
  })

  it('ends the session when the token expires and explains why', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const exp = Math.floor(Date.now() / 1000) + 60
    const { user } = setup('/login', { login: () => [200, { token: jwt(exp), email: 'ana@example.test', nombre: 'Ana' }] })
    await user.type(email(), 'ana@example.test')
    await user.type(password(), 'password-test')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await waitFor(() => expect(screen.getByTestId('route')).not.toHaveTextContent('/login'))
    await act(() => vi.advanceTimersByTimeAsync(61_000))
    expect(await screen.findByText('Tu sesión venció. Iniciá sesión nuevamente para continuar.')).toBeInTheDocument()
    expect(screen.getByTestId('route')).toHaveTextContent('/login')
  })
})

describe('registration', () => {
  async function fillRegistration(user) {
    await user.type(await screen.findByLabelText(/^Nombre \(/), 'Ana')
    await user.type(screen.getByLabelText(/^Apellido/), 'Pérez')
    await user.type(screen.getByLabelText(/^Nombre de usuario/), 'anap')
    await user.type(email(), 'ana@example.test')
    await user.type(password(), 'password-test')
  }

  it('validates every field next to it and focuses the first error', async () => {
    const { fetcher, user } = setup('/registro')
    await user.type(await screen.findByLabelText(/^Nombre \(/), 'Ana')
    await user.type(password(), 'corta')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(screen.getByText('Ingresá tu apellido.')).toBeInTheDocument()
    expect(screen.getByText('Elegí un nombre de usuario.')).toBeInTheDocument()
    expect(password()).toHaveAccessibleDescription(/Usá al menos 8 caracteres\..*Usá al menos 8 caracteres\./)
    expect(screen.getByLabelText(/^Apellido/)).toHaveFocus()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('takes the person to login with the email filled in after registering', async () => {
    const { fetcher, user } = setup('/registro')
    await fillRegistration(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByText('Tu cuenta está lista. Ingresá tu contraseña para continuar.')).toBeInTheDocument()
    expect(screen.getByTestId('route')).toHaveTextContent('/login')
    expect(email()).toHaveValue('ana@example.test')
    expect(password()).toHaveFocus()
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ nombre: 'Ana', apellido: 'Pérez', usuario: 'anap', email: 'ana@example.test', contra: 'password-test' })
  })

  it('marks a duplicated email, keeps the data and offers to log in', async () => {
    const { user } = setup('/registro', { registro: () => [409, 'Ya existe un usuario registrado con el email: ana@example.test'] })
    await fillRegistration(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una cuenta con este email.')
    expect(email()).toHaveAccessibleDescription('Este email ya está registrado.')
    expect(email()).toHaveFocus()
    expect(screen.getByLabelText(/^Apellido/)).toHaveValue('Pérez')
    await user.click(screen.getByRole('link', { name: 'Iniciar sesión con este email' }))
    expect(email()).toHaveValue('ana@example.test')
  })

  it('does not invite a blind retry when the response was lost', async () => {
    const { user } = setup('/registro', { registro: () => new TypeError('Failed to fetch') })
    await fillRegistration(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos confirmar si la cuenta se creó.')
  })
})

it('reads the expiry of a JWT and ignores malformed tokens', () => {
  expect(tokenExpiry(jwt(1700000000))).toBe(1700000000000)
  expect(tokenExpiry('test-token')).toBeNull()
  expect(tokenExpiry(undefined)).toBeNull()
})
