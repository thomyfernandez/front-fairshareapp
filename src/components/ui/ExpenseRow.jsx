import { Icon } from './Icon'
import { Money } from './Money'
import { dateLabel } from '../../lib/format'
import { expenseIcon } from './expense-icons'

// Contenido común de las filas de consulta y de selección para cierres.
export function ExpenseRowContent({ description, payerName, payerLabel = payerName, category, paidByYou = false, date, amount, status }) {
  const available = typeof amount === 'number' && Number.isFinite(amount) && amount >= 0
  return <><span className="ui-expense-row__icon" aria-hidden="true"><Icon name={expenseIcon(category, description)} size={20} /></span><span className="ui-expense-row__content"><span className="ui-expense-row__title"><strong>{description}</strong>{status}</span><span>{dateLabel(date, { compact: true })} · {paidByYou ? 'Pagaste vos' : payerLabel ? `Pagó ${payerLabel}` : 'Pagador no disponible'}</span></span><span className="ui-expense-row__amount">{available ? <Money value={amount} hideZeroDecimals /> : 'Importe no disponible'}</span></>
}

// Muestra concepto, pagador, fecha e importe; abre el desglose a demanda.
export function ExpenseRow({ onSelect, ...expense }) {
  const content = <ExpenseRowContent {...expense} />
  return onSelect
    ? <button type="button" className="ui-expense-row" onClick={onSelect} aria-label={`Ver detalle de ${expense.description}`}>{content}</button>
    : <div className="ui-expense-row">{content}</div>
}
