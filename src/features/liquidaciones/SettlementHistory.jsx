import { useState } from 'react'
import { Button, EmptyState, Field, Icon, InlineAlert, Money, PanelDisclosure, ResourceState, SectionHeading } from '../../components/ui'
import { dateLabel, monthOptions, periodLabel } from '../../lib/format'
import { FILTER_KEYS, historyQuery } from './model'

function HistoryFilters({ filters, onApply, onClear }) {
  const now = new Date()
  const [modo, setModo] = useState(filters.modo || 'periodo')
  const [error, setError] = useState(null)

  function submit(event) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    const next = modo === 'periodo' ? { modo, mes: data.mes, anio: data.anio } : { modo, desde: data.desde, hasta: data.hasta }
    const { error: invalid } = historyQuery(next)
    setError(invalid)
    if (!invalid) onApply(next)
  }

  return <form onSubmit={submit} aria-label="Filtrar historial">
    <fieldset className="settlement-history__filter-mode">
      <legend className="sr-only">Tipo de filtro</legend>
      <label className="settlement-history__radio"><input type="radio" name="modo" value="periodo" checked={modo === 'periodo'} onChange={() => setModo('periodo')} />Por período</label>
      <label className="settlement-history__radio"><input type="radio" name="modo" value="fechas" checked={modo === 'fechas'} onChange={() => setModo('fechas')} />Por fechas de cierre</label>
    </fieldset>
    <div className="settlement-history__filter-fields">
      {modo === 'periodo' ? <>
        <Field label="Mes"><select name="mes" defaultValue={filters.mes || now.getMonth() + 1}>{monthOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <Field label="Año" name="anio" type="number" min="2000" max="9999" required defaultValue={filters.anio || now.getFullYear()} />
      </> : <>
        <Field label="Desde" name="desde" type="date" defaultValue={filters.desde} error={error || undefined} />
        <Field label="Hasta" name="hasta" type="date" defaultValue={filters.hasta} />
      </>}
      <Button type="submit" variant="secondary">Filtrar</Button>
      {filters.modo && <Button variant="ghost" onClick={() => { setError(null); onClear() }}>Limpiar filtros</Button>}
    </div>
  </form>
}

function filterSummary(filters) {
  if (filters.modo === 'periodo') return `Período: ${periodLabel(Number(filters.mes), Number(filters.anio))}`
  if (filters.modo === 'fechas') return `Cerradas ${filters.desde ? `desde ${dateLabel(filters.desde)}` : ''}${filters.desde && filters.hasta ? ' ' : ''}${filters.hasta ? `hasta ${dateLabel(filters.hasta)}` : ''}`.trim()
  return null
}

export function SettlementHistory({ resource, filters, onApply, onClear, onOpen, onPending }) {
  const settlements = resource.data
  const summary = filterSummary(filters)
  return <section className="settlement-history">
    {(settlements.length > 0 || summary) && <>
      <SectionHeading title="Historial de cierres" />
      <PanelDisclosure title="Filtrar cierres" icon="receipt" open={summary ? true : undefined}><HistoryFilters key={FILTER_KEYS.map(key => filters[key]).join('|')} filters={filters} onApply={onApply} onClear={onClear} /></PanelDisclosure>
    </>}
    {summary && <InlineAlert tone="info">Mostrando cierres filtrados. {summary}.</InlineAlert>}
    <ResourceState resource={resource}>
      {settlements.length ? <ul aria-label="Liquidaciones" className="settlement-history__list">
        {settlements.map(settlement => <li className="settlement-history__item" key={settlement.id}><span className="ui-item-icon"><Icon name="check" /></span>
          <div>
            <strong>Liquidación #{settlement.id}</strong>
            <small className="block text-secondary">
              {periodLabel(settlement.mes, settlement.anio)} · cerrada el {dateLabel(settlement.fechaLiquidacion)} · {settlement.cantidadGastos} {settlement.cantidadGastos === 1 ? 'gasto' : 'gastos'}
            </small>
            {settlement.descripcion && <small className="block text-secondary">{settlement.descripcion}</small>}
          </div>
          <strong><Money value={settlement.montoTotal} hideZeroDecimals /></strong>
          <Button variant="secondary" onClick={() => onOpen(settlement)} aria-label={`Ver detalle de la liquidación #${settlement.id}`}>Ver detalle</Button>
        </li>)}
      </ul> : summary
        ? <EmptyState title="No hay cierres para este filtro" description="Probá con otro período o limpiá los filtros." action={<Button variant="secondary" onClick={onClear}>Limpiar filtros</Button>} />
        : <EmptyState icon="archive" title="Tu historial empieza con el primer cierre" description="Los gastos que liquides van a quedar registrados acá, con su período y su detalle." action={onPending && <Button variant="secondary" onClick={onPending}>Ver gastos pendientes</Button>} />}
    </ResourceState>
  </section>
}
