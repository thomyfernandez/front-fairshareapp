import { EmptyState, ExpenseRow, InlineAlert, SectionHeading } from '../../components/ui'
import { payerDisplayName } from '../dashboard/model'
import { groupPendingExpenses } from './model'

export function PendingExpensesOverview({ pending, members, userId }) {
  if (!pending.length) return <EmptyState icon="check" title="No hay gastos pendientes de liquidar" description="Los gastos pendientes del espacio van a aparecer acá." />
  return <>
    <InlineAlert>Solo los administradores pueden cerrar estos gastos. Podés consultar los pendientes y ver los cierres en Historial.</InlineAlert>
    <SectionHeading title="Gastos pendientes de liquidar" />
    {groupPendingExpenses(pending).map(group => <section className="settlement-month" key={group.key} aria-label={`Gastos de ${group.label.toLocaleLowerCase('es-AR')}`}>
      <div className="settlement-month__heading"><h3>{group.label}</h3><span>{group.expenses.length} {group.expenses.length === 1 ? 'gasto' : 'gastos'}</span></div>
      <ul className="ui-expense-list" aria-label={`Pendientes de ${group.label.toLocaleLowerCase('es-AR')}`}>{group.expenses.map(expense => {
        const payerName = expense.pagadorNombre || members.find(member => String(member.usuarioId) === String(expense.pagadorId))?.nombreUsuario
        return <li key={expense.id}><ExpenseRow description={expense.descripcion} category={expense.categoriaNombre || expense.categoria} icon={expense.icono} date={expense.fecha} amount={expense.monto == null ? undefined : Number(expense.monto)} payerName={payerName} payerLabel={payerDisplayName(payerName, members)} paidByYou={String(expense.pagadorId) === String(userId)} /></li>
      })}</ul>
    </section>)}
  </>
}
