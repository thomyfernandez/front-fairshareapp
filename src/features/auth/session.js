export function safeDestination(from) {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !['/login', '/registro'].includes(from) ? from : '/'
}

// Reads the JWT `exp` claim only to warn before requests start failing; the server still validates the token.
export function tokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}
