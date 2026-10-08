import { Button, InlineAlert } from '../../components/ui'
import { money } from '../../lib/format'

export function PaymentConfirmation({ debt, monto, busy, error, onConfirmar, onVolver }) {
  const saldoRestante = Math.max(debt.monto - monto, 0)

  return (
    <div>
      <div className="row">
        <span>De</span>
        <strong>{debt.deudorNombre}</strong>
      </div>
      <div className="row">
        <span>Para</span>
        <strong>{debt.acreedorNombre}</strong>
      </div>
      <div className="row">
        <span>Importe a registrar</span>
        <strong>{money(monto)}</strong>
      </div>
      <div className="row">
        <span>Saldo restante luego del pago</span>
        <strong>{saldoRestante === 0 ? 'Quedará saldada' : money(saldoRestante)}</strong>
      </div>

      <InlineAlert tone="info">
        Esto solo registra el pago en FairShare para actualizar el balance: no realiza ninguna
        transferencia bancaria ni mueve dinero real entre cuentas.
      </InlineAlert>

      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}

      <div className="filters">
        <Button type="button" loading={busy} onClick={onConfirmar}>Confirmar pago</Button>
        <Button variant="secondary" type="button" onClick={onVolver} disabled={busy}>Volver</Button>
      </div>
    </div>
  )
}
