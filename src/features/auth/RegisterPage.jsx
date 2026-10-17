import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Button, Field, InlineAlert, PasswordField } from '../../components/ui'
import { AuthLayout } from './AuthLayout'
import { safeDestination } from './session'
import { registerError } from './authErrors'
import { useAuthForm } from './useAuthForm'
import { useSession } from './useSession'
import { validateRegister } from './validation'

export default function RegisterPage() {
  const { session, api } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const destination = safeDestination(location.state?.from)
  const form = useAuthForm({
    initialValues: { nombre: '', apellido: '', usuario: '', email: location.state?.email || '', contra: '' },
    validate: validateRegister,
    mapError: registerError,
    submit: async values => {
      const email = values.email.trim()
      await api('/api/v1/usuarios/registro', {
        method: 'POST',
        body: { nombre: values.nombre.trim(), apellido: values.apellido.trim(), usuario: values.usuario.trim(), email, contra: values.contra },
      })
      navigate('/login', { replace: true, state: { registeredEmail: email, from: destination } })
    },
  })
  if (session) return <Navigate to={destination} replace />
  const { formError } = form
  return <AuthLayout pageTitle="Crear cuenta" title="Crear una cuenta" description="Completá tus datos para empezar. Todos los campos son obligatorios.">
    {formError && <InlineAlert tone="error">
      {formError.message}
      {formError.email && <> <Link to="/login" state={{ email: formError.email, from: destination }} className="ui-link">Iniciar sesión con este email</Link></>}
    </InlineAlert>}
    <form className="auth-form" noValidate onSubmit={form.handleSubmit}>
      <div className="auth-form__row">
        <Field label="Nombre" autoComplete="given-name" required maxLength={100} autoFocus {...form.field('nombre')} />
        <Field label="Apellido" autoComplete="family-name" required maxLength={100} {...form.field('apellido')} />
      </div>
      <Field label="Nombre de usuario" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={50} hint="Así te van a ver en tus espacios. Entre 2 y 50 caracteres." {...form.field('usuario')} />
      <Field label="Email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} {...form.field('email')} />
      <PasswordField label="Contraseña" autoComplete="new-password" required maxLength={72} hint="Usá al menos 8 caracteres." {...form.field('contra')} />
      <Button type="submit" className="auth-submit" loading={form.busy}>{form.busy ? 'Creando cuenta…' : 'Crear cuenta'}</Button>
    </form>
    <p className="auth-switch">¿Ya tenés cuenta? <Link to="/login" state={{ from: destination }} className="ui-link">Iniciar sesión</Link></p>
  </AuthLayout>
}
