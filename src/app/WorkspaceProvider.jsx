import { useCallback, useState } from 'react'
import { useLocation } from 'react-router'
import { useSession } from '../features/auth/useSession'
import { useApiResource } from '../hooks/useApiResource'

import { WorkspaceContext } from './workspace-context'

export function WorkspaceProvider({ children }) {
  const { session, api } = useSession()
  const { pathname, search } = useLocation()
  const [revision, setRevision] = useState(0)
  const [expenseViews, setExpenseViews] = useState({})
  const rememberExpenseView = useCallback((id, value) => setExpenseViews(previous => ({ ...previous, [id]: { ...previous[id], ...value } })), [])
  const spacesState = useApiResource(api, '/api/v1/espacios', { revision })
  const routeSpaceId = pathname.match(/^\/espacios\/([1-9]\d*)(?:\/|$)/)?.[1] || null
  const incomeContext = new URLSearchParams(search).get('espacio')
  // Ingresos es personal; el parámetro conserva únicamente la navegación del espacio.
  // Un contexto ajeno o inexistente no selecciona un espacio ni bloquea los ingresos.
  const incomeSpaceId = pathname === '/ingresos' && /^[1-9]\d*$/.test(incomeContext || '') && spacesState.data.some(item => String(item.id) === incomeContext) ? incomeContext : null
  const spaceId = routeSpaceId || incomeSpaceId
  const spaceState = useApiResource(api, spaceId ? `/api/v1/espacios/${spaceId}` : null, { initialData: null, revision })
  const membersState = useApiResource(api, spaceId ? `/api/v1/espacios/${spaceId}/miembros` : null, { revision })
  const invalidate = useCallback(() => setRevision(value => value + 1), [])
  const unavailableContext = !routeSpaceId && [403, 404].includes(spaceState.error?.status)
  const members = unavailableContext ? [] : membersState.data
  const isAdmin = members.some(member => member.usuarioId === session?.usuario?.id && member.rol === 'ADMIN')
  return <WorkspaceContext.Provider value={{
    session, api, spaces: spacesState.data, spacesState, spaceId: unavailableContext ? null : spaceId,
    space: spaceState.data, spaceState, members, membersState, isAdmin, revision, invalidate, expenseViews, rememberExpenseView,
  }}>{children}</WorkspaceContext.Provider>
}
