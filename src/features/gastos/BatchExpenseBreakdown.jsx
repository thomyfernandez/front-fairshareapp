import { Avatar, Icon, Money, PanelDisclosure } from '../../components/ui'
import { expenseIcon } from '../../components/ui/expense-icons'
import { dateLabel } from '../../lib/format'
import { batchMemberName, batchSplitLabel } from './expense-experience'

export function BatchExpenseBreakdown({ expenses, members }) {
  return <PanelDisclosure title="Ver detalle de los gastos" icon="receipt" className="expense-batch-review__details">
    <ol className="expense-batch-review__items">{expenses.map(expense => {
      const proportional = expense.tipoReparto === 'PROPORCIONAL_INGRESOS'
      return <li key={expense.tempId} className="review-expense">
        <div className="review-expense__header">
          <span className="ui-item-icon"><Icon name={expenseIcon(expense.categoriaNombre || expense.categoria, expense.descripcion, expense.icono)} size={18} /></span>
          <div className="review-expense__concept"><h3>{expense.descripcion}</h3><p>{dateLabel(expense.fecha, { compact: true })} · Pagó {batchMemberName(members, expense.pagadorId)}</p></div>
          <strong className="review-expense__amount"><Money value={expense.monto} /></strong>
        </div>
        <div className="review-expense__split">
          <div className="review-expense__split-heading"><Icon name="users" size={16} /><strong>{batchSplitLabel(expense.tipoReparto)}</strong><span>{proportional ? 'Se calcula al registrar' : 'Reparto estimado'}</span></div>
          <ul className={`review-expense__participants${proportional ? ' review-expense__participants--names' : ''}`}>{expense.participantes.map(participant => {
            const name = batchMemberName(members, participant.usuarioId)
            return <li key={participant.usuarioId}>
              <span className="review-expense__person"><Avatar name={name} size="small" /><span>{name}</span></span>
              {!proportional && <span className="review-expense__allocation">{expense.tipoReparto === 'PORCENTUAL' && <span>{participant.porcentaje}%</span>}<Money value={participant.importe} /></span>}
            </li>
          })}</ul>
        </div>
      </li>
    })}</ol>
  </PanelDisclosure>
}
