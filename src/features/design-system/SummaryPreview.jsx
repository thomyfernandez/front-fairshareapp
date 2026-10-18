import { useState } from 'react'
import { ActionNotice, BalanceSummary, Button, Card, Disclosure, EmptyState, ExpenseRow, Field, Icon, Modal, Money, SectionHeading, useUI } from '../../components/ui'

const scenarios = {
  payable: { label: 'Por pagar', payable: 111382, receivable: 0, counterpart: 'A Thomas Fernandez' },
  receivable: { label: 'Por cobrar', payable: 0, receivable: 111382, counterpart: 'De Thomas Fernandez' },
  mixed: { label: 'Pagos y cobros a la vez', payable: 111382, receivable: 45000 },
  offset: { label: 'Neto cero con deudas pendientes', payable: 75000, receivable: 75000 },
  settled: { label: 'Al día', payable: 0, receivable: 0 },
  loading: { label: 'Cargando', loading: true },
  error: { label: 'Error al consultar', error: new Error('No pudimos consultar los saldos. Intentá nuevamente.') },
}
const expenses = [
  { id: 1, description: 'DIA', payerName: 'Thomas Fernandez', date: '2026-10-08', amount: 231232 },
  { id: 2, description: 'Coto', payerName: 'Administrador FairShare', paidByYou: true, date: '2026-10-08', amount: 23232 },
]

// Permite revisar la composición y sus estados con datos de demostración, sin consultar la API.
export function SummaryPreview() {
  const [scenario, setScenario] = useState('payable')
  const [period, setPeriod] = useState('2026-10')
  const [expense, setExpense] = useState(null)
  const { notify } = useUI()
  const hasExpenses = period === '2026-10'
  return <section className="ds-section" id="resumen" aria-labelledby="ds-summary-title">
    <SectionHeading id="ds-summary-title" title="Los componentes, trabajando juntos" description="Composición de referencia del resumen. Datos de demostración." />
    <div className="ds-summary-layout">
      <div className="ds-summary-preview">
        <div className="ds-summary-preview__header"><div><p className="ds-caption">Test espacio · 2 integrantes</p><h3>Tus cuentas, claras.</h3></div><Button onClick={() => notify('Demostración: acá se abre el formulario para agregar un gasto.', 'info')}><Icon name="plus" size={16} />Agregar gasto</Button></div>
        <BalanceSummary {...scenarios[scenario]} onRegisterPayment={() => notify('Demostración: abre la selección de deuda, el importe y la confirmación. No se registró ningún pago.', 'info')} onRetry={() => setScenario('payable')} detailAction={<Button variant="ghost" onClick={() => notify('El detalle permite revisar los gastos y los pagos de todos los períodos.', 'info')}>Ver detalle del balance</Button>} />
        <section className="ds-summary-preview__month" aria-label="Gastos del mes de demostración">
          <SectionHeading title="El mes en tu espacio" action={<Field label="Mes de los gastos"><select value={period} onChange={event => setPeriod(event.target.value)}><option value="2026-10">Octubre 2026</option><option value="2026-09">Septiembre 2026</option></select></Field>} />
          {hasExpenses ? <><p className="ds-month-total"><strong><Money value={254464} hideZeroDecimals /></strong><span>en 2 gastos compartidos</span></p><ul className="ui-expense-list">{expenses.map(item => <li key={item.id}><ExpenseRow {...item} onSelect={() => setExpense(item)} /></li>)}</ul></> : <EmptyState title="Todavía no hay gastos este mes" description="Tu balance acumulado sigue incluyendo los demás períodos." icon="receipt" />}
          <Disclosure title="Presupuesto del espacio"><p>Saldo actual: <Money value={2000000} />.</p><p>Es acumulado y no se reinicia cada mes. Se actualiza al cerrar liquidaciones.</p></Disclosure>
        </section>
        <ActionNotice title="Un gasto recurrente necesita revisión" icon="repeat" tone="warning" action={<Button variant="ghost" onClick={() => notify('Demostración: abre la plantilla pendiente de revisión.', 'info')}>Revisar</Button>} />
      </div>
      <Card className="ds-preview-options" aria-label="Opciones de demostración"><h3>Probá los estados</h3><Field label="Situación del balance"><select value={scenario} onChange={event => setScenario(event.target.value)}>{Object.entries(scenarios).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></Field><p>El mes solo filtra gastos. El balance conserva su alcance acumulado.</p><p>Si hay pagos y cobros pendientes, se muestran ambos sin compensarlos visualmente.</p><p>Los controles de esta galería no modifican datos.</p></Card>
    </div>
    <Modal open={!!expense} title={expense?.description || 'Detalle de gasto'} onClose={() => setExpense(null)} footer={<Button variant="secondary" onClick={() => setExpense(null)}>Cerrar detalle</Button>}><p>Gasto de demostración, sin operaciones reales.</p>{expense && <dl className="ds-expense-detail"><div><dt>Pagó</dt><dd>{expense.payerName}</dd></div><div><dt>Importe completo</dt><dd><Money value={expense.amount} /></dd></div></dl>}<p>El resumen real reutiliza el detalle existente con el reparto confirmado por el servidor.</p></Modal>
  </section>
}
