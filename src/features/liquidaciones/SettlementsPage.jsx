import { Field, Submit, Empty, PageHeader, ResourceState } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { money } from '../../lib/format'
import { useWorkspace } from '../../app/useWorkspace'
import { useApiResource } from '../../hooks/useApiResource'
import { useUI } from '../../components/ui'

export default function SettlementsPage() {
  const { spaceId, api, revision } = useWorkspace()
  const spacePath = `/api/v1/espacios/${spaceId}`
  const { resource, isAdmin, busy, mutate } = useFeature(`${spacePath}/liquidaciones/historial`)
  const expenseState = useApiResource(api, `${spacePath}/gastos`, { revision })
  const { notify } = useUI()
  const pending = expenseState.data.filter(g => g.estado === 'PENDIENTE')
  const settlements = resource.data
  return <div className="legacy-feature"><PageHeader title="Liquidaciones" /><ResourceState resource={resource}><ResourceState resource={expenseState}><section className="card"><h2>Cierre de gastos</h2><p>El cierre descuenta del presupuesto los gastos pendientes seleccionados. No registra pagos entre miembros.</p>{isAdmin && <form onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); const ids = f.getAll('gastoIds').map(Number); if (!ids.length) { notify('Seleccioná al menos un gasto.', 'error'); return } mutate(`${spacePath}/liquidaciones/cierre`, 'POST', { gastoIds: ids, descripcion: f.get('descripcion') }, 'Liquidación cerrada.') }}><fieldset><legend>Gastos pendientes</legend>{pending.map(g => <label className="check" key={g.id}><input type="checkbox" name="gastoIds" value={g.id} defaultChecked />{g.descripcion} · {money(g.monto)}</label>)}{!pending.length && <Empty>No hay gastos pendientes de cierre.</Empty>}</fieldset><Field label="Nota del cierre" name="descripcion" maxLength={255} /><Submit busy={busy || !pending.length}>Cerrar seleccionados</Submit></form>}
            <h3>Historial</h3>{settlements.map(l => <article className="row" key={l.id}><div><strong>Liquidación #{l.id}</strong><small>{l.fechaLiquidacion} · {l.cantidadGastos} gastos</small></div><strong>{money(l.montoTotal)}</strong></article>)}{!settlements.length && <Empty>Todavía no se realizaron cierres.</Empty>}</section></ResourceState></ResourceState></div>
}
