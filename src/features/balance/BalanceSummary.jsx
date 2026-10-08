import { Badge } from '../../components/ui'
import { money } from '../../lib/format'
import { generalSummary, personalSummary } from './model'

export function BalanceSummary({ debts, userId }) {
  const personal = personalSummary(debts, userId)
  const general = generalSummary(debts)
  const alDia = personal.payable === 0 && personal.receivable === 0

  return (
    <>
      <div className="row">
        <div>
          <h3>Tu resumen personal</h3>
          {alDia ? (
            <p>Estás al día en este espacio.</p>
          ) : (
            <p>
              Te deben {money(personal.receivable)} · Debés {money(personal.payable)}
            </p>
          )}
        </div>
        {!alDia && (
          <Badge tone={personal.net >= 0 ? 'success' : 'error'}>
            Saldo neto {money(personal.net)}
          </Badge>
        )}
      </div>
      <div className="row">
        <span>Balance general del espacio</span>
        <span>{general.count} {general.count === 1 ? 'deuda pendiente' : 'deudas pendientes'} · {money(general.total)} en total</span>
      </div>
    </>
  )
}
