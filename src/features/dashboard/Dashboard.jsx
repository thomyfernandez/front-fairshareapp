import { Link } from 'react-router'
import { useState } from 'react'
import { useWorkspace } from '../../app/useWorkspace'
import { useApiResource } from '../../hooks/useApiResource'
import { ActionNotice, BalanceSummary, Button, EmptyState, ErrorState, ExpenseRow, Field, Icon, LoadingState, Money, PageHeader, SectionHeading } from '../../components/ui'
import { balanceCounterpart, budgetProjection, expenseSummary, monthOptions, payerDisplayName, personalBalance } from './model'
import { ExpenseDetail } from '../gastos/ExpenseDetail'
import { DashboardPayment } from './DashboardPayment'
import { DashboardBudget } from './DashboardBudget'

// Organiza el resumen por situación personal, actividad del mes y tareas pendientes.
export default function Dashboard() {
  const { session, space, spaceId, members, membersState, api, revision } = useWorkspace()
  const base = `/api/v1/espacios/${spaceId}`
  const expenses = useApiResource(api, `${base}/gastos`, { revision })
  const balance = useApiResource(api, `${base}/balance`, { initialData: null, revision })
  const recurring = useApiResource(api, `${base}/favoritos`, { revision })
  const options = monthOptions()
  const [period, setPeriod] = useState(options[0].value)
  const [expense, setExpense] = useState(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const userId = session.usuario.id
  const balanceDebts = Array.isArray(balance.data?.deudas) ? balance.data.deudas : []
  const invalidBalance = balanceDebts.some(item => !item || item.monto == null || item.monto === '' || !Number.isFinite(Number(item.monto)) || Number(item.monto) < 0)
  const debts = balanceDebts.filter(item => item && item.estado !== 'SALDADA' && Number(item.monto) > 0)
  const ownDebts = debts.filter(item => String(item.deudorId) === String(userId))
  const personal = personalBalance(debts, userId)
  const summary = expenseSummary(expenses.data, period)
  const budget = budgetProjection(space.presupuestoBase, summary.pending)
  const overdue = recurring.data.filter(item => item.vencido)
  const url = `/espacios/${spaceId}`
  const periodLabel = options.find(option => option.value === period)?.label
  const expensesReady = !expenses.loading && !expenses.error
  const membersReady = !membersState.loading && !membersState.error
  const balanceError = balance.error || (!balance.loading && (!Array.isArray(balance.data?.deudas) || invalidBalance)
    ? new Error('No pudimos consultar los saldos confirmados. Intentá nuevamente.') : null)
  const [year, month] = period.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const periodExpenses = `${url}/gastos?desde=${period}-01&hasta=${period}-${lastDay}`

  return <div className="summary">
    <PageHeader
      eyebrow={<>{space.nombre}{membersReady && <> · {members.length} {members.length === 1 ? 'integrante' : 'integrantes'}</>}</>}
      title="Tus cuentas, claras."
      actions={<Link className="ui-button ui-button--primary" to={`${url}/gastos?nuevo=1`}><Icon name="plus" size={17} />Agregar gasto</Link>}
    />

    <BalanceSummary
      payable={personal.payable}
      receivable={personal.receivable}
      counterpart={balanceCounterpart(debts, userId)}
      loading={balance.loading}
      error={balanceError}
      onRetry={balance.reload}
      onRegisterPayment={() => setPaymentOpen(true)}
      detailAction={<Link className="ui-button ui-button--ghost" to={`${url}/balance`}>Ver detalle del balance</Link>}
    />

    <section className="summary-month" aria-labelledby="summary-month-title">
      <SectionHeading id="summary-month-title" title="El mes en tu espacio" action={
        <Field label={<span className="sr-only">Mes de los gastos</span>} className="summary-period"><select value={period} onChange={event => setPeriod(event.target.value)}>{options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field>
      } />
      {expenses.loading ? <LoadingState label="Consultando los gastos del mes…" /> : expenses.error ? <ErrorState title="No pudimos cargar los gastos del mes" error={expenses.error} onRetry={expenses.reload} /> : !summary.recent.length ? <EmptyState title="Todavía no hay gastos este mes" description="Agregá el primer gasto compartido cuando lo necesites." icon="receipt" /> : <>
        <p className="summary-month__total"><strong><Money value={summary.total} hideZeroDecimals /></strong><span>en {summary.count} {summary.count === 1 ? 'gasto compartido' : 'gastos compartidos'}</span></p>
        <ul className="ui-expense-list">{summary.recent.map(item => {
          const payer = item.pagadorNombre || members.find(member => String(member.usuarioId) === String(item.pagadorId))?.nombreUsuario
          return <li key={item.id}><ExpenseRow
          description={item.descripcion}
          payerName={payer}
          payerLabel={membersReady ? payerDisplayName(payer, members) : payer}
          category={item.categoriaNombre}
          icon={item.icono}
          paidByYou={String(item.pagadorId) === String(userId)}
          date={item.fecha}
          amount={item.monto}
          onSelect={() => setExpense(item)}
        /></li>})}</ul>
        {summary.count > summary.recent.length && <Link className="ui-link summary-month__all" to={periodExpenses}>Ver todos los gastos</Link>}
      </>}
      <DashboardBudget available={space.presupuestoBase} pending={expensesReady ? summary.pending : null} periodLabel={periodLabel} />
      {expensesReady && budget?.exceeded && <ActionNotice tone="warning" title={`El saldo no alcanza para los pendientes de ${periodLabel.toLocaleLowerCase('es-AR')}`} description="Revisá el presupuesto antes de cerrar las liquidaciones." action={<Link className="ui-button ui-button--ghost" to={`${url}/liquidaciones`}>Ver liquidaciones</Link>} />}
    </section>

    {recurring.loading ? <LoadingState rows={1} label="Consultando revisiones de gastos recurrentes…" /> : recurring.error ? <ActionNotice title="No pudimos revisar tus gastos recurrentes" description={recurring.error.message} action={<Button variant="ghost" onClick={recurring.reload}>Reintentar revisión</Button>} /> : overdue.length > 0 && <ActionNotice
      title={overdue.length === 1 ? 'Un gasto recurrente necesita revisión' : `${overdue.length} gastos recurrentes necesitan revisión`}
      icon="repeat"
      action={<Link className="ui-link summary-review" to={`${url}/recurrentes?revisar=${overdue[0].id}`}>Revisar<Icon name="arrow" size={16} /></Link>}
    />}

    {expense && <ExpenseDetail gasto={expense} open onClose={() => setExpense(null)} />}
    {paymentOpen && <DashboardPayment debts={ownDebts} onClose={() => setPaymentOpen(false)} />}
  </div>
}
