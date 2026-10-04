import { Field, Submit, Empty, PageHeader, ResourceState } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { money, formData } from '../../lib/format'
import { useWorkspace } from '../../app/useWorkspace'

export default function BalancePage() {
  const { spaceId } = useWorkspace()
  const { resource, busy, isAdmin, session, run, refresh, mutate } = useFeature(`/api/v1/espacios/${spaceId}/balance`, { initialData: null })
  const debts = resource.data?.deudas || []
  return <div className="legacy-feature"><PageHeader title="Balance y pagos" /><ResourceState resource={resource}><section className="card"><h2>Quién le debe a quién</h2><p>El balance incorpora los pagos ya registrados.</p><button disabled={busy} className="secondary" onClick={() => run(() => refresh())}>Actualizar balance</button>{debts.map(d => <article className="expense" key={d.id}><div className="row"><span><strong>{d.deudorNombre}</strong> → {d.acreedorNombre}</span><strong>{money(d.monto)}</strong></div>{(isAdmin || d.deudorId === session.usuario.id) && <form className="filters" onSubmit={event => { event.preventDefault(); const f = formData(event); mutate(`/api/v1/deudas/${d.id}/saldar`, 'POST', { monto: Number(f.monto) }, 'Pago registrado.') }}><Field label="Monto a pagar" name="monto" type="number" min="0.01" max={d.monto} step="0.01" defaultValue={d.monto} key={d.monto} required /><Submit busy={busy}>Registrar pago</Submit></form>}</article>)}{!debts.length && <Empty>Todo al día. No hay deudas pendientes.</Empty>}</section></ResourceState></div>
}
