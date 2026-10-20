import { useCallback } from 'react'
import { useApiResource } from '../../hooks/useApiResource'

export function useExpenseCategories(api) {
  const load = useCallback((...args) => Promise.resolve(api(...args)), [api])
  const resource = useApiResource(load, api ? '/api/v1/categorias' : null)
  return { ...resource, data: Array.isArray(resource.data) ? resource.data : [] }
}
