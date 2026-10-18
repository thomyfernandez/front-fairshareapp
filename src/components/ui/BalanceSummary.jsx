import { Button } from './Button'
import { Money } from './Money'
import { Card, ErrorState, LoadingState } from './States'
import { money } from '../../lib/format'
import { Icon } from './Icon'

// Rechaza saldos ausentes o inválidos para evitar presentarlos como un balance en cero.
function isAmount(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

// Explica los saldos confirmados sin ocultar deudas y cobros detrás de un neto compensado.
export function BalanceSummary({ payable, receivable, counterpart, loading = false, error, onRetry, onRegisterPayment, detailAction }) {
  const available = isAmount(payable) && isAmount(receivable)
  const owes = available && payable > 0
  const receives = available && receivable > 0
  const both = owes && receives
  const title = both ? 'Tenés pagos y cobros pendientes' : owes ? 'Te queda por pagar' : receives ? 'Te tienen que devolver' : 'Estás al día'
  const amountCharacters = available ? money(owes ? payable : receivable).replace(/,00$/, '').length : 1
  return <Card variant="brand" className="ui-balance-summary" aria-label="Tu balance acumulado" aria-busy={loading || undefined}>
    <div className="ui-balance-summary__heading">{loading || error || !available ? <p>Tu balance</p> : <h2 className={owes || receives ? '' : 'ui-balance-summary__settled'}>{title}</h2>}<span className="ui-balance-summary__scope">Todos los períodos</span></div>
    {loading ? <LoadingState label="Consultando tu balance…" rows={2} /> : error || !available ? <ErrorState title="Tu balance no está disponible" error={error || new Error('Todavía no contamos con los importes confirmados.')} onRetry={onRetry} /> : <>
      {both ? <dl className="ui-balance-summary__positions"><div><dt>Por pagar</dt><dd><Money value={payable} hideZeroDecimals /></dd></div><div><dt>Por cobrar</dt><dd><Money value={receivable} hideZeroDecimals /></dd></div></dl> : (owes || receives) && <p className="ui-balance-summary__amount" style={{ '--balance-characters': amountCharacters }}><Money value={owes ? payable : receivable} hideZeroDecimals /><span className="ui-balance-summary__currency">ARS</span></p>}
      {both ? <p className="ui-balance-summary__context">Los cobros pendientes no cancelan los pagos que todavía debés registrar.</p> : owes || receives ? counterpart && <p className="ui-balance-summary__context">{counterpart}</p> : <p className="ui-balance-summary__context">No tenés pagos ni cobros pendientes.</p>}
      {((owes && onRegisterPayment) || detailAction) && <div className="ui-balance-summary__actions">{owes && onRegisterPayment && <Button onClick={onRegisterPayment}>Registrar pago<Icon name="arrow-up-right" size={16} /></Button>}{detailAction}</div>}
    </>}
  </Card>
}
