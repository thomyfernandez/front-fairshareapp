import { useContext } from 'react'
import { WorkspaceContext } from './workspace-context'

export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('useWorkspace requires WorkspaceProvider')
  return value
}
