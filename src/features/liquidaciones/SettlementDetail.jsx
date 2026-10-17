import { InlineAlert, Modal } from '../../components/ui'
import { dateLabel, money, periodLabel } from '../../lib/format'
import { settlementExpenses } from './model'

export function SettlementDetail({ settlement, expenses, onClose }) {
  const { found, missing } = settlementExpenses(settlement, expenses)
  return <Modal
    open={Boolean(settlement)}
    onClose={onClose}
    title={settlement ? `Liquidación #${settlement.id}` : ''}
    description={settlement ? `${periodLabel(settlement.mes, settlement.anio)} · cerrada el ${dateLabel(settlement.fechaLiquidacion)}` : undefined}
  >
    {settlement && <>
      <div className="row"><span>Total liquidado</span><strong>{money(settlement.montoTotal)}</strong></div>
      <div className="row"><span>Gastos incluidos</span><strong>{settlement.cantidadGastos}</strong></div>
      {settlement.descripcion && <div className="row"><span>Nota</span><span>{settlement.descripcion}</span></div>}
      <h3 className="mt-6">Gastos liquidados</h3>
      <ul className="list-none m-0 p-0" aria-label="Gastos de la liquidación">
        {found.map(expense => <li className="row" key={expense.id}>
          <div>
            <strong>{expense.descripcion}</strong>
            <small className="block text-secondary">{dateLabel(expense.fecha)}{expense.pagadorNombre ? ` · Pagó ${expense.pagadorNombre}` : ''}</small>
          </div>
          <strong>{money(expense.monto)}</strong>
        </li>)}
      </ul>
      {missing > 0 && <InlineAlert tone="info">
        {missing === 1 ? 'Un gasto de esta liquidación no está disponible' : `${missing} gastos de esta liquidación no están disponibles`} en el listado actual del espacio.
      </InlineAlert>}
    </>}
  </Modal>
}
