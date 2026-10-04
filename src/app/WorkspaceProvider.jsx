import { useCallback, useState } from 'react'
import { useLocation } from 'react-router'
import { useSession } from '../features/auth/useSession'
import { useApiResource } from '../hooks/useApiResource'

import { WorkspaceContext } from './workspace-context'

export function WorkspaceProvider({ children }) {
  const { session, api } = useSession()
  const { pathname } = useLocation()
  const spaceId = pathname.match(/^\/espacios\/([1-9]\d*)(?:\/|$)/)?.[1] || null
  const [revision, setRevision] = useState(0)
  const spacesState = useApiResource(api, '/api/v1/espacios', { revision })
  const spaceState = useApiResource(api, spaceId ? `/api/v1/espacios/${spaceId}` : null, { initialData: null, revision })
  const membersState = useApiResource(api, spaceId ? `/api/v1/espacios/${spaceId}/miembros` : null, { revision })
  const invalidate = useCallback(() => setRevision(value => value + 1), [])
  const members = membersState.data
  const isAdmin = members.some(member => member.usuarioId === session.usuario.id && member.rol === 'ADMIN')
  return <WorkspaceContext.Provider value={{
    session, api, spaces: spacesState.data, spacesState, spaceId,
    space: spaceState.data, spaceState, members, membersState, isAdmin, revision, invalidate,
  }}>{children}</WorkspaceContext.Provider>
}
