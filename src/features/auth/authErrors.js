// The backend answers auth errors as plain text, so messages are chosen by HTTP status
// instead of showing server text that may include technical details.
function serviceMessage(error) {
  if (!error?.status) return 'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.'
  if (error.status >= 500) return 'El servicio no está disponible en este momento. Intentá nuevamente en unos minutos.'
  return 'No pudimos completar la solicitud. Intentá nuevamente.'
}

export function loginError(error) {
  if (error?.status === 401) return { form: { message: 'El email o la contraseña no son correctos. Revisalos e intentá de nuevo.' } }
  if (error?.status === 400) return { fields: error.fieldErrors, form: { message: 'Revisá el email y la contraseña e intentá de nuevo.' } }
  return { form: { message: serviceMessage(error) } }
}

export function registerError(error, values) {
  if (error?.status === 409) return {
    fields: { email: 'Este email ya está registrado.' },
    form: { code: 'EMAIL_TAKEN', email: values.email.trim(), message: 'Ya existe una cuenta con este email.' },
  }
  if (error?.status === 400) return { fields: error.fieldErrors, form: { message: 'Revisá los datos ingresados e intentá de nuevo.' } }
  // A lost POST response may still have created the account: say so instead of inviting a blind retry.
  if (!error?.status) return { form: { code: 'UNCONFIRMED', email: values.email.trim(), message: 'No pudimos confirmar si la cuenta se creó. Probá iniciar sesión con este email antes de volver a intentarlo.' } }
  return { form: { message: serviceMessage(error) } }
}
