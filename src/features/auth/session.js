export function safeDestination(from) {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !['/login', '/registro'].includes(from) ? from : '/'
}
