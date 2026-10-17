const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function emailError(value) {
  const email = value.trim()
  if (!email) return 'Ingresá tu email.'
  if (!EMAIL.test(email)) return 'Ingresá un email válido, por ejemplo nombre@correo.com.'
}

// Each validator returns only the fields with errors, in the order they appear on screen.
export function validateLogin(values) {
  const errors = {}
  const email = emailError(values.email)
  if (email) errors.email = email
  if (!values.contra) errors.contra = 'Ingresá tu contraseña.'
  return errors
}

export function validateRegister(values) {
  const errors = {}
  if (!values.nombre.trim()) errors.nombre = 'Ingresá tu nombre.'
  if (!values.apellido.trim()) errors.apellido = 'Ingresá tu apellido.'
  const usuario = values.usuario.trim()
  if (!usuario) errors.usuario = 'Elegí un nombre de usuario.'
  else if (usuario.length < 2 || usuario.length > 50) errors.usuario = 'Usá entre 2 y 50 caracteres.'
  const email = emailError(values.email)
  if (email) errors.email = email
  if (!values.contra) errors.contra = 'Creá una contraseña.'
  else if (values.contra.length < 8) errors.contra = 'Usá al menos 8 caracteres.'
  else if (values.contra.length > 72) errors.contra = 'Usá como máximo 72 caracteres.'
  return errors
}
