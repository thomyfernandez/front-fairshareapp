import { Button, Icon, Money } from '../../components/ui'
import { dateLabel } from '../../lib/format'

export function ExpenseReceipt({ expenses, onOpen, onClose }) {
  if (!expenses?.length) return null
  const first = expenses[0]
  return <section className="expense-receipt" aria-label="Registro confirmado">
    <Icon name="check" /><div><h2>{expenses.length === 1 ? 'Gasto registrado' : `${expenses.length} gastos registrados`}</h2><p>{expenses.length === 1 ? <>{first.descripcion} · <Money value={first.monto} /> · {dateLabel(first.fecha)}</> : 'Los gastos se guardaron juntos. Podés consultar el pago y el reparto de cada uno.'}</p>
      <div className="expense-receipt__details">{expenses.slice(0, 5).map(expense => <Button key={expense.id} variant="ghost" onClick={() => onOpen(expense)}>Ver detalle de {expense.descripcion}</Button>)}{expenses.length > 5 && <p>El resto de los detalles está disponible en el listado.</p>}</div>
    </div><Button variant="ghost" size="icon" aria-label="Cerrar confirmación de registro" onClick={onClose}><Icon name="close" /></Button>
  </section>
}
