import { Button, Card, ErrorState, LoadingState } from '../components/ui'
import { useWorkspace } from './useWorkspace'
import { Link } from 'react-router'

export function WorkspacePage({ component: Component }) {
  const { spaceId, spaceState } = useWorkspace()
  if (!spaceId) return <Card><ErrorState title="Este espacio no existe" error={{ message: 'El enlace no contiene un identificador de espacio válido.' }} /><Link className="ui-link" to="/espacios">Volver a mis espacios</Link></Card>
  if (spaceState.loading && !spaceState.data) return <LoadingState label="Cargando espacio…" />
  if (spaceState.error) return <Card><ErrorState error={spaceState.error} onRetry={spaceState.reload} title={spaceState.error.status === 403 ? 'No tenés acceso a este espacio' : spaceState.error.status === 404 ? 'Este espacio no existe' : undefined} /><Link className="ui-link" to="/espacios">Volver a mis espacios</Link></Card>
  if (!spaceState.data) return <Button variant="secondary" onClick={spaceState.reload}>Cargar espacio</Button>
  return <Component key={spaceId} />
}
