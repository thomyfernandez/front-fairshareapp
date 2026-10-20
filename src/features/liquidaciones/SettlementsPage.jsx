import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader, ResourceState, Tabs } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { useApiResource } from '../../hooks/useApiResource'
import { FILTER_KEYS, historyQuery, readFilters } from './model'
import { SettlementForm } from './SettlementForm'
import { SettlementHistory } from './SettlementHistory'
import { SettlementDetail } from './SettlementDetail'
import { PendingExpensesOverview } from './PendingExpensesOverview'

export default function SettlementsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readFilters(searchParams)
  const { query } = historyQuery(filters)
  const { spaceId, space, api, revision, invalidate, isAdmin, busy, run, session, members } = useFeature(null)
  const spacePath = `/api/v1/espacios/${spaceId}`
  const history = useApiResource(api, `${spacePath}/liquidaciones/historial${query ? `?${query}` : ''}`, { revision })
  const expenseState = useApiResource(api, `${spacePath}/gastos`, { revision })
  const [detail, setDetail] = useState(null)
  const pending = expenseState.data.filter(expense => expense.estado === 'PENDIENTE')
  const ready = !expenseState.loading && !expenseState.error
  const requested = searchParams.get('vista')
  const active = ['pendientes', 'historial'].includes(requested) ? requested : (filters.modo || !isAdmin ? 'historial' : 'pendientes')

  function selectView(value) {
    setSearchParams(previous => { const next = new URLSearchParams(previous); next.set('vista', value); return next })
  }
  function applyFilters(values) {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous)
      FILTER_KEYS.forEach(key => next.delete(key))
      Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value) })
      next.set('vista', 'historial')
      return next
    })
  }

  return <div className="feature-page settlements-page">
    <PageHeader title="Liquidaciones" description={isAdmin ? 'Elegí qué gastos cerrar y revisá cómo queda el presupuesto.' : 'Consultá los gastos pendientes y los cierres del espacio.'} />
    <Tabs label="Liquidaciones" value={active} onChange={selectView} items={[
      { value: 'pendientes', label: 'Pendientes', count: ready ? pending.length : undefined, content: isAdmin ? <>
        <ResourceState resource={expenseState} />
        <div hidden={!ready}><SettlementForm spaceId={spaceId} pending={pending} presupuesto={space?.presupuestoBase} busy={busy} ready={ready} run={run} api={api} invalidate={invalidate} userId={session.usuario.id} members={members} /></div>
      </> : <ResourceState resource={expenseState}><PendingExpensesOverview pending={pending} members={members} userId={session.usuario.id} /></ResourceState> },
      { value: 'historial', label: 'Historial', content: <SettlementHistory resource={history} filters={filters} onApply={applyFilters} onClear={() => applyFilters({})} onOpen={setDetail} onPending={isAdmin ? () => selectView('pendientes') : undefined} /> },
    ]} />
    <SettlementDetail settlement={detail} expenses={expenseState.data} onClose={() => setDetail(null)} />
  </div>
}
