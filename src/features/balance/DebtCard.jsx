import { Badge, Button } from '../../components/ui'
import { money } from '../../lib/format'
import { debtRole } from './model'

const roleCopy = {
  deudor: { tone: 'error', label: 'Le debés' },
  acreedor: { tone: 'success', label: 'Te debe' },
  tercero: { tone: 'neutral', label: 'Entre miembros' },
}

export function DebtCard({ debt, userId, canRegistrarPago, onRegistrarPago }) {
  const role = debtRole(debt, userId)
  const { tone, label } = roleCopy[role]

  return (
    <article className="expense">
      <div className="row">
        <div>
          <Badge tone={tone}>{label}</Badge>
          <strong>{debt.deudorNombre} → {debt.acreedorNombre}</strong>
        </div>
        <strong>{money(debt.monto)}</strong>
      </div>
      {canRegistrarPago && (
        <div className="row">
          <span>{role === 'deudor' ? 'Registrá que ya pagaste esta deuda' : 'Registrá el pago en nombre del espacio'}</span>
          <Button variant="secondary" onClick={() => onRegistrarPago(debt)}>Registrar pago</Button>
        </div>
      )}
    </article>
  )
}
