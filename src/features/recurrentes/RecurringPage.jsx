import { useRef } from 'react'
import { useSearchParams } from 'react-router'
import { EmptyState, PageHeader, ResourceState } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { useWorkspace } from '../../app/useWorkspace'
import { RecurringForm } from './RecurringForm'
import { RecurringCard } from './RecurringCard'
import { RecurringBatchTray } from './RecurringBatchTray'
import { useRecurringBatch } from './useRecurringBatch'

export default function RecurringPage() {
  const pageRef = useRef(null)
  const { spaceId } = useWorkspace()
  const [query] = useSearchParams()
  const spacePath = `/api/v1/espacios/${spaceId}`
  const { resource, membersState, members, session, busy, mutate, confirm } = useFeature(`${spacePath}/favoritos`)
  const batch = useRecurringBatch({ userId: session?.usuario?.id, spaceId, members })
  return <div ref={pageRef} className="legacy-feature feature-page recurring-page">
    <PageHeader title="Gastos recurrentes" description="Elegí tus plantillas y revisá los gastos antes de registrarlos." />
    <ResourceState resource={resource}><ResourceState resource={membersState}>
      <RecurringForm key={spaceId} spacePath={spacePath} session={session} members={members} mutate={mutate} busy={busy} />
      <div className="recurring-list">{resource.data.map(template => <RecurringCard key={template.id} template={template} members={members} mutate={mutate} confirm={confirm} busy={busy} batch={batch} reviewOpen={String(template.id) === query.get('revisar')} />)}</div>
      {!resource.data.length && <EmptyState icon="repeat" title="No hay plantillas todavía" description="Creá una para los servicios, suscripciones o gastos que se repiten." />}
    </ResourceState></ResourceState>
    <RecurringBatchTray batch={batch} members={members} onEmptyClose={() => requestAnimationFrame(() => pageRef.current?.querySelector('[data-page-heading]')?.focus())} />
  </div>
}
