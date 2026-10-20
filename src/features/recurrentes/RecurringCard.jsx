import { Badge, Button, Card, Icon, Money } from '../../components/ui'
import { dateLabel } from '../../lib/format'
import { UpdateRecurringDialog } from './UpdateRecurringDialog'
import { RecurringSelectionButton } from './RecurringSelectionButton'
import { requiresReview } from './model'
import { templateAmount, templateUnavailable } from './recurring-batch'

export function RecurringCard({ template, members, mutate, confirm, busy, batch, reviewOpen }) {
  const selected = batch.selected(template.id)
  const unavailable = templateUnavailable(template, members)
  const amount = templateAmount(template)
  return <Card as="article" className={`recurring-item${selected ? ' recurring-item--selected' : ''}`}>
    <div className="recurring-item__header">
      <span className="ui-item-icon"><Icon name="repeat" /></span>
      <div className="recurring-item__name"><h2>{template.nombre}</h2><p>Revisión: {dateLabel(template.fechaProximaRevision)}</p>{requiresReview(template) && <Badge tone="warning">Necesita revisión</Badge>}{selected && <Badge tone="brand">Agregado</Badge>}</div>
      <strong className="recurring-item__amount">{amount === null ? 'Por completar' : <Money value={amount} hideZeroDecimals />}</strong>
    </div>
    <div className="feature-actions">
      <RecurringSelectionButton template={template} members={members} batch={batch} busy={busy} />
      <Button variant="ghost" disabled={busy} aria-label={`Eliminar plantilla ${template.nombre}`} onClick={async () => {
        if (await confirm({ title: `Eliminar plantilla ${template.nombre}`, description: 'Se elimina la plantilla. Los gastos ya registrados y los borradores se conservan.', confirmLabel: 'Eliminar plantilla', danger: true })) {
          await mutate(`/api/v1/favoritos/${template.id}`, 'DELETE', undefined, 'Plantilla eliminada.')
        }
      }}>Eliminar</Button>
    </div>
    {!selected && unavailable && <p className="recurring-item__hint">{unavailable}</p>}
    <UpdateRecurringDialog template={template} mutate={mutate} busy={busy} open={reviewOpen} />
  </Card>
}
