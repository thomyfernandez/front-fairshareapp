import { useContext } from 'react'
import { UIContext } from './ui-context'

export function useUI() {
  const value = useContext(UIContext)
  if (!value) throw new Error('useUI requires UIProvider')
  return value
}
