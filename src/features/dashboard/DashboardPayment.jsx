import { useState } from 'react'
import { Button, Modal, Money } from '../../components/ui'
import { PaymentForm } from '../balance/PaymentForm'
import { PaymentConfirmation } from '../balance/PaymentConfirmation'
import { useFeature } from '../../hooks/useFeature'

export function DashboardPayment({ debts, initialDebt, onClose }) {
  const [selected, setSelected] = useState(initialDebt || (debts.length === 1 ? debts[0] : null))
  const [amount, setAmount] = useState(null)
  const { busy, error, mutate } = useFeature(null)
  async function confirm() {
    const result = await mutate(`/api/v1/deudas/${selected.id}/saldar`, 'POST', { monto: amount }, 'Pago registrado. El balance se actualizó.')
    if (result.ok) onClose()
  }
  return <Modal open title={amount !== null ? 'Confirmar pago' : 'Registrar pago'} onClose={onClose} dismissible={!busy} className="dashboard-payment">
    {!selected ? <><p>Elegí la deuda que ya pagaste para registrarla.</p><div className="payment-options">{debts.map(debt => <Button variant="secondary" key={debt.id} onClick={() => setSelected(debt)}><span>{debt.acreedorNombre}</span><Money value={debt.monto} /></Button>)}</div></> : amount === null ? <><p className="payment-recipient">Para <strong>{selected.acreedorNombre}</strong></p><PaymentForm debt={selected} onContinuar={setAmount} onCancelar={onClose} /></> : <PaymentConfirmation debt={selected} monto={amount} busy={busy} error={error} onConfirmar={confirm} onVolver={() => setAmount(null)} />}
  </Modal>
}
