import { useState, useCallback, useEffect, useRef } from 'react'
import { Button, Card, Field, Icon, InlineAlert, PanelDisclosure, Submit, useUI } from '../../components/ui'
import { cents, money, today } from '../../lib/format'
import { useWorkspace } from '../../app/useWorkspace'
import { expensePayload, similarExpenses, validExpenseAmount } from './expense-experience'
import { ParticipantsSelector } from './ParticipantsSelector.jsx'

// Mantiene estable el callback de cada selector al editar otra fila del lote.
function BatchParticipants({ expenseId, onChange, ...props }) {
  const handleChange = useCallback((parts, state) => onChange(expenseId, parts, state), [expenseId, onChange])
  return <ParticipantsSelector {...props} onChange={handleChange} />
}

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
  const { notify, confirm } = useUI()
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
    createEmptyExpense(2, defaultPayerId),
  ])

  const [removed, setRemoved] = useState(initialValues?.removed || null)
  const nextId = useRef(Math.max(2, ...gastos.map(item => Number(item.tempId) || 0), Number(removed?.expense?.tempId) || 0) + 1)
  useEffect(() => {
    onDraftChange?.({ gastos: gastos.map(({ errors: _errors, validationState: _validation, ...value }) => value), removed })
  }, [gastos, removed, onDraftChange])

  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState(null)
  useEffect(() => { if (serverError) errorRef.current?.scrollIntoView?.({ block: 'center', behavior: 'instant' }) }, [serverError])

  // Agregar nuevo gasto al lote
  const handleAddExpense = () => {
    if (gastos.length + (removed ? 1 : 0) >= 100) return
    const id = nextId.current++
    setGastos(prev => [...prev, { ...createEmptyExpense(id, defaultPayerId), touched: true }])
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

  // Envío del lote con validación estricta
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting.current) return
    setServerError(null)

    let hasAnyError = false
    const updatedGastos = gastos.map((g) => {
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

      if (Object.keys(itemErrors).length > 0) {
        hasAnyError = true
      }

      return { ...g, errors: itemErrors }
    })

    if (hasAnyError) {
      setGastos(updatedGastos)
      setServerError('Hay errores en uno o más gastos del lote. Revisá los campos resaltados.')
      return
    }

    setBusy(true)

    // El endpoint recibe directamente un array de gastos.
    const payload = gastos.map(expensePayload)
    submitting.current = true

    try {
      if (!effectiveSpaceId) {
        throw new Error('No se identificó el espacio activo.')
      }

      const duplicates = payload.filter((expense, index) => similarExpenses(expense, [...existingExpenses, ...payload.slice(0, index)]).length > 0)
      if (duplicates.length && !await confirm({ title: 'Posibles gastos repetidos en el lote', description: `${duplicates.length} ${duplicates.length === 1 ? 'gasto coincide' : 'gastos coinciden'} en concepto, importe y fecha con otro registro o con una fila del lote: ${duplicates.slice(0, 5).map(item => `${item.descripcion} (${money(item.monto)}, ${item.fecha})`).join('; ')}. Revisá los datos antes de continuar.`, confirmLabel: 'Registrar de todos modos' })) return
      const response = await effectiveApi(`/api/v1/espacios/${effectiveSpaceId}/gastos/lote`, { method: 'POST', body: payload })

      if (!onSuccess) notify(`Lote de ${gastos.length} gastos registrado con éxito.`, 'success')
      workspace?.invalidate?.()

      if (onSuccess) {
        onSuccess(response, payload)
      } else {
        // Limpiar solo en caso de éxito
        setGastos([
          createEmptyExpense(1, defaultPayerId),
          createEmptyExpense(2, defaultPayerId),
        ])
      }
    } catch (error) {
      // UX CRÍTICA: Conservar todos los datos del lote en caso de error
      const errorMsg =
        error?.message ||
        'No se pudo registrar el lote. Revisa los datos ingresados e intenta nuevamente.'
      setServerError(errorMsg)

    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <Card className={`expense-batch-container space-y-6 ${className}`}>
      {onDraftChange && <p className="expense-draft-hint">{draftLocation === 'memory' ? 'El borrador se conserva mientras mantengas esta sesión abierta.' : draftLocation === 'unavailable' ? 'No pudimos conservar un borrador. Mantené esta pantalla abierta.' : 'El borrador se guarda en esta pestaña. Podés salir y retomarlo después.'}</p>}
      {removed && <div className="expense-undo"><p role="status">Quitaste «{removed.expense.descripcion || 'Gasto sin descripción'}» del borrador.</p><Button variant="secondary" disabled={busy} onClick={() => { setGastos(previous => { const next = [...previous]; next.splice(Math.min(removed.index, next.length), 0, removed.expense); return next }); setRemoved(null) }}>Deshacer</Button></div>}
      {/* Cabecera y Alerta Crítica de Atomicidad */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold text-primary">Los gastos del lote</h2>
            <p className="text-sm text-secondary">
              Agrega múltiples gastos y envíalos en una sola operación compartida.
            </p>
          </div>

          {totalLote > 0 && <div className="text-right">
            <span className="text-xs text-secondary block">Total del lote ({gastos.length} gastos)</span>
            <strong className="text-xl font-bold text-brand-primary block">{money(totalLote)}</strong>
          </div>}
        </div>

        {/* Notificación visual de la regla de lote transaccional */}
        <PanelDisclosure title="Cómo funciona el registro por lote" icon="info">
          <p>Revisá todos los gastos antes de guardarlos. Se registran juntos: si uno tiene un error, el lote completo queda sin guardar.</p>
        </PanelDisclosure>

        {serverError && (
          <div ref={errorRef}><InlineAlert tone="error">{serverError}</InlineAlert></div>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Listado dinámico de formularios de gasto */}
        <div className="space-y-4">
          {gastos.map((g, index) => {
            const numericMonto = Math.max(0, parseFloat(g.monto) || 0)

            return (
              <div
                key={g.tempId}
                onChangeCapture={() => handleFieldChange(g.tempId, 'touched', true)}
                className="p-4 border border-subtle rounded-xl bg-panel space-y-4 relative transition-shadow hover:shadow-subtle"
              >
                <div className="expense-batch-item__header">
                  <span className="expense-batch-item__number w-6 h-6 rounded-full bg-brand-primary text-inverse text-xs font-semibold flex items-center justify-center">
                    <span className="sr-only">Gasto </span>
                    {index + 1}
                  </span>
                  <Field
                    className="expense-batch-item__name"
                    label="Descripción"
                    maxLength={255}
                    value={g.descripcion}
                    onChange={e => handleFieldChange(g.tempId, 'descripcion', e.target.value)}
                    error={g.errors.descripcion}
                    placeholder="Escribí una descripción…"
                    required
                    disabled={busy}
                  />
                  {gastos.length > 1 && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => handleRemoveExpense(g.tempId)}
                      disabled={busy}
                      className="expense-batch-item__remove text-xs text-error hover:bg-error-background px-2 py-1 min-h-[44px]"
                      aria-label={`Quitar gasto número ${index + 1} del lote`}
                    >
                      <Icon name="close" size={14} />
                      Quitar
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Field
                    label="Monto ($)"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={g.monto}
                    onChange={e => handleFieldChange(g.tempId, 'monto', e.target.value)}
                    error={g.errors.monto}
                    placeholder="0.00"
                    required
                    disabled={busy}
                  />

                  <Field
                    label="Fecha"
                    type="date"
                    value={g.fecha}
                    onChange={e => handleFieldChange(g.tempId, 'fecha', e.target.value)}
                    error={g.errors.fecha}
                    required
                    disabled={busy}
                  />

                  <Field label="Pagó" error={g.errors.pagadorId} required>
                    <select
                      value={g.pagadorId}
                      onChange={e => handleFieldChange(g.tempId, 'pagadorId', e.target.value)}
                      disabled={busy}
                      required
                      className="ui-input"
                    >
                      <option value="">Seleccionar...</option>
                      {effectiveMembers.map(m => {
                        const id = m.usuarioId ?? m.id
                        return (
                          <option key={id} value={id}>
                            {m.nombreUsuario ?? m.nombre ?? `Usuario ${id}`}
                          </option>
                        )
                      })}
                    </select>
                  </Field>

                  <Field label="Reparto">
                    <select
                      value={g.tipoReparto}
                      onChange={e => handleFieldChange(g.tempId, 'tipoReparto', e.target.value)}
                      disabled={busy}
                      className="ui-input"
                    >
                      <option value="EQUITATIVA">Equitativo</option>
                      <option value="PROPORCIONAL_INGRESOS">Según los ingresos</option>
                      <option value="PORCENTUAL">Porcentual (%)</option>
                      <option value="MONTOS_FIJOS">Montos fijos ($)</option>
                    </select>
                  </Field>
                </div>

                {/* Selector dinámico de participantes para este gasto */}
                <div className="bg-canvas p-3 rounded-lg border border-subtle">
                  <BatchParticipants
                    expenseId={g.tempId}
                    members={effectiveMembers}
                    tipoReparto={g.tipoReparto}
                    monto={numericMonto}
                    value={g.participantes}
                    initialSelection={g.selection}
                    onInteraction={() => handleFieldChange(g.tempId, 'touched', true)}
                    onChange={handleParticipantsChange}
                    disabled={busy}
                    error={g.errors.participantes}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Botón para agregar otro gasto al lote */}
        <div>
          <Button
            variant="secondary"
            onClick={handleAddExpense}
            disabled={busy || gastos.length + (removed ? 1 : 0) >= 100}
            className="w-full sm:w-auto"
          >
            <Icon name="plus" size={16} />
            Agregar otro gasto al lote
          </Button>
        </div>

        {/* Acciones finales */}
        <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-subtle">
          <div className="text-sm text-secondary">
            Total a registrar: <strong className="text-primary">{money(totalLote)}</strong> en{' '}
            <strong>{gastos.length}</strong> {gastos.length === 1 ? 'gasto' : 'gastos'}.
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                variant="secondary"
                type="button"
                onClick={onCancel}
                disabled={busy}
              >
                {onDraftChange ? 'Guardar borrador y salir' : 'Cancelar'}
              </Button>
            )}
            <Submit busy={busy}>
              Registrar lote ({gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'})
            </Submit>
          </div>
        </div>
      </form>
    </Card>
  )
}
