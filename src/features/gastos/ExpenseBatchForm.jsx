import { useState, useCallback, useEffect, useRef } from 'react'
import { Button, Disclosure, Icon, InlineAlert, Modal, Submit, useUI } from '../../components/ui'
import { cents, dateLabel, money, today } from '../../lib/format'
import { useWorkspace } from '../../app/useWorkspace'
import { batchMemberName, batchSplitLabel, expensePayload, similarExpenses, validExpenseAmount } from './expense-experience'
import { BatchExpenseItem } from './BatchExpenseItem'

/**
 * Genera un nuevo objeto de gasto vacío con valores por defecto.
 */
function createEmptyExpense(tempId, defaultPayerId = '') {
  return {
    tempId,
    descripcion: '',
    monto: '',
    fecha: today(),
    pagadorId: defaultPayerId ? String(defaultPayerId) : '',
    tipoReparto: 'EQUITATIVA',
    participantes: [],
    validationState: { isValid: true, error: null },
    errors: {},
  }
}

/**
 * ExpenseBatchForm
 * Formulario para el registro masivo ("por lote") de múltiples gastos.
 *
 * Características clave:
 * - Envío de un array en una única petición POST.
 * - Advertencia visual de atomicidad: si uno falla, el backend rechaza el lote completo.
 * - Validación integral de cada elemento del lote antes del envío.
 * - UX Crítica: Conservación total de todos los gastos ingresados si la petición falla (ej. error 400).
 */
export function ExpenseBatchForm({
  spaceId: propSpaceId,
  members: propMembers,
  api: propApi,
  onSuccess,
  initialValues,
  onDraftChange,
  draftLocation,
  existingExpenses = [],
  onCancel,
  className = '',
}) {
  const workspace = useWorkspace()
  const { notify } = useUI()
  const submitting = useRef(false)
  const errorRef = useRef(null)

  const effectiveSpaceId = propSpaceId || workspace?.spaceId
  const effectiveMembers = propMembers || workspace?.members || []
  const effectiveApi = propApi || workspace?.api
  const currentUserId = workspace?.session?.usuario?.id

  const defaultPayerId =
    currentUserId && effectiveMembers.some(m => (m.usuarioId ?? m.id) === currentUserId)
      ? String(currentUserId)
      : effectiveMembers[0]
      ? String(effectiveMembers[0].usuarioId ?? effectiveMembers[0].id)
      : ''

  // Array dinámico de gastos en el lote
  const [gastos, setGastos] = useState(() => initialValues?.gastos?.length ? initialValues.gastos.map(item => ({ ...item, errors: {}, validationState: { isValid: false } })) : [
    createEmptyExpense(1, defaultPayerId),
  ])

  const [removed, setRemoved] = useState(initialValues?.removed || null)
  const nextId = useRef(Math.max(2, ...gastos.map(item => Number(item.tempId) || 0), Number(removed?.expense?.tempId) || 0) + 1)
  useEffect(() => {
    onDraftChange?.({ gastos: gastos.map(({ errors: _errors, validationState: _validation, ...value }) => value), removed })
  }, [gastos, removed, onDraftChange])

  const [collapsed, setCollapsed] = useState({})
  const [focusId, setFocusId] = useState(null)
  const [review, setReview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState(null)
  useEffect(() => { if (serverError) errorRef.current?.scrollIntoView?.({ block: 'center', behavior: 'instant' }) }, [serverError])

  // Agregar nuevo gasto al lote
  const handleAddExpense = () => {
    if (gastos.length + (removed ? 1 : 0) >= 100) return
    const id = nextId.current++
    setCollapsed(Object.fromEntries(gastos.map(g => [g.tempId, Object.keys(validateExpense(g)).length === 0])))
    setGastos(prev => [...prev, { ...createEmptyExpense(id, defaultPayerId), touched: true }])
    setFocusId(id)
  }

  // Eliminar un gasto del lote
  const handleRemoveExpense = (tempId) => {
    if (gastos.length <= 1) return
    setRemoved({ expense: { ...gastos.find(item => item.tempId === tempId), touched: true }, index: gastos.findIndex(item => item.tempId === tempId) })
    setGastos(prev => prev.filter(g => g.tempId !== tempId))
  }

  // Actualizar un campo individual de un gasto
  const handleFieldChange = (tempId, field, value) => {
    setGastos(prev =>
      prev.map(g => {
        if (g.tempId !== tempId) return g
        const nextErrors = { ...g.errors }
        if (nextErrors[field]) delete nextErrors[field]
        return { ...g, [field]: value, errors: nextErrors }
      })
    )
  }

  // Actualizar participantes calculados para un gasto del lote
  const handleParticipantsChange = useCallback((tempId, calculatedParticipants, validationState) => {
    setGastos(prev =>
      prev.map(g => {
        if (g.tempId !== tempId) return g
        const nextErrors = { ...g.errors }
        if (validationState.isValid && nextErrors.participantes) {
          delete nextErrors.participantes
        }
        return {
          ...g,
          participantes: calculatedParticipants,
          validationState,
          selection: validationState.selection,
          errors: nextErrors,
        }
      })
    )
  }, [])

  // Calcular el total monetario acumulado del lote
  const totalLoteCents = gastos.reduce((sum, g) => sum + cents(g.monto), 0)
  const totalLote = totalLoteCents / 100

  function validateExpense(g) {
    const itemErrors = {}

    if (!g.descripcion.trim() || g.descripcion.trim().length > 255) {
      itemErrors.descripcion = 'La descripción es obligatoria.'
    }

    if (!validExpenseAmount(g.monto)) {
      itemErrors.monto = 'El importe debe ser mayor a 0.'
    }

    if (!g.fecha) {
      itemErrors.fecha = 'La fecha es requerida.'
    }

    if (!g.pagadorId || !effectiveMembers.some(member => Number(member.usuarioId ?? member.id) === Number(g.pagadorId))) {
      itemErrors.pagadorId = 'Indica quién pagó.'
    }

    if (!g.participantes || g.participantes.length === 0) {
      itemErrors.participantes = 'Incluye al menos un participante.'
    } else if (!g.validationState.isValid) {
      itemErrors.participantes = g.validationState.error || 'Revisa la distribución del gasto.'
    } else {
      const uids = g.participantes.map(p => Number(p.usuarioId))
      if (new Set(uids).size !== uids.length) {
        itemErrors.participantes = 'Hay participantes duplicados en este gasto.'
      }
    }

    return itemErrors
  }

  // Envío del lote con validación estricta
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting.current) return
    setServerError(null)

    const updatedGastos = gastos.map(g => ({ ...g, errors: validateExpense(g) }))
    if (updatedGastos.some(g => Object.keys(g.errors).length)) {
      setGastos(updatedGastos)
      setCollapsed({})
      setServerError('Hay errores en uno o más gastos del lote. Revisá los campos resaltados.')
      return
    }
    const payload = gastos.map(expensePayload)
    const duplicates = payload.filter((expense, index) => similarExpenses(expense, [...existingExpenses, ...payload.slice(0, index)]).length > 0)
    setReview({ payload, items: gastos.map(g => ({ ...g, participantes: g.participantes.map(part => ({ ...part })) })), total: totalLote, duplicates })
  }

  const handleRegister = async () => {
    if (!review || submitting.current) return
    const snapshot = review
    submitting.current = true
    setBusy(true)

    // El endpoint recibe directamente un array de gastos.
    const payload = snapshot.payload

    try {
      if (!effectiveSpaceId) {
        throw new Error('No se identificó el espacio activo.')
      }

      const response = await effectiveApi(`/api/v1/espacios/${effectiveSpaceId}/gastos/lote`, { method: 'POST', body: payload })

      if (!onSuccess) notify(`Lote de ${snapshot.items.length} ${snapshot.items.length === 1 ? 'gasto' : 'gastos'} registrado con éxito.`, 'success')
      setReview(null)
      workspace?.invalidate?.()

      if (onSuccess) {
        onSuccess(response, payload)
      } else {
        // Limpiar solo en caso de éxito
        setGastos([createEmptyExpense(1, defaultPayerId)])
        setCollapsed({})
        setRemoved(null)
        setFocusId(null)
      }
    } catch (error) {
      // UX CRÍTICA: Conservar todos los datos del lote en caso de error
      const errorMsg =
        error?.message ||
        'No se pudo registrar el lote. Revisa los datos ingresados e intenta nuevamente.'
      setReview(null)
      setServerError(errorMsg)

    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <div className={`expense-batch-container expense-batch-workspace ${className}`}>
      <div className="expense-batch-context">
        {onDraftChange && <p className="expense-draft-hint">{draftLocation === 'memory' ? 'Borrador conservado durante esta sesión.' : draftLocation === 'unavailable' ? 'No pudimos conservar el borrador. Mantené esta pantalla abierta.' : 'Borrador guardado en esta pestaña.'}</p>}
        <Disclosure title="Cómo funciona" className="expense-batch-help"><p>Los gastos se registran juntos. Si uno tiene un error, el lote completo queda sin guardar. Revisá los datos antes de confirmar.</p></Disclosure>
      </div>
      {removed && <div className="expense-undo"><p role="status">Quitaste «{removed.expense.descripcion || 'Gasto sin descripción'}» del borrador.</p><Button variant="secondary" disabled={busy} onClick={() => { setGastos(previous => { const next = [...previous]; next.splice(Math.min(removed.index, next.length), 0, removed.expense); return next }); setCollapsed(previous => ({ ...previous, [removed.expense.tempId]: false })); setFocusId(removed.expense.tempId); setRemoved(null) }}>Deshacer</Button></div>}
      {serverError && <div ref={errorRef}><InlineAlert tone="error">{serverError}</InlineAlert></div>}
      <form onSubmit={handleSubmit} noValidate className="expense-batch-form">
        <div className="expense-batch-items">
          {gastos.map((g, index) => <BatchExpenseItem key={g.tempId} expense={g} index={index} members={effectiveMembers} busy={busy} removable={gastos.length > 1} complete={Object.keys(validateExpense(g)).length === 0} collapsed={collapsed[g.tempId]} focus={focusId === g.tempId} onCollapse={(id, value) => setCollapsed(previous => ({ ...previous, [id]: value }))} onRemove={handleRemoveExpense} onFieldChange={handleFieldChange} onParticipantsChange={handleParticipantsChange} />)}
        </div>
        <Button variant="secondary" onClick={handleAddExpense} disabled={busy || gastos.length + (removed ? 1 : 0) >= 100} className="expense-batch-add"><Icon name="plus" size={16} />Agregar otro gasto al lote</Button>
        <div className="expense-batch-footer">
          <div><span>{gastos.length} {gastos.length === 1 ? 'gasto en el lote' : 'gastos en el lote'}</span><strong>{money(totalLote)}</strong></div>
          <div className="expense-batch-footer__actions">{onCancel && <Button variant="ghost" onClick={onCancel} disabled={busy}>{onDraftChange ? 'Guardar borrador y salir' : 'Cancelar'}</Button>}<Submit busy={busy}>Revisar lote</Submit></div>
        </div>
      </form>
      <Modal open={Boolean(review)} title="Revisar lote" description="Confirmá los importes y el reparto antes de registrar." dismissible={!busy} onClose={() => { if (!busy) setReview(null) }} className="expense-batch-review" footer={<><Button variant="secondary" data-autofocus disabled={busy} onClick={() => setReview(null)}>Volver a editar</Button><Button loading={busy} onClick={handleRegister}>{review?.duplicates.length ? 'Registrar de todos modos' : 'Registrar lote'}</Button></>}>
        {review && <>
          {review.duplicates.length > 0 && <InlineAlert tone="warning"><strong>Posibles gastos repetidos</strong><p>Hay coincidencias en descripción, fecha e importe con otro registro o con una fila del lote: {review.duplicates.map((item, index) => <span key={index}>{index > 0 ? '; ' : ''}{item.descripcion} ({money(item.monto)}, {dateLabel(item.fecha)})</span>)}. Podés volver a editar o registrarlos de todos modos.</p></InlineAlert>}
          <ol className="expense-batch-review__items">{review.items.map(g => <li key={g.tempId}><div><strong>{g.descripcion}</strong><strong>{money(g.monto)}</strong></div><p>{dateLabel(g.fecha)} · Pagó {batchMemberName(effectiveMembers, g.pagadorId)}</p><p>{batchSplitLabel(g.tipoReparto)}{g.tipoReparto === 'PROPORCIONAL_INGRESOS' ? ' · Se calcula al registrar' : ' · Reparto estimado'}</p><ul>{g.participantes.map(part => <li key={part.usuarioId}><span>{batchMemberName(effectiveMembers, part.usuarioId)}</span><span>{g.tipoReparto === 'PROPORCIONAL_INGRESOS' ? 'Según ingresos' : g.tipoReparto === 'PORCENTUAL' ? `${part.porcentaje}% · ${money(part.importe)}` : money(part.importe)}</span></li>)}</ul></li>)}</ol>
          <div className="expense-batch-review__total"><span>Total · {review.items.length} {review.items.length === 1 ? 'gasto' : 'gastos'}</span><strong>{money(review.total)}</strong></div>
          <p className="text-sm text-secondary">Se guardan todos juntos en este espacio. Este registro no confirma pagos entre personas.</p>
        </>}
      </Modal>
    </div>
  )
}
