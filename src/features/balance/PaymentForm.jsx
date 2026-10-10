import { useState } from 'react'
import { Button, Field, Submit, useUI } from '../../components/ui'
import { money, formData } from '../../lib/format'

export function PaymentForm({ debt, onContinuar, onCancelar }) {
  const [tipo, setTipo] = useState('total')
  const { notify } = useUI()

  function handleSubmit(event) {
    event.preventDefault()
    if (tipo === 'total') {
      onContinuar(debt.monto)
      return
    }
    const monto = Number(formData(event).monto)
    if (!monto || monto <= 0) {
      notify('Ingresá un monto mayor a cero.', 'error')
      return
    }
    if (monto > debt.monto) {
      notify(`El monto no puede superar el saldo pendiente (${money(debt.monto)}).`, 'error')
      return
    }
    onContinuar(monto)
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>Saldo pendiente: <strong>{money(debt.monto)}</strong></p>
      <label className="check">
        <input type="radio" name="tipo" value="total" checked={tipo === 'total'} onChange={() => setTipo('total')} />
        Pago total ({money(debt.monto)})
      </label>
      <label className="check">
        <input type="radio" name="tipo" value="parcial" checked={tipo === 'parcial'} onChange={() => setTipo('parcial')} />
        Pago parcial
      </label>
      {tipo === 'parcial' && (
        <Field label="Monto a registrar" name="monto" type="number" min="0.01" step="0.01" max={debt.monto} required autoFocus />
      )}
      <div className="filters">
        <Submit>Continuar</Submit>
        <Button variant="secondary" type="button" onClick={onCancelar}>Cancelar</Button>
      </div>
    </form>
  )
}
