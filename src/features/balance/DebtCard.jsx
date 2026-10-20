import { Avatar, Badge, Button, Money } from '../../components/ui'
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
    <article className="debt-item">
      <Avatar name={role === 'deudor' ? debt.acreedorNombre : debt.deudorNombre} userId={role === 'deudor' ? debt.acreedorId : debt.deudorId} />
      <div className="debt-item__person"><Badge tone={tone}>{label}</Badge><strong>{debt.deudorNombre} → {debt.acreedorNombre}</strong></div>
      <strong className="debt-item__amount"><Money value={debt.monto} hideZeroDecimals /></strong>
      {canRegistrarPago && <Button variant="secondary" onClick={() => onRegistrarPago(debt)}>Registrar pago</Button>}
    </article>
  )
}
