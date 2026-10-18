import { Disclosure, Money } from '../../components/ui'
import { budgetProjection } from './model'

// Separa el saldo acumulado de la estimación por pendientes del mes, disponible a demanda.
export function DashboardBudget({ available, pending, periodLabel }) {
  const budget = budgetProjection(available, pending)
  return <Disclosure title="Presupuesto del espacio" className="summary-budget">
    {!budget ? <p>El saldo actual del espacio no está disponible.</p> : <>
      <dl className="summary-budget__amounts"><div><dt>Saldo actual</dt><dd><Money value={Number(available)} /></dd></div></dl>
      <p>Es acumulado y no se reinicia cada mes. Se actualiza al cerrar liquidaciones.</p>
      {pending === null ? <p>La estimación estará disponible cuando podamos consultar los gastos del mes.</p> : <>
        <dl className="summary-budget__amounts"><div><dt>Pendientes de liquidar en {periodLabel.toLocaleLowerCase('es-AR')}</dt><dd><Money value={pending} /></dd></div><div><dt>{budget.exceeded ? 'Saldo que falta para cubrir esos pendientes' : 'Saldo estimado tras liquidarlos'}</dt><dd><Money value={Math.abs(budget.remaining)} /></dd></div></dl>
        <p className="summary-budget__note">Esta estimación no reserva fondos ni incluye pendientes de otros meses.</p>
      </>}
    </>}
  </Disclosure>
}
