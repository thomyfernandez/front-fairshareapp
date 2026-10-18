import { Icon } from './Icon'
import { Money } from './Money'
import { dateLabel } from '../../lib/format'
import { expenseIcon } from './expense-icons'

// Muestra únicamente el concepto, el pagador, la fecha y el importe; abre el desglose a demanda.
export function ExpenseRow({ description, payerName, payerLabel = payerName, category, paidByYou = false, date, amount, onSelect }) {
  const available = typeof amount === 'number' && Number.isFinite(amount) && amount >= 0
  const content = <><span className="ui-expense-row__icon" aria-hidden="true"><Icon name={expenseIcon(category, description)} size={20} /></span><span className="ui-expense-row__content"><strong>{description}</strong><span>{dateLabel(date, { compact: true })} · {paidByYou ? 'Pagaste vos' : payerLabel ? `Pagó ${payerLabel}` : 'Pagador no disponible'}</span></span><span className="ui-expense-row__amount">{available ? <Money value={amount} hideZeroDecimals /> : 'Importe no disponible'}</span></>
  return onSelect
    ? <button type="button" className="ui-expense-row" onClick={onSelect} aria-label={`Ver detalle de ${description}`}>{content}</button>
    : <div className="ui-expense-row">{content}</div>
}
