import { Link } from 'react-router'
import { Badge, Card, Icon, Money, PanelDisclosure } from '../../components/ui'

const typeIcons = {
  HOGAR: 'home',
  VIAJE: 'wallet',
  PAREJA: 'users',
  TRABAJO: 'receipt',
  OTRO: 'grid',
}

const typeLabels = {
  HOGAR: 'Hogar',
  VIAJE: 'Viaje',
  PAREJA: 'Pareja',
  TRABAJO: 'Trabajo',
  OTRO: 'Otro',
}

export function SpaceCard({ space }) {
  if (!space) return null
  const iconName = typeIcons[space.tipo] || 'users'
  const isProportional = space.reglaReparto === 'PROPORCIONAL'

  return (
    <Card className="space-card" aria-label={`Espacio ${space.nombre}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="space-card__icon" aria-hidden="true">
          <Icon name={iconName} size={24} />
        </span>
        {space.tipo && (
          <Badge tone="neutral">{typeLabels[space.tipo] || space.tipo}</Badge>
        )}
      </div>

      <h2>{space.nombre}</h2>
      <p>{space.descripcion || 'Un espacio para compartir con claridad.'}</p>

      <Badge tone={isProportional ? 'brand' : 'neutral'}>{isProportional ? 'Proporcional' : 'Equitativo (50/50)'}</Badge>
      <PanelDisclosure title="Datos del espacio" icon="info">
      <dl>
        <div>
          <dt>Presupuesto disponible</dt>
          <dd><Money value={space.presupuestoBase} hideZeroDecimals /></dd>
        </div>
        {space.codigo && (
          <div>
            <dt>Código de acceso</dt>
            <dd>
              <code className="space-code-badge">{space.codigo}</code>
            </dd>
          </div>
        )}
      </dl>
      </PanelDisclosure>

      <div className="space-card__action">
        <Link
          className="ui-button ui-button--secondary"
          to={`/espacios/${space.id}/resumen`}
          aria-label={`Abrir espacio ${space.nombre}`}
        >
          Abrir espacio
        </Link>
      </div>
    </Card>
  )
}
