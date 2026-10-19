import { useState } from 'react'
import { Disclosure, Field, Money } from '../../components/ui'
import { cents } from '../../lib/format'

export function RecurringAmountFields({ amountName, additionalName, initialAmount = '', initialAdditional = 0, disabled = false }) {
  const [amount, setAmount] = useState(String(initialAmount ?? ''))
  const [additional, setAdditional] = useState(String(initialAdditional ?? 0))
  const [open, setOpen] = useState(Number(initialAdditional) > 0)
  const amounts = [amount, additional].map(value => value.trim() === '' ? null : Number(value))
  const valid = amounts.every(value => value !== null && Number.isFinite(value) && value >= 0)
  const total = valid ? amounts.reduce((sum, value) => sum + cents(value), 0) / 100 : null

  return <div className="recurring-amounts">
    <Field label="Monto del gasto" name={amountName} type="number" inputMode="decimal" min="0" step="0.01" required value={amount} disabled={disabled} onChange={event => setAmount(event.target.value)} />
    <Disclosure title={Number(additional) > 0 ? 'Importe adicional (opcional)' : 'Agregar un importe adicional'} className="recurring-amounts__additional" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
      <Field label="Importe adicional" name={additionalName} type="number" inputMode="decimal" min="0" step="0.01" required value={additional} disabled={disabled} onChange={event => setAdditional(event.target.value)} onInvalid={() => setOpen(true)} hint="Se suma al monto del gasto. Si no hay extras, dejalo en 0." />
    </Disclosure>
    <div className="recurring-amounts__total" role="status" aria-live="polite" aria-atomic="true"><span>Total del gasto</span><strong>{total === null ? '—' : <Money value={total} />}</strong></div>
  </div>
}
