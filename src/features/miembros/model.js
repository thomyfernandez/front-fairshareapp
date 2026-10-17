const ROLE_LABELS = { ADMIN: 'Administrador', MIEMBRO: 'Miembro' }

export const roleLabel = (rol) => ROLE_LABELS[rol] || rol
export const roleTone = (rol) => (rol === 'ADMIN' ? 'brand' : 'neutral')
export const otherRole = (rol) => (rol === 'ADMIN' ? 'MIEMBRO' : 'ADMIN')
export const changeRoleActionLabel = (rol) => (rol === 'ADMIN' ? 'Quitar administración' : 'Hacer administrador')

export function countAdmins(members) {
  return members.filter((m) => m.rol === 'ADMIN').length
}

// El espacio queda sin nadie que pueda administrarlo si se le quita el rol
// a quien hoy es su único integrante con permisos de administración.
export function isSoleAdmin(members, usuarioId) {
  const member = members.find((m) => m.usuarioId === usuarioId)
  return member?.rol === 'ADMIN' && countAdmins(members) <= 1
}

export function roleChangeConsequence({ nextRole, isSelf, soleAdmin }) {
  if (nextRole === 'ADMIN') {
    return isSelf
      ? 'Vas a poder cambiar roles de otros integrantes, y modificar el presupuesto y la regla de reparto del espacio.'
      : 'Esta persona va a poder cambiar roles de otros integrantes, y modificar el presupuesto y la regla de reparto del espacio.'
  }
  if (soleAdmin) {
    return isSelf
      ? 'Sos el único administrador de este espacio. Si te quitás el rol, nadie va a poder administrarlo hasta que otro integrante sea promovido.'
      : 'Esta persona es la única administradora de este espacio. Si le quitás el rol, nadie va a poder administrarlo hasta que otro integrante sea promovido.'
  }
  return isSelf
    ? 'Vas a perder los permisos de administración: no vas a poder cambiar roles, el presupuesto ni la regla de reparto.'
    : 'Esta persona va a perder los permisos de administración: no va a poder cambiar roles, el presupuesto ni la regla de reparto.'
}
