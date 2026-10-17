import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Card, InlineAlert, PageHeader, ResourceState } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { useApiResource } from '../../hooks/useApiResource'
import { money } from '../../lib/format'
import { historyQuery, readFilters } from './model'
import { SettlementForm } from './SettlementForm'
import { SettlementHistory } from './SettlementHistory'
import { SettlementDetail } from './SettlementDetail'

export default function SettlementsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readFilters(searchParams)
  const { query } = historyQuery(filters)
  const { spaceId, space, api, revision, invalidate, isAdmin, busy, run } = useFeature(null)
  const spacePath = `/api/v1/espacios/${spaceId}`
  const history = useApiResource(api, `${spacePath}/liquidaciones/historial${query ? `?${query}` : ''}`, { revision })
  const expenseState = useApiResource(api, `${spacePath}/gastos`, { revision })
  const [detail, setDetail] = useState(null)
  const pending = expenseState.data.filter(expense => expense.estado === 'PENDIENTE')

  return <div className="legacy-feature">
    <PageHeader
      title="Liquidaciones"
      description={space ? `Presupuesto disponible del espacio: ${money(space.presupuestoBase)}` : undefined}
    />
    <InlineAlert tone="info">
      Liquidar cierra gastos y descuenta su total del presupuesto del espacio. No registra pagos entre personas: para eso usá <Link to={`/espacios/${spaceId}/balance`}>Balance y pagos</Link>.
    </InlineAlert>
    <div className="grid gap-6">
      {isAdmin
        ? <ResourceState resource={expenseState}>
          <SettlementForm spaceId={spaceId} pending={pending} presupuesto={space?.presupuestoBase} busy={busy} run={run} api={api} invalidate={invalidate} />
        </ResourceState>
        : <Card><h2>Nuevo cierre</h2><p>Solo los administradores del espacio pueden liquidar gastos. Podés consultar el historial de cierres debajo.</p></Card>}
      <SettlementHistory
        resource={history}
        filters={filters}
        onApply={next => setSearchParams(new URLSearchParams(Object.entries(next).filter(([, value]) => value)))}
        onClear={() => setSearchParams({})}
        onOpen={setDetail}
      />
    </div>
    <SettlementDetail settlement={detail} expenses={expenseState.data} onClose={() => setDetail(null)} />
  </div>
}
