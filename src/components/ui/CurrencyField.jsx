import { Field } from './Field'
import { formatCurrencyInput, parseCurrencyInput } from '../../lib/currency-input'

export function CurrencyField({ value, onChange, onBlur, ...props }) {
  return <Field {...props} type="text" inputMode="decimal" value={value} onChange={event => onChange(event.target.value)} onBlur={event => {
    const amount = parseCurrencyInput(value)
    if (amount !== null) onChange(formatCurrencyInput(amount))
    onBlur?.(event)
  }} />
}
