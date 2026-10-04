import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useEffect, useState } from 'react'
import { Button, Card, Field, InlineAlert, Submit, useUI } from '../../components/ui'
import { Brand } from '../../app/Sidebar'
import { useSession } from './useSession'
import { formData } from '../../lib/format'

// Existing authentication flow extracted as the replaceable screen for integrante 1.
export default function AuthPage({ register = false }) {
  const { session, api, signIn } = useSession()
  const { notify } = useUI()
  const location = useLocation()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => { document.title = `${register ? 'Crear cuenta' : 'Iniciar sesión'} · FairShare` }, [register])
  const from = location.state?.from || '/'
  const destination = from.startsWith('/') && !from.startsWith('//') && !['/login', '/registro'].includes(from) ? from : '/'
  if (session) return <Navigate to={destination} replace />
  const submit = async event => {
    event.preventDefault()
    if (busy) return
    const data = formData(event)
    setBusy(true)
    setError(null)
    try {
      if (register) {
        await api('/api/v1/usuarios/registro', { method: 'POST', body: data })
        notify('Cuenta creada. Iniciá sesión para continuar.')
        navigate('/login', { replace: true, state: { email: data.email, from: destination } })
      } else {
        signIn(await api('/api/v1/usuarios/login', { method: 'POST', body: data }))
        navigate(destination, { replace: true })
      }
    } catch (failure) { setError(failure) }
    finally { setBusy(false) }
  }
  const fieldError = name => error?.fieldErrors?.[name]
  return <div className="auth-shell"><div className="auth-brand"><Brand /></div><main className="auth"><div className="intro"><span className="ui-eyebrow">TU DINERO, EN EQUIPO</span><h1>Compartir gastos.<br />Sin perder la cuenta.</h1><p>Organizá tu hogar, un viaje o un proyecto. Registrá gastos, repartí importes y sabé cuánto queda por pagar.</p><div className="pills"><span>Repartos claros</span><span>Un mismo espacio</span><span>Menos cuentas pendientes</span></div></div>
    <Card className="auth-card"><h2>{register ? 'Crear una cuenta' : 'Bienvenido de nuevo'}</h2><p>{register ? 'Completá tus datos para empezar.' : 'Ingresá a tus espacios compartidos.'}</p>{error && <InlineAlert tone="error">{error.message}</InlineAlert>}
      <form onSubmit={submit}>
        {register && <><Field label="Nombre" name="nombre" autoComplete="given-name" required maxLength={100} error={fieldError('nombre')} /><Field label="Apellido" name="apellido" autoComplete="family-name" required maxLength={100} error={fieldError('apellido')} /><Field label="Nombre de usuario" name="usuario" autoComplete="username" required minLength={2} maxLength={50} error={fieldError('usuario')} /></>}
        <Field label="Email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={location.state?.email} error={fieldError('email')} />
        <Field label="Contraseña" name="contra" type={visible ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} maxLength={72} required error={fieldError('contra')} hint={register ? 'Usá al menos 8 caracteres.' : undefined} />
        <Button variant="ghost" className="password-toggle" aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}</Button>
        <Submit busy={busy}>{register ? 'Crear cuenta' : 'Iniciar sesión'}</Submit>
      </form><p className="auth-switch">{register ? '¿Ya tenés cuenta?' : '¿Primera vez en FairShare?'} <Link to={register ? '/login' : '/registro'} state={{ from: destination }} className="ui-link">{register ? 'Iniciar sesión' : 'Crear cuenta'}</Link></p>
    </Card></main><footer className="auth-footer">FairShare · Gastos claros, juntos.</footer></div>
}
