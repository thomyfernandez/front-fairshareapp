import { ExpenseRowContent } from './ExpenseRow'
import { dateLabel } from '../../lib/format'

// El label completo permite seleccionar con mouse, tacto o teclado sin controles anidados.
export function SelectableExpenseRow({ checked, onChange, disabled = false, ...expense }) {
  return <label className={`ui-expense-choice${checked ? ' ui-expense-choice--selected' : ''}`}>
    <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} aria-label={`Incluir ${expense.description} del ${dateLabel(expense.date)}`} />
    <ExpenseRowContent {...expense} />
  </label>
}
