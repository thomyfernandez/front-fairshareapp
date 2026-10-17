import { useState } from 'react'
import { Link } from 'react-router'
import { Button, Card, Checkbox, EmptyState, Field, InlineAlert, Modal, useUI } from '../../components/ui'
import { dateLabel, money, monthOptions, periodLabel } from '../../lib/format'
import { settlementPreview } from './model'

function SummaryRow({ label, children }) {
  return <div className="row"><span>{label}</span><strong>{children}</strong></div>
}

export function SettlementForm({ spaceId, pending, presupuesto, busy, run, api, invalidate }) {
  const { notify } = useUI()
  const now = new Date()
  const [selected, setSelected] = useState([])
  const [period, setPeriod] = useState({ mes: now.getMonth() + 1, anio: now.getFullYear() })
  const [descripcion, setDescripcion] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [failure, setFailure] = useState(null)

  // Solo cuentan los gastos que siguen pendientes: si otro administrador los liquidó, salen solos de la selección.
  const pendingIds = pending.map(expense => expense.id)
  const selectedIds = selected.filter(id => pendingIds.includes(id))
  const preview = settlementPreview(pending, selectedIds, presupuesto)

  const toggle = id => setSelected(list => list.includes(id) ? list.filter(item => item !== id) : [...list, id])

  function review(event) {
    event.preventDefault()
    setFailure(null)
    setConfirming(true)
  }

  async function confirm() {
    setFailure(null)
    const result = await run(async () => {
      const body = { gastoIds: selectedIds, mes: Number(period.mes), anio: Number(period.anio), descripcion: descripcion.trim() || undefined }
      return api(`/api/v1/espacios/${spaceId}/liquidaciones/cierre`, { method: 'POST', body })
    })
    if (result.ok) {
      const resumen = result.data?.resumenCierre
      setConfirming(false)
      setSelected([])
      setDescripcion('')
      // El mensaje usa los valores confirmados por el servidor, no la estimación local.
      notify(resumen
        ? `Cierre registrado: ${resumen.cantidadGastosCerrados} gastos por ${money(resumen.totalLiquidado)}. Presupuesto restante: ${money(resumen.presupuestoRestante)}.`
        : 'Cierre registrado.')
      invalidate()
      return
    }
    if (result.error?.status === 409) {
      // La lista cambió en el servidor: recargamos para mostrar el estado real antes de reintentar.
      setConfirming(false)
      invalidate()
      return
    }
    setFailure(result.error)
  }

  if (!pending.length) {
    return <Card>
      <h2>Nuevo cierre</h2>
      <EmptyState icon="check" title="No hay gastos pendientes de liquidar" description="Cuando se registren nuevos gastos en el espacio, vas a poder seleccionarlos acá." />
    </Card>
  }

  return <Card>
    <form onSubmit={review}>
      <h2>Nuevo cierre</h2>
      <p>Elegí los gastos pendientes que querés liquidar. Su total se descontará del presupuesto del espacio.</p>

      <fieldset>
        <legend>Gastos pendientes ({pending.length})</legend>
        <div className="filters">
          <Button variant="secondary" onClick={() => setSelected(pendingIds)} disabled={selectedIds.length === pending.length}>Seleccionar todos</Button>
          <Button variant="ghost" onClick={() => setSelected([])} disabled={!selectedIds.length}>Quitar selección</Button>
        </div>
        {pending.map(expense => <div className="row" key={expense.id}>
          <Checkbox
            checked={selectedIds.includes(expense.id)}
            onChange={() => toggle(expense.id)}
            label={<><strong>{expense.descripcion}</strong><small className="block text-secondary">{dateLabel(expense.fecha)}{expense.pagadorNombre ? ` · Pagó ${expense.pagadorNombre}` : ''}</small></>}
          />
          <strong>{money(expense.monto)}</strong>
        </div>)}
      </fieldset>

      <section aria-labelledby="settlement-summary" aria-live="polite" className="bg-panel rounded-lg p-4 my-4">
        <h3 id="settlement-summary">Resumen estimado</h3>
        <SummaryRow label="Gastos seleccionados">{preview.count}</SummaryRow>
        <SummaryRow label="Total a liquidar">{money(preview.total)}</SummaryRow>
        <SummaryRow label="Presupuesto disponible">{money(preview.available)}</SummaryRow>
        <SummaryRow label="Presupuesto restante previsto">{preview.insufficient ? `Faltan ${money(preview.missing)}` : money(preview.remaining)}</SummaryRow>
      </section>

      {preview.insufficient && <InlineAlert tone="warning">
        El total seleccionado supera el presupuesto disponible por {money(preview.missing)}. Quitá gastos de la selección o <Link to={`/espacios/${spaceId}/miembros`}>actualizá el presupuesto del espacio</Link>.
      </InlineAlert>}

      <div className="grid-form">
        <Field label="Mes del cierre" hint="Período contable al que corresponde la liquidación.">
          <select value={period.mes} onChange={event => setPeriod(value => ({ ...value, mes: Number(event.target.value) }))}>
            {monthOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="Año del cierre" type="number" min="2000" max="9999" required value={period.anio} onChange={event => setPeriod(value => ({ ...value, anio: event.target.value }))} />
      </div>
      <Field label="Nota (opcional)" maxLength={255} value={descripcion} onChange={event => setDescripcion(event.target.value)} hint="Por ejemplo: «Cierre de octubre»." />

      <div className="filters">
        <Button type="submit" disabled={!preview.count || preview.insufficient || busy}>Revisar cierre</Button>
        {!preview.count && <span className="text-sm text-secondary">Seleccioná al menos un gasto.</span>}
      </div>
    </form>

    <Modal
      open={confirming}
      onClose={() => setConfirming(false)}
      dismissible={!busy}
      title="Confirmar cierre"
      description="Revisá el alcance antes de liquidar. Esta acción no se puede deshacer."
      footer={<>
        <Button variant="secondary" data-autofocus onClick={() => setConfirming(false)} disabled={busy}>Volver</Button>
        <Button loading={busy} onClick={confirm}>Liquidar {money(preview.total)}</Button>
      </>}
    >
      <SummaryRow label="Período">{periodLabel(Number(period.mes), Number(period.anio))}</SummaryRow>
      <SummaryRow label="Gastos a liquidar">{preview.count}</SummaryRow>
      <SummaryRow label="Total">{money(preview.total)}</SummaryRow>
      <SummaryRow label="Presupuesto actual">{money(preview.available)}</SummaryRow>
      <SummaryRow label="Presupuesto después del cierre (estimado)">{money(preview.remaining)}</SummaryRow>
      <InlineAlert tone="info">
        Los gastos pasarán a estado «Liquidado» y su total se descontará del presupuesto. Esto no registra pagos entre personas ni cambia quién le debe a quién.
      </InlineAlert>
      {failure && <InlineAlert tone="error">{failure.message}</InlineAlert>}
    </Modal>
  </Card>
}
