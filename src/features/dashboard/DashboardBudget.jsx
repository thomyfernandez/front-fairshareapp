import { Disclosure, Icon, Money } from '../../components/ui'
import { budgetProjection } from './model'

// Separa el saldo acumulado de la estimación por pendientes del mes, disponible a demanda.
export function DashboardBudget({ available, pending, periodLabel }) {
  const budget = budgetProjection(available, pending)
  const title = <><Icon name="wallet" /><span>Presupuesto del espacio</span><Icon name="chevron" className="summary-budget__chevron" /></>
  return <Disclosure title={title} className="summary-budget">
    {!budget ? <p>El saldo actual del espacio no está disponible.</p> : <>
      <div className="summary-budget__layout">
        <div className="summary-budget__current">
          <dl className="summary-budget__amounts"><div><dt>Saldo actual</dt><dd><Money value={Number(available)} hideZeroDecimals /></dd></div></dl>
          <p className="summary-budget__note">Es acumulado y no se reinicia cada mes. Se actualiza al cerrar liquidaciones.</p>
        </div>
        <div className="summary-budget__projection">
          {pending === null ? <p>La estimación estará disponible cuando podamos consultar los gastos del mes.</p> :
            <dl className="summary-budget__amounts">
              <div className="summary-budget__pending"><dt>Pendientes de liquidar en {periodLabel.toLocaleLowerCase('es-AR')}</dt><dd><Money value={pending} hideZeroDecimals /></dd></div>
              <div className={`summary-budget__estimate${budget.exceeded ? ' summary-budget__estimate--exceeded' : ''}`}><dt>{budget.exceeded ? 'Saldo que falta para cubrir esos pendientes' : 'Saldo estimado tras liquidarlos'}</dt><dd><Money value={Math.abs(budget.remaining)} hideZeroDecimals /></dd></div>
            </dl>}
        </div>
      </div>
      {pending !== null && <p className="summary-budget__footnote"><Icon name="info" size={16} /><span>Esta estimación no reserva fondos ni incluye pendientes de otros meses.</span></p>}
    </>}
  </Disclosure>
}
