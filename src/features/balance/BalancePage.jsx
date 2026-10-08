import { useState } from 'react'
import { Empty, Modal, PageHeader, ResourceState } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { useWorkspace } from '../../app/useWorkspace'
import { BalanceSummary } from './BalanceSummary'
import { DebtCard } from './DebtCard'
import { PaymentForm } from './PaymentForm'
import { PaymentConfirmation } from './PaymentConfirmation'
import { sortByRelevance } from './model'

export default function BalancePage() {
  const { spaceId } = useWorkspace()
  const { resource, busy, isAdmin, session, run, refresh, error, mutate } = useFeature(`/api/v1/espacios/${spaceId}/balance`, { initialData: null })
  const debts = resource.data?.deudas || []
  const userId = session.usuario.id
  const [selected, setSelected] = useState(null)

  function abrirPago(debt) {
    setSelected({ debt, step: 'form', monto: null })
  }
  function cerrar() {
    setSelected(null)
  }
  function continuar(monto) {
    setSelected(previous => ({ ...previous, step: 'confirm', monto }))
  }
  function volver() {
    setSelected(previous => ({ ...previous, step: 'form' }))
  }
  async function confirmar() {
    const resultado = await mutate(`/api/v1/deudas/${selected.debt.id}/saldar`, 'POST', { monto: selected.monto }, 'Pago registrado.')
    if (resultado.ok) cerrar()
  }

  return (
    <div className="legacy-feature">
      <PageHeader
        title="Balance y pagos"
        description="Mirá quién le debe a quién en este espacio y registrá los pagos a medida que se resuelven."
        actions={<button disabled={busy} className="secondary" onClick={() => run(() => refresh())}>Actualizar balance</button>}
      />
      <ResourceState resource={resource}>
        <section className="card">
          <BalanceSummary debts={debts} userId={userId} />
          {sortByRelevance(debts, userId).map(debt => (
            <DebtCard
              key={debt.id}
              debt={debt}
              userId={userId}
              canRegistrarPago={isAdmin || debt.deudorId === userId}
              onRegistrarPago={abrirPago}
            />
          ))}
          {!debts.length && <Empty>Todo al día. No hay deudas pendientes.</Empty>}
        </section>
      </ResourceState>

      <Modal
        open={Boolean(selected)}
        onClose={cerrar}
        dismissible={!busy}
        title={selected?.step === 'confirm' ? 'Confirmar pago' : 'Registrar pago'}
      >
        {selected?.step === 'form' && (
          <PaymentForm debt={selected.debt} onContinuar={continuar} onCancelar={cerrar} />
        )}
        {selected?.step === 'confirm' && (
          <PaymentConfirmation
            debt={selected.debt}
            monto={selected.monto}
            busy={busy}
            error={error}
            onConfirmar={confirmar}
            onVolver={volver}
          />
        )}
      </Modal>
    </div>
  )
}
