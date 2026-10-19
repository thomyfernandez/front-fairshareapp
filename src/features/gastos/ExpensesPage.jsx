import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { ActionNotice, Button, EmptyState, Icon, InlineAlert, PageHeader, ResourceState, useUI } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { useApiResource } from '../../hooks/useApiResource'
import { useWorkspace } from '../../app/useWorkspace'
import { readDraft, removeDraft, saveDraft } from '../../lib/draft-storage'
import { frequentExpenses, hasDraftContent, repeatExpense } from './expense-experience'
import { ExpenseForm } from './ExpenseForm'
import { ExpenseFilters } from './ExpenseFilters'
import { ExpenseList } from './ExpenseList'
import { ExpenseBatchForm } from './ExpenseBatchForm'
import { ExpenseDetail } from './ExpenseDetail'
import { ExpenseReceipt } from './ExpenseReceipt'

const listQuery = params => new URLSearchParams([...params].filter(([key]) => ['desde', 'hasta', 'q'].includes(key))).toString()
const readSaved = (user, space, kind) => {
  const value = readDraft(user, space, kind)
  const validRow = row => row && typeof row.descripcion === 'string' && ['string', 'number'].includes(typeof row.monto) && typeof row.fecha === 'string' && Array.isArray(row.participantes)
  if (kind === 'individual') return validRow(value) ? value : null
  return Array.isArray(value?.gastos) && value.gastos.length > 0 && value.gastos.length <= 100 && value.gastos.every(validRow) ? value : null
}

export default function ExpensesPage() {
  const { spaceId, expenseViews } = useWorkspace()
  const [params] = useSearchParams()
  const remembered = expenseViews?.[spaceId]?.query
  const [restoreTarget] = useState(() => {
    if (!remembered || listQuery(params) || (params.size && !params.has('nuevo'))) return null
    const next = new URLSearchParams(remembered)
    for (const [key, value] of params) next.set(key, value)
    return next.toString()
  })
  const [restored, setRestored] = useState(!restoreTarget)
  const currentQuery = params.toString()
  useEffect(() => { if (restoreTarget === currentQuery) setRestored(true) }, [restoreTarget, currentQuery])
  if (!restored && currentQuery !== restoreTarget) return <Navigate replace to={`/espacios/${spaceId}/gastos?${restoreTarget}`} />
  return <ExpenseScreen />
}

function ExpenseScreen() {
  const { spaceId, session, expenseViews, rememberExpenseView } = useWorkspace()
  const userId = session?.usuario?.id
  const [params, setParams] = useSearchParams()
  const tab = params.has('nuevo') ? params.get('modo') === 'lote' ? 'lote' : 'individual' : 'lista'
  const { confirm, notify } = useUI()
  const base = `/api/v1/espacios/${spaceId}/gastos`
  const dates = new URLSearchParams([...params].filter(([key]) => ['desde', 'hasta'].includes(key)))
  const { resource, membersState, members, api, revision } = useFeature(`${base}${dates.size ? `?${dates}` : ''}`)
  const history = useApiResource(api, tab === 'lista' ? null : base, { revision })
  const [values, setValues] = useState(() => ({ individual: readSaved(userId, spaceId, 'individual') || {}, lote: readSaved(userId, spaceId, 'lote') || {} }))
  const [generation, setGeneration] = useState(0)
  const [draftLocation, setDraftLocation] = useState('tab')
  const [receipt, setReceipt] = useState(null)
  const [detail, setDetail] = useState(null)
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const latest = useRef({ tab, query: listQuery(params) })
  latest.current = { tab, query: listQuery(params) }
  const query = listQuery(params)
  const term = (params.get('q') || '').trim().toLocaleLowerCase('es-AR')
  const expenses = term ? resource.data.filter(expense => [expense.descripcion, expense.pagadorNombre].some(value => value?.toLocaleLowerCase('es-AR').includes(term))) : resource.data
  const singleDraft = readSaved(userId, spaceId, 'individual')
  const batchDraft = readSaved(userId, spaceId, 'lote')

  useEffect(() => { rememberExpenseView?.(spaceId, { query }) }, [spaceId, query, rememberExpenseView])
  useEffect(() => () => {
    if (latest.current.tab === 'lista') rememberExpenseView?.(spaceId, { query: latest.current.query, scroll: window.scrollY })
  }, [spaceId, rememberExpenseView])
  useEffect(() => {
    if (tab !== 'lista' || resource.loading || membersState.loading) return
    const frame = requestAnimationFrame(() => window.scrollTo({ top: expenseViews?.[spaceId]?.scroll || 0, behavior: 'instant' }))
    return () => cancelAnimationFrame(frame)
    // La posición se restaura al volver o terminar de cargar, no al desplazarse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, resource.loading, membersState.loading, query, spaceId])

  const saveSingle = useCallback(value => {
    setValues(previous => ({ ...previous, individual: value }))
    if (hasDraftContent(value)) setDraftLocation(saveDraft(userId, spaceId, 'individual', value))
    else removeDraft(userId, spaceId, 'individual')
  }, [userId, spaceId])
  const saveBatch = useCallback(value => {
    setValues(previous => ({ ...previous, lote: value }))
    if (value.gastos.some(hasDraftContent) || hasDraftContent(value.removed?.expense)) setDraftLocation(saveDraft(userId, spaceId, 'lote', value))
    else removeDraft(userId, spaceId, 'lote')
  }, [userId, spaceId])

  function changeFilter(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    rememberExpenseView?.(spaceId, { query: listQuery(next), scroll: 0 })
    setParams(next, { replace: true })
  }
  function clearFilters() {
    rememberExpenseView?.(spaceId, { query: '', scroll: 0 })
    setParams({})
  }
  async function openForm(kind, source) {
    if (source && readSaved(userId, spaceId, 'individual') && !await confirm({ title: '¿Reemplazar el borrador individual?', description: 'Hay un gasto sin registrar. Podés retomarlo desde el listado o reemplazarlo con este gasto anterior.', confirmLabel: 'Reemplazar borrador' })) return
    if (tab === 'lista') rememberExpenseView?.(spaceId, { scroll: window.scrollY })
    setValues(previous => ({ ...previous, [kind]: source ? repeatExpense(source, members) : readSaved(userId, spaceId, kind) || {} }))
    setGeneration(value => value + 1)
    const next = new URLSearchParams(params); next.set('nuevo', '1'); next.set('modo', kind)
    setParams(next)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  function closeForm() {
    const next = new URLSearchParams(params); next.delete('nuevo'); next.delete('modo')
    setParams(next, { replace: true })
  }
  function saved(response) {
    removeDraft(userId, spaceId, tab)
    if (!mounted.current) return
    const confirmed = (Array.isArray(response) ? response : [response]).filter(expense => expense?.id && expense.descripcion && expense.monto != null && Number.isFinite(Number(expense.monto)) && Number(expense.monto) > 0)
    setReceipt(confirmed.length ? confirmed : null)
    if (!confirmed.length) notify('Registro completado. Podés consultar los gastos en el listado.')
    setValues(previous => ({ ...previous, [tab]: {} })); setGeneration(value => value + 1)
    closeForm()
  }
  async function discard(kind) {
    if (!await confirm({ title: '¿Descartar este borrador?', description: 'Se quitarán los datos sin registrar de este borrador. Tus gastos registrados no cambian.', confirmLabel: 'Descartar borrador' })) return
    removeDraft(userId, spaceId, kind)
    setGeneration(value => value + 1)
  }

  return <div className={`feature-page expenses-page${tab !== 'lista' ? ' expenses-page--entry' : ''}`}>
    <PageHeader title={tab === 'lista' ? 'Gastos' : tab === 'individual' ? 'Registrar gasto' : 'Registrar por lote'} description={tab === 'lista' ? 'Lo que compartieron, en un solo lugar.' : 'Revisá el importe, la fecha y los participantes antes de registrar.'} actions={tab === 'lista' && <><Button variant="secondary" onClick={() => openForm('lote')}>{batchDraft ? 'Retomar lote' : 'Registrar por lote'}</Button><Button onClick={() => openForm('individual')}><Icon name="plus" size={18} />{singleDraft ? 'Retomar gasto' : 'Registrar gasto'}</Button></>} />
    {tab !== 'lista' ? <section className="space-y-4">
      <Button variant="ghost" className="expense-entry__back" onClick={closeForm}>Volver al listado</Button>
      {history.error && <InlineAlert tone="warning">No pudimos consultar los gastos anteriores para sugerir frecuentes o advertir coincidencias. Podés continuar revisando los datos.</InlineAlert>}
      {tab === 'individual' && !history.loading && history.data.length > 0 && <section className="expense-frequents" aria-label="Gastos frecuentes"><h2>Repetir un gasto anterior</h2><p>Accesos según lo que registraron en este espacio. Revisá el importe y la fecha.</p><div>{frequentExpenses(history.data).map(({ expense, count }) => <Button key={expense.id} variant="secondary" onClick={() => openForm('individual', expense)}><Icon name="repeat" size={16} />{expense.descripcion}{count > 1 && <span> · {count} registros</span>}</Button>)}</div></section>}
      <ResourceState resource={membersState}>{tab === 'individual'
        ? <ExpenseForm key={`single-${generation}`} spaceId={spaceId} members={members} initialValues={values[tab] || {}} onDraftChange={saveSingle} draftLocation={draftLocation} existingExpenses={history.data} onSuccess={saved} onCancel={closeForm} />
        : <ExpenseBatchForm key={`batch-${generation}`} spaceId={spaceId} members={members} initialValues={values[tab] || {}} onDraftChange={saveBatch} draftLocation={draftLocation} existingExpenses={history.data} onSuccess={saved} onCancel={closeForm} />}</ResourceState>
    </section> : <>
      <ExpenseReceipt expenses={receipt} onOpen={setDetail} onClose={() => setReceipt(null)} />
      {(singleDraft || batchDraft) && <ActionNotice icon="receipt" title="Tenés gastos sin registrar" description="Tus borradores están separados de los gastos del espacio. Podés retomarlos o descartarlos." action={<div className="expense-draft-actions">{singleDraft && <Button variant="ghost" onClick={() => discard('individual')}>Descartar borrador individual</Button>}{batchDraft && <Button variant="ghost" onClick={() => discard('lote')}>Descartar borrador del lote</Button>}</div>} />}
      <ResourceState resource={resource}><ResourceState resource={membersState}><div className="space-y-4">
        <ExpenseFilters search={params.get('q') || ''} onSearchChange={value => changeFilter('q', value)} desde={params.get('desde') || ''} onDesdeChange={value => changeFilter('desde', value)} hasta={params.get('hasta') || ''} onHastaChange={value => changeFilter('hasta', value)} onClear={clearFilters} totalResults={expenses.length} />
        {!expenses.length && (term || dates.size) ? <EmptyState icon="receipt" title="No encontramos gastos con estos filtros" description="Probá otra búsqueda o limpiá los filtros." action={<Button variant="secondary" onClick={clearFilters}>Limpiar filtros</Button>} /> : <ExpenseList expenses={expenses} members={members} spaceId={spaceId} onRepeat={expense => openForm('individual', expense)} onRegisterClick={() => openForm('individual')} />}
      </div></ResourceState></ResourceState>
    </>}
    {detail && <ExpenseDetail gasto={detail} spaceId={spaceId} members={members} open onClose={() => setDetail(null)} onRepeat={expense => { setDetail(null); openForm('individual', expense) }} />}
  </div>
}
