import { Link, Navigate, useLocation } from 'react-router'
import { ApiError } from '../../api'
import { Button, Field, InlineAlert, PasswordField } from '../../components/ui'
import { AuthLayout } from './AuthLayout'
import { safeDestination } from './session'
import { loginError } from './authErrors'
import { useAuthForm } from './useAuthForm'
import { useSession } from './useSession'
import { validateLogin } from './validation'

const notices = {
  expired: { tone: 'info', text: 'Tu sesión venció. Iniciá sesión nuevamente para continuar.' },
  signedOut: { tone: 'success', text: 'Cerraste sesión correctamente.' },
}

export default function LoginPage() {
  const { session, api, signIn, notice } = useSession()
  const location = useLocation()
  const destination = safeDestination(location.state?.from)
  const registeredEmail = location.state?.registeredEmail
  const initialEmail = registeredEmail || location.state?.email || notice?.email || ''
  const form = useAuthForm({
    initialValues: { email: initialEmail, contra: '' },
    validate: validateLogin,
    mapError: loginError,
    submit: async values => {
      const auth = await api('/api/v1/usuarios/login', { method: 'POST', body: { email: values.email.trim(), contra: values.contra } })
      if (!auth?.token) throw new ApiError('Respuesta de login sin token', { status: 200, code: 'INVALID_RESPONSE' })
      // Navigation happens when the session appears: this page redirects to the destination.
      signIn(auth)
    },
  })
  if (session) return <Navigate to={destination} replace />
  const banner = registeredEmail ? { tone: 'success', text: 'Tu cuenta está lista. Ingresá tu contraseña para continuar.' } : notices[notice?.reason]
  return <AuthLayout pageTitle="Iniciar sesión" title="Ingresá a FairShare" description="Accedé a tus espacios compartidos.">
    {form.formError ? <InlineAlert tone="error">{form.formError.message}</InlineAlert> : banner && <InlineAlert tone={banner.tone}>{banner.text}</InlineAlert>}
    <form className="auth-form" noValidate onSubmit={form.handleSubmit}>
      <Field label="Email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} autoFocus={!initialEmail} {...form.field('email')} />
      <PasswordField label="Contraseña" autoComplete="current-password" required maxLength={72} autoFocus={Boolean(initialEmail)} {...form.field('contra')} />
      <Button type="submit" className="auth-submit" loading={form.busy}>{form.busy ? 'Ingresando…' : 'Iniciar sesión'}</Button>
    </form>
    <p className="auth-switch">¿Primera vez en FairShare? <Link to="/registro" state={{ from: destination, email: form.values.email.trim() || undefined }} className="ui-link">Crear una cuenta</Link></p>
  </AuthLayout>
}
