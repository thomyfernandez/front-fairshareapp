import { Link } from 'react-router'
import { Badge, Card, Icon } from '../../components/ui'
import { money } from '../../lib/format'

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

      <dl>
        <div>
          <dt>Presupuesto disponible</dt>
          <dd>{money(space.presupuestoBase)}</dd>
        </div>
        <div>
          <dt>Modalidad de reparto</dt>
          <dd>
            <Badge tone={isProportional ? 'brand' : 'neutral'}>
              {isProportional ? 'Proporcional' : 'Equitativo (50/50)'}
            </Badge>
          </dd>
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

      <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
        <Link
          className="ui-link"
          to={`/espacios/${space.id}/resumen`}
          aria-label={`Abrir espacio ${space.nombre}`}
        >
          Abrir espacio <Icon name="arrow" size={16} />
        </Link>
      </div>
    </Card>
  )
}
