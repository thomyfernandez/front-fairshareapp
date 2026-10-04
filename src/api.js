export function createApi({ baseUrl = '', token = '', onUnauthorized = () => {}, fetcher = globalThis.fetch } = {}) {
  return async function api(path, { method = 'GET', body } = {}) {
    const headers = { Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    const text = await response.text()
    let data
    try { data = text ? JSON.parse(text) : null } catch { data = null }
    if (!response.ok) {
      if (response.status === 401 && token) onUnauthorized()
      const fields = data?.fieldErrors ? Object.entries(data.fieldErrors).map(([field, message]) => `${field}: ${message}`).join(' · ') : ''
      throw new Error(fields || data?.message || `No se pudo completar la solicitud (${response.status})`)
    }
    return data
  }
}
