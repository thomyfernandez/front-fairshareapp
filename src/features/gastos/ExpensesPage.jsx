import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useSearchParams } from 'react-router'
import { Button, EmptyState, Icon, InlineAlert, PageHeader, ResourceState, useUI } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { useApiResource } from '../../hooks/useApiResource'
import { useWorkspace } from '../../app/useWorkspace'
import { removeDraft, saveDraft } from '../../lib/draft-storage'
import { readExpenseDraft as readSaved } from './expense-drafts'
import { EXPENSE_PAGE_SIZES, frequentExpenses, hasDraftContent, repeatExpense } from './expense-experience'
import { ExpenseForm } from './ExpenseForm'
import { ExpenseFilters } from './ExpenseFilters'
import { ExpenseList } from './ExpenseList'
import { ExpenseBatchForm } from './ExpenseBatchForm'
import { ExpenseDetail } from './ExpenseDetail'
import { ExpenseReceipt } from './ExpenseReceipt'
import { ExpensePagination } from './ExpensePagination'
import { rememberExpenseView, selectExpenseView } from './expenseViewsSlice'

const listQuery = params => new URLSearchParams([...params].filter(([key]) => ['desde', 'hasta', 'q', 'pagina', 'cantidad'].includes(key))).toString()
export default function ExpensesPage() {
  const { spaceId } = useWorkspace()
  const [params] = useSearchParams()
  const remembered = useSelector(state => selectExpenseView(state, spaceId))?.query
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
  const { spaceId, session } = useWorkspace()
  const savedView = useSelector(state => selectExpenseView(state, spaceId))
  const dispatch = useDispatch()
  const remember = useCallback((id, view) => dispatch(rememberExpenseView(id, view)), [dispatch])
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
  const filtered = term ? resource.data.filter(expense => [expense.descripcion, expense.pagadorNombre].some(value => value?.toLocaleLowerCase('es-AR').includes(term))) : resource.data
  const expenses = [...filtered].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || Number(b.id) - Number(a.id))
  const pageSize = EXPENSE_PAGE_SIZES.includes(Number(params.get('cantidad'))) ? Number(params.get('cantidad')) : 10
  const requestedPage = /^\d+$/.test(params.get('pagina') || '') && Number.isSafeInteger(Number(params.get('pagina'))) ? Math.max(1, Number(params.get('pagina'))) : 1
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(expenses.length / pageSize)))
  const visibleExpenses = expenses.slice((page - 1) * pageSize, page * pageSize)
  const listStart = useRef(null)
  const focusPageStart = useRef(false)

  // Si una eliminación reduce las páginas, corregir también la URL al terminar la carga.
  useEffect(() => {
    if (tab !== 'lista' || resource.loading || resource.error) return
    const next = new URLSearchParams(params)
    if (requestedPage !== page) focusPageStart.current = true
    if (page === 1) next.delete('pagina'); else next.set('pagina', String(page))
    if (pageSize === 10) next.delete('cantidad'); else next.set('cantidad', String(pageSize))
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
  }, [page, pageSize, params, setParams, resource.loading, resource.error, requestedPage, tab])

  useEffect(() => {
    if (!focusPageStart.current || tab !== 'lista' || resource.loading || membersState.loading) return
    const frame = requestAnimationFrame(() => {
      listStart.current?.focus({ preventScroll: true })
      listStart.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
      focusPageStart.current = false
    })
    return () => cancelAnimationFrame(frame)
  }, [page, pageSize, tab, resource.loading, membersState.loading])
  const singleDraft = readSaved(userId, spaceId, 'individual')
  const batchDraft = readSaved(userId, spaceId, 'lote')

  useEffect(() => { remember(spaceId, { query }) }, [spaceId, query, remember])
  useEffect(() => () => {
    if (latest.current.tab === 'lista') remember(spaceId, { query: latest.current.query, scroll: window.scrollY })
  }, [spaceId, remember])
  useEffect(() => {
    if (tab !== 'lista' || resource.loading || membersState.loading || focusPageStart.current) return
    const frame = requestAnimationFrame(() => window.scrollTo({ top: savedView?.scroll || 0, behavior: 'instant' }))
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
    next.delete('pagina')
    remember(spaceId, { query: listQuery(next), scroll: 0 })
    setParams(next, { replace: true })
  }
  function clearFilters() {
    const next = new URLSearchParams()
    if (pageSize !== 10) next.set('cantidad', String(pageSize))
    remember(spaceId, { query: next.toString(), scroll: 0 })
    setParams(next)
  }
  function changePage(nextPage, nextSize = pageSize) {
    const next = new URLSearchParams(params)
    if (nextPage > 1) next.set('pagina', String(nextPage)); else next.delete('pagina')
    if (nextSize !== 10) next.set('cantidad', String(nextSize)); else next.delete('cantidad')
    focusPageStart.current = true
    remember(spaceId, { query: listQuery(next), scroll: 0 })
    setParams(next)
  }
  async function openForm(kind, source) {
    if (source && readSaved(userId, spaceId, 'individual') && !await confirm({ title: '¿Reemplazar el borrador individual?', description: 'Hay un gasto sin registrar. Podés retomarlo desde el listado o reemplazarlo con este gasto anterior.', confirmLabel: 'Reemplazar borrador' })) return
    if (tab === 'lista') remember(spaceId, { scroll: window.scrollY })
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
    if (!await confirm({ title: kind === 'lote' ? '¿Descartar el borrador de estos gastos?' : '¿Descartar el borrador individual?', description: 'Se quitarán los datos sin registrar de este borrador. Tus gastos registrados no cambian.', confirmLabel: 'Descartar borrador' })) return
    removeDraft(userId, spaceId, kind)
    setGeneration(value => value + 1)
  }

  return <div className={`feature-page expenses-page${tab !== 'lista' ? ' expenses-page--entry' : ''}`}>
    <PageHeader title={tab === 'lista' ? 'Gastos' : tab === 'individual' ? 'Registrar gasto' : 'Agregar varios gastos'} description={tab === 'lista' ? 'Lo que compartieron, en un solo lugar.' : 'Revisá el importe, la fecha y los participantes antes de registrar.'} actions={tab === 'lista' && (!batchDraft || !singleDraft) && <>{!batchDraft && <Button variant="secondary" onClick={() => openForm('lote')}>Agregar varios gastos</Button>}{!singleDraft && <Button onClick={() => openForm('individual')}><Icon name="plus" size={18} />Registrar gasto</Button>}</>} />
    {tab !== 'lista' ? <section className="space-y-4">
      <Button variant="ghost" className="expense-entry__back" onClick={closeForm}>Volver al listado</Button>
      {history.error && <InlineAlert tone="warning">No pudimos consultar los gastos anteriores para sugerir frecuentes o advertir coincidencias. Podés continuar revisando los datos.</InlineAlert>}
      {tab === 'individual' && !history.loading && history.data.length > 0 && <section className="expense-frequents" aria-label="Gastos frecuentes"><h2>Repetir un gasto anterior</h2><p>Accesos según lo que registraron en este espacio. Revisá el importe y la fecha.</p><div>{frequentExpenses(history.data).map(({ expense, count }) => <Button key={expense.id} variant="secondary" onClick={() => openForm('individual', expense)}><Icon name="repeat" size={16} />{expense.descripcion}{count > 1 && <span> · {count} registros</span>}</Button>)}</div></section>}
      <ResourceState resource={membersState}>{tab === 'individual'
        ? <ExpenseForm key={`single-${generation}`} spaceId={spaceId} members={members} initialValues={values[tab] || {}} onDraftChange={saveSingle} draftLocation={draftLocation} existingExpenses={history.data} onSuccess={saved} onCancel={closeForm} />
        : <ExpenseBatchForm key={`batch-${generation}`} spaceId={spaceId} members={members} initialValues={values[tab] || {}} onDraftChange={saveBatch} draftLocation={draftLocation} existingExpenses={history.data} onSuccess={saved} onCancel={closeForm} />}</ResourceState>
    </section> : <>
      <ExpenseReceipt expenses={receipt} onOpen={setDetail} onClose={() => setReceipt(null)} />
      {(singleDraft || batchDraft) && <section className="expense-drafts" aria-labelledby="expense-drafts-heading">
        <header className="expense-drafts__heading"><Icon name="receipt" /><div><h2 id="expense-drafts-heading">Tenés gastos sin registrar</h2><p>Todavía no forman parte de los gastos del espacio.</p></div></header>
        <div className="expense-drafts__list">
          {[singleDraft && { kind: 'individual', title: 'Gasto individual', description: singleDraft.descripcion.trim() || 'Sin descripción', resumeLabel: 'Retomar gasto', discardLabel: 'Descartar borrador individual' }, batchDraft && { kind: 'lote', title: 'Varios gastos', description: `${batchDraft.gastos.length} ${batchDraft.gastos.length === 1 ? 'gasto' : 'gastos'} en el borrador`, resumeLabel: 'Retomar gastos', discardLabel: 'Descartar borrador de varios gastos' }].filter(Boolean).map(draft => <div key={draft.kind} className="expense-draft-row" role="group" aria-label={draft.title}>
            <div className="expense-draft-row__info"><h3>{draft.title}</h3><p>{draft.description}</p></div>
            <div className="expense-draft-actions"><Button aria-label={draft.resumeLabel} onClick={() => openForm(draft.kind)}>Retomar</Button><Button variant="secondary" className="expense-draft-discard" aria-label={draft.discardLabel} onClick={() => discard(draft.kind)}><Icon name="trash" size={16} />Descartar</Button></div>
          </div>)}
        </div>
      </section>}
      <ResourceState resource={resource}><ResourceState resource={membersState}><div className="space-y-4">
        <ExpenseFilters search={params.get('q') || ''} onSearchChange={value => changeFilter('q', value)} desde={params.get('desde') || ''} onDesdeChange={value => changeFilter('desde', value)} hasta={params.get('hasta') || ''} onHastaChange={value => changeFilter('hasta', value)} onClear={clearFilters} totalResults={expenses.length} />
        {!expenses.length && (term || dates.size) ? <EmptyState icon="receipt" title="No encontramos gastos con estos filtros" description="Probá otra búsqueda o limpiá los filtros." action={<Button variant="secondary" onClick={clearFilters}>Limpiar filtros</Button>} /> : <>
          {expenses.length > 0 && <h2 ref={listStart} tabIndex={-1} className="expense-page-start">Gastos de esta página</h2>}
          <ExpenseList expenses={visibleExpenses} listId="expenses-list" members={members} spaceId={spaceId} onRepeat={expense => openForm('individual', expense)} onRegisterClick={() => openForm('individual')} />
          {expenses.length > 0 && <ExpensePagination total={expenses.length} page={page} pageSize={pageSize} listId="expenses-list" onPageChange={changePage} onPageSizeChange={size => changePage(1, size)} />}
        </>}
      </div></ResourceState></ResourceState>
    </>}
    {detail && <ExpenseDetail gasto={detail} spaceId={spaceId} members={members} open onClose={() => setDetail(null)} onRepeat={expense => { setDetail(null); openForm('individual', expense) }} />}
  </div>
}
