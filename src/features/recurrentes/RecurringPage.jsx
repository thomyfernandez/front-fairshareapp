import { Badge, Button, Card, EmptyState, Field, Icon, Money, PageHeader, PanelDisclosure, ResourceState, Submit } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { dateLabel, nextMonth, formData } from '../../lib/format'
import { useWorkspace } from '../../app/useWorkspace'
import { useSearchParams } from 'react-router'

export default function RecurringPage() {
  const { spaceId } = useWorkspace()
  const [query] = useSearchParams()
  const spacePath = `/api/v1/espacios/${spaceId}`
  const { resource, membersState, members, session, busy, mutate, confirm } = useFeature(`${spacePath}/favoritos`)
  const templates = resource.data
  return <div className="legacy-feature feature-page recurring-page">
    <PageHeader title="Gastos recurrentes" description="Los gastos que vuelven, sin empezar de cero." />
    <ResourceState resource={resource}><ResourceState resource={membersState}>
      <PanelDisclosure title="Crear plantilla" icon="plus" className="recurring-create">
        <form className="grid-form" onSubmit={event => {
          event.preventDefault()
          const d = formData(event)
          for (const k of ['pagadorId', 'montoBase', 'montoVariable', 'frecuenciaAjusteMeses']) d[k] = Number(d[k])
          mutate(`${spacePath}/favoritos`, 'POST', d, 'Plantilla creada.')
        }}>
          <Field label="Nombre" name="nombre" required minLength={2} maxLength={100} />
          <Field label="Pagador"><select name="pagadorId" defaultValue={session.usuario.id} required>{members.map(m => <option key={m.usuarioId} value={m.usuarioId}>{m.nombreUsuario}</option>)}</select></Field>
          <Field label="Monto base" name="montoBase" type="number" min="0" step="0.01" required />
          <Field label="Monto variable" name="montoVariable" type="number" min="0" step="0.01" defaultValue="0" required />
          <Field label="Revisar cada (meses)" name="frecuenciaAjusteMeses" type="number" min="1" defaultValue="1" required />
          <Field label="Próxima revisión" name="fechaProximaRevision" type="date" defaultValue={nextMonth()} required />
          <Field label="Reparto"><select name="reglaDivision"><option value="EQUITATIVA">Equitativo</option><option value="PROPORCIONAL_INGRESOS">Proporcional a ingresos</option></select></Field>
          <Submit busy={busy}>Crear plantilla</Submit>
        </form>
      </PanelDisclosure>
      <div className="recurring-list">
        {templates.map(p => <Card as="article" key={p.id} className="recurring-item">
          <div className="recurring-item__header">
            <span className="ui-item-icon"><Icon name="repeat" /></span>
            <div className="recurring-item__name"><h2>{p.nombre}</h2><p>Revisión: {dateLabel(p.fechaProximaRevision)}</p>{p.vencido && <Badge tone="warning">Necesita revisión</Badge>}</div>
            <strong className="recurring-item__amount"><Money value={Number(p.montoBase) + Number(p.montoVariable)} hideZeroDecimals /></strong>
          </div>
          <div className="feature-actions">
            <Button variant="secondary" disabled={busy || p.vencido} onClick={() => mutate(`/api/v1/favoritos/${p.id}/ejecutar`, 'POST', undefined, 'Gasto generado.')}>Generar gasto</Button>
            <Button variant="ghost" disabled={busy} onClick={async () => { if (await confirm('¿Eliminar esta plantilla?')) mutate(`/api/v1/favoritos/${p.id}`, 'DELETE', undefined, 'Plantilla eliminada.') }}>Eliminar</Button>
          </div>
          <PanelDisclosure title="Actualizar monto y revisión" icon="settings" open={String(p.id) === query.get('revisar') || undefined}>
            <form className="grid-form" onSubmit={event => {
              event.preventDefault()
              const d = formData(event)
              d.nuevoMontoBase = Number(d.nuevoMontoBase)
              d.nuevoMontoVariable = Number(d.nuevoMontoVariable)
              mutate(`/api/v1/favoritos/${p.id}/actualizar-monto`, 'PUT', d, 'Plantilla actualizada.')
            }}>
              <Field label="Monto base" name="nuevoMontoBase" type="number" min="0" step="0.01" defaultValue={p.montoBase} required />
              <Field label="Variable" name="nuevoMontoVariable" type="number" min="0" step="0.01" defaultValue={p.montoVariable} required />
              <Field label="Nueva revisión" name="nuevaFechaProximaRevision" type="date" defaultValue={nextMonth()} required />
              <Submit busy={busy}>Actualizar</Submit>
            </form>
          </PanelDisclosure>
        </Card>)}
      </div>
      {!templates.length && <EmptyState icon="repeat" title="No hay plantillas todavía" description="Creá una para los servicios, suscripciones o gastos que se repiten." />}
    </ResourceState></ResourceState>
  </div>
}
