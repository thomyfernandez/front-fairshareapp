import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Button, Field, Icon } from '../../components/ui'
import { dateLabel, money } from '../../lib/format'
import { ParticipantsSelector } from './ParticipantsSelector'

import { ExpenseCategoryPicker } from './ExpenseCategoryPicker'
import { expenseIcon } from '../../components/ui/expense-icons'
import { batchMemberName } from './expense-experience'

export function BatchExpenseItem({ expense: g, index, members, categories, busy, removable, complete, collapsed, focus, onCollapse, onRemove, onFieldChange, onParticipantsChange }) {
  const [splitOpen, setSplitOpen] = useState(false)
  const id = useId()
  const inputRef = useRef(null)
  const editRef = useRef(null)
  const hasErrors = Object.keys(g.errors).length > 0
  const isCollapsed = collapsed && complete && !hasErrors
  const custom = ['PORCENTUAL', 'MONTOS_FIJOS'].includes(g.tipoReparto)
  const showSplit = splitOpen || custom || Boolean(g.errors.participantes) || !g.validationState.isValid
  const names = g.participantes.map(part => batchMemberName(members, part.usuarioId))
  const people = names.length > 2 ? `${names.slice(0, 2).join(', ')} y ${names.length - 2} más` : names.join(' y ')
  const handleParticipants = useCallback((parts, state) => onParticipantsChange(g.tempId, parts, state), [g.tempId, onParticipantsChange])
  useEffect(() => { if (focus) inputRef.current?.focus() }, [focus])
  const previousCollapsed = useRef(isCollapsed)
  useEffect(() => {
    if (previousCollapsed.current !== isCollapsed) {
      if (isCollapsed) editRef.current?.focus()
      else inputRef.current?.focus()
    }
    previousCollapsed.current = isCollapsed
  }, [isCollapsed])

  return <section className={`expense-batch-item${isCollapsed ? ' expense-batch-item--collapsed' : ''}`} aria-label={`Gasto ${index + 1}`} onChangeCapture={() => onFieldChange(g.tempId, 'touched', true)}>
    {isCollapsed && <div className="expense-batch-item__summary">
      <span className="expense-batch-item__identity"><span className="expense-batch-item__badge" aria-hidden="true">{index + 1}</span><span className="ui-item-icon"><Icon name={expenseIcon(g.categoriaNombre, g.descripcion, g.icono)} /></span></span>
      <div><strong>{g.descripcion}</strong><p>{dateLabel(g.fecha, { compact: true })} · Pagó {batchMemberName(members, g.pagadorId)}</p></div>
      <strong>{money(g.monto)}</strong>
      <Button ref={editRef} variant="ghost" aria-label={`Editar gasto ${index + 1}: ${g.descripcion}`} onClick={() => onCollapse(g.tempId, false)} disabled={busy}>Editar</Button>
    </div>}
    {/* Se conserva montado el selector para no perder el reparto al plegar. */}
    <div hidden={isCollapsed} className="expense-batch-item__editor">
      <div className="expense-batch-item__header">
        <div className="expense-batch-item__identity"><span className="expense-batch-item__number expense-batch-item__badge"><span className="sr-only">Gasto </span>{index + 1}</span><ExpenseCategoryPicker categories={categories} compact label={`Categoría del gasto ${index + 1}`} value={g.categoriaId} onChange={value => { onFieldChange(g.tempId, 'categoriaId', value.id); onFieldChange(g.tempId, 'categoriaNombre', value.id == null ? null : value.nombre); onFieldChange(g.tempId, 'icono', null); onFieldChange(g.tempId, 'touched', true) }} description={g.descripcion} category={g.categoriaNombre} disabled={busy} /></div>
        <Field ref={inputRef} className="expense-batch-item__name" label="Descripción" maxLength={255} value={g.descripcion} onChange={e => onFieldChange(g.tempId, 'descripcion', e.target.value)} error={g.errors.descripcion} placeholder="Escribí una descripción…" required disabled={busy} />
        {removable && <Button variant="ghost" size="small" onClick={() => onRemove(g.tempId)} disabled={busy} className="expense-batch-item__remove text-error" aria-label={`Quitar gasto número ${index + 1} de la selección`}><Icon name="close" size={14} />Quitar</Button>}
      </div>
      <div className="expense-batch-item__fields">
        <Field label="Monto ($)" type="number" min="0.01" step="0.01" value={g.monto} onChange={e => onFieldChange(g.tempId, 'monto', e.target.value)} error={g.errors.monto} placeholder="0.00" required disabled={busy} />
        <Field label="Fecha" type="date" value={g.fecha} onChange={e => onFieldChange(g.tempId, 'fecha', e.target.value)} error={g.errors.fecha} required disabled={busy} />
        <Field label="Pagó" hint={batchMemberName(members, g.pagadorId).length > 24 ? batchMemberName(members, g.pagadorId) : undefined} error={g.errors.pagadorId} required>
          <select value={g.pagadorId} onChange={e => onFieldChange(g.tempId, 'pagadorId', e.target.value)} disabled={busy} required><option value="">Seleccionar…</option>{members.map(member => { const memberId = member.usuarioId ?? member.id; return <option key={memberId} value={memberId}>{batchMemberName(members, memberId)}</option> })}</select>
        </Field>
        <Field label="Reparto"><select value={g.tipoReparto} onChange={e => onFieldChange(g.tempId, 'tipoReparto', e.target.value)} disabled={busy}><option value="EQUITATIVA">Equitativo</option><option value="PROPORCIONAL_INGRESOS">Según los ingresos</option><option value="PORCENTUAL">Porcentual (%)</option><option value="MONTOS_FIJOS">Montos fijos ($)</option></select></Field>
      </div>
      <div className="expense-batch-item__split">
        <div className="expense-batch-item__split-summary"><span><Icon name="users" size={18} /><span>{people ? `Entre ${people}` : 'Elegí los participantes'}</span></span>{!custom && !g.errors.participantes && g.validationState.isValid && <Button variant="ghost" onClick={() => setSplitOpen(value => !value)} disabled={busy} aria-expanded={showSplit} aria-controls={id}>{showSplit ? 'Ocultar reparto' : 'Editar reparto'}</Button>}</div>
        <div id={id} hidden={!showSplit}>
          <ParticipantsSelector compact members={members} tipoReparto={g.tipoReparto} monto={Math.max(0, Number(g.monto) || 0)} value={g.participantes} initialSelection={g.selection} onInteraction={() => onFieldChange(g.tempId, 'touched', true)} onChange={handleParticipants} disabled={busy} error={g.errors.participantes} />
        </div>
      </div>
      {complete && <div className="expense-batch-item__done"><Button variant="ghost" onClick={() => onCollapse(g.tempId, true)} disabled={busy} aria-label={`Plegar gasto ${index + 1}`}><Icon name="check" size={16} />Listo</Button></div>}
    </div>
  </section>
}
