import { useState } from 'react'
import { Link } from 'react-router'
import { Button, Card, Disclosure, EmptyState, Field, Icon, InlineAlert, Modal, Money, SelectableExpenseRow, useUI } from '../../components/ui'
import { dateLabel, localDate, money, periodLabel } from '../../lib/format'
import { payerDisplayName } from '../dashboard/model'
import { groupPendingExpenses, settlementPeriod, settlementPreview } from './model'

function SummaryRow({ label, children }) {
  return <div className="settlement-summary-row"><span>{label}</span><strong>{children}</strong></div>
}

export function SettlementForm({ spaceId, pending, presupuesto, busy, ready = true, run, api, invalidate, userId, members = [] }) {
  const { notify } = useUI()
  const [selected, setSelected] = useState([])
  const [period, setPeriod] = useState(() => localDate().slice(0, 7))
  const [descripcion, setDescripcion] = useState('')
  const [reviewing, setReviewing] = useState(null)
  const [failure, setFailure] = useState(null)
  const [notice, setNotice] = useState(null)
  const pendingIds = pending.map(expense => expense.id)
  const selectedIds = selected.filter(id => pendingIds.includes(id))
  const preview = settlementPreview(pending, selectedIds, presupuesto)
  const accountingPeriod = settlementPeriod(period)
  const canReview = ready && !busy && preview.count > 0 && preview.total !== null && preview.available !== null && !preview.insufficient && accountingPeriod !== null
  const groups = groupPendingExpenses(pending)
  const toggle = id => setSelected(list => list.includes(id) ? list.filter(item => item !== id) : [...list, id])

  function review(event) {
    event.preventDefault()
    if (!canReview) return
    setFailure(null)
    setNotice(null)
    // Fija exactamente los gastos, período y nota que el usuario está revisando.
    setReviewing({ preview, period: accountingPeriod, descripcion: descripcion.trim(), expenses: pending.filter(expense => selectedIds.includes(expense.id)).map(expense => ({ ...expense })) })
  }

  async function confirm() {
    if (!reviewing || busy || !ready) return
    const current = settlementPreview(pending, reviewing.expenses.map(expense => expense.id), presupuesto)
    const changed = reviewing.expenses.some(expense => !pending.some(item => item.id === expense.id && Number(item.monto) === Number(expense.monto)))
    if (changed || current.available !== reviewing.preview.available || current.insufficient || current.total === null || current.available === null) {
      setReviewing(null)
      setNotice('Los gastos o el presupuesto cambiaron. Revisá la selección antes de cerrar.')
      return
    }
    setFailure(null)
    const result = await run(() => api(`/api/v1/espacios/${spaceId}/liquidaciones/cierre`, {
      method: 'POST', body: { gastoIds: reviewing.expenses.map(expense => expense.id), ...reviewing.period, descripcion: reviewing.descripcion || undefined },
    }))
    if (result.ok) {
      const resumen = result.data?.resumenCierre
      setReviewing(null)
      setSelected([])
      setDescripcion('')
      notify(resumen
        ? `Cierre registrado: ${resumen.cantidadGastosCerrados} gastos por ${money(resumen.totalLiquidado)}. Presupuesto restante: ${money(resumen.presupuestoRestante)}.`
        : 'Cierre registrado.')
      invalidate()
    } else if (result.error?.status === 409) {
      setReviewing(null)
      setNotice('La lista de gastos cambió. Actualizamos la información para que puedas revisar el cierre.')
      invalidate()
    } else {
      setFailure(result.error)
    }
  }

  return <>
    {!pending.length ? <EmptyState icon="check" title="No hay gastos pendientes de liquidar" description="Cuando registres nuevos gastos, vas a poder seleccionarlos acá." /> : <form className="settlement-composer" onSubmit={review} noValidate>
      <fieldset className="settlement-selection" disabled={busy}>
        <legend className="sr-only">Gastos por cerrar</legend>
        <div className="settlement-selection__heading"><h2>Gastos por cerrar</h2><Button variant="ghost" onClick={() => setSelected(selectedIds.length === pending.length ? [] : pendingIds)}>{selectedIds.length === pending.length ? 'Quitar selección' : 'Seleccionar todos'}</Button></div>
        {notice && <InlineAlert tone="warning">{notice}</InlineAlert>}
        {groups.map(group => <section className="settlement-month" key={group.key} aria-label={`Gastos de ${group.label.toLocaleLowerCase('es-AR')}`}>
          <div className="settlement-month__heading"><h3>{group.label}</h3><span>{group.expenses.length} {group.expenses.length === 1 ? 'gasto' : 'gastos'}</span></div>
          <ul className="ui-expense-choices">{group.expenses.map(expense => {
            const payerName = expense.pagadorNombre || members.find(member => String(member.usuarioId) === String(expense.pagadorId))?.nombreUsuario
            return <li key={expense.id}><SelectableExpenseRow checked={selectedIds.includes(expense.id)} onChange={() => toggle(expense.id)} disabled={busy} description={expense.descripcion} category={expense.categoriaNombre || expense.categoria} icon={expense.icono} date={expense.fecha} amount={expense.monto == null ? undefined : Number(expense.monto)} payerName={payerName} payerLabel={payerDisplayName(payerName, members)} paidByYou={userId != null && String(expense.pagadorId) === String(userId)} /></li>
          })}</ul>
        </section>)}
        <Disclosure title={<span><Icon name="info" size={16} />¿Qué pasa al cerrar gastos?</span>} className="settlement-help"><p>Los gastos quedan liquidados y su total se descuenta del presupuesto del espacio. Los pagos entre personas se registran en <Link className="ui-link" to={`/espacios/${spaceId}/balance`}>Balance</Link>.</p></Disclosure>
      </fieldset>
      <aside className="settlement-summary" aria-label="Resumen del cierre">
        <Card>
          <h2>Tu cierre</h2>
          <p className="settlement-summary__count" role="status" aria-live="polite">{preview.count ? `${preview.count} ${preview.count === 1 ? 'gasto seleccionado' : 'gastos seleccionados'}` : 'Seleccioná los gastos que querés cerrar'}</p>
          <div className="settlement-summary__total"><span>Total a liquidar</span><strong>{preview.count && preview.total !== null ? <Money value={preview.total} hideZeroDecimals /> : '—'}</strong></div>
          <Field label="Período del cierre" type="month" min="2000-01" max="9999-12" required value={period} onChange={event => setPeriod(event.target.value)} disabled={busy} hint="Puede incluir gastos de meses anteriores." error={!accountingPeriod ? 'Elegí un mes y un año entre 2000 y 9999.' : undefined} />
          <Disclosure title={<span><Icon name="plus" size={16} />Agregar una nota</span>} className="settlement-note"><Field label="Nota del cierre"><textarea value={descripcion} maxLength={255} disabled={busy} onChange={event => setDescripcion(event.target.value)} placeholder="Ej.: Cierre de octubre" rows={2} /></Field></Disclosure>
          <div className="settlement-summary__budget">
            <SummaryRow label="Saldo actual">{preview.available !== null ? <Money value={preview.available} hideZeroDecimals /> : 'No disponible'}</SummaryRow>
            {preview.count > 0 && preview.remaining !== null ? <div className={`settlement-summary__remaining${preview.insufficient ? ' settlement-summary__remaining--insufficient' : ''}`}><span>{preview.insufficient ? 'Saldo que falta para cubrir el cierre' : 'Saldo estimado tras el cierre'}</span><strong><Money value={preview.insufficient ? preview.missing : preview.remaining} hideZeroDecimals /></strong></div> : <p>Elegí los gastos para calcular el saldo restante.</p>}
          </div>
          {preview.available === null && <InlineAlert tone="warning">No contamos con el presupuesto confirmado del espacio. Actualizá la página para poder revisar un cierre.</InlineAlert>}
          {preview.total === null && <InlineAlert tone="warning">Un gasto seleccionado tiene un importe no disponible. Actualizá los gastos antes de continuar.</InlineAlert>}
          {preview.insufficient && <InlineAlert tone="warning">El total seleccionado supera el presupuesto disponible por {money(preview.missing)}. Quitá gastos o <Link className="ui-link" to={`/espacios/${spaceId}/configuracion`}>actualizá el presupuesto</Link>.</InlineAlert>}
          <Button type="submit" disabled={!canReview}>Revisar cierre<Icon name="arrow" size={16} /></Button>
        </Card>
        <p className="settlement-summary__footnote">Vas a revisar los gastos y el importe antes de confirmar.</p>
      </aside>
    </form>}
    <Modal open={Boolean(reviewing)} onClose={() => setReviewing(null)} dismissible={!busy} title="Revisá tu cierre" description="Revisá el alcance antes de liquidar. Esta acción no se puede deshacer." className="settlement-review" footer={<><Button variant="secondary" onClick={() => setReviewing(null)} disabled={busy}>Volver</Button><Button loading={busy} disabled={!ready} onClick={confirm}>Confirmar cierre</Button></>}>
      {reviewing && <>
        <p className="settlement-review__label">Total a liquidar</p><p className="settlement-review__total"><Money value={reviewing.preview.total} /></p>
        <SummaryRow label="Período">{periodLabel(reviewing.period.mes, reviewing.period.anio)}</SummaryRow>
        <SummaryRow label="Gastos incluidos">{reviewing.preview.count}</SummaryRow>
        <ul className="settlement-review__expenses" aria-label="Gastos a liquidar">{reviewing.expenses.map(expense => <li key={expense.id}><div><strong>{expense.descripcion}</strong><span>{dateLabel(expense.fecha, { compact: true })}</span></div><Money value={Number(expense.monto)} /></li>)}</ul>
        <SummaryRow label="Saldo actual"><Money value={reviewing.preview.available} /></SummaryRow>
        <SummaryRow label="Saldo estimado después del cierre"><Money value={reviewing.preview.remaining} /></SummaryRow>
        {reviewing.descripcion && <SummaryRow label="Nota">{reviewing.descripcion}</SummaryRow>}
        <InlineAlert tone="info">Los gastos pasarán a estado «Liquidado» y su total se descontará del presupuesto. Este cierre no registra pagos entre personas ni cambia quién le debe a quién.</InlineAlert>
        {!ready && <InlineAlert tone="warning">Estamos actualizando los gastos. Volvé a la selección para revisar el estado actual antes de confirmar.</InlineAlert>}
        {failure && <InlineAlert tone="error">{failure.message}</InlineAlert>}
      </>}
    </Modal>
  </>
}
