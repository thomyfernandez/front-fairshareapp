import { BalanceSummary as PersonalBalance, SectionHeading } from '../../components/ui'
import { personalSummary } from './model'
import { balanceCounterpart } from '../dashboard/model'

export function BalanceSummary({ debts, userId }) {
  const personal = personalSummary(debts, userId)
  return <>
    <PersonalBalance payable={personal.payable} receivable={personal.receivable} counterpart={balanceCounterpart(debts, userId)} />
    <SectionHeading title="Pendientes entre integrantes" description={`${debts.length} ${debts.length === 1 ? 'deuda pendiente' : 'deudas pendientes'} en el espacio`} />
  </>
}
