import { useState, useCallback } from 'react'
import { Button, Card, Field, Icon, InlineAlert, Submit, useUI } from '../../components/ui'
import { cents, money, today } from '../../lib/format'
import { useWorkspace } from '../../app/useWorkspace'
import { ParticipantsSelector } from './ParticipantsSelector.jsx'

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
 * - Envío en una única petición POST con payload: { "gastos": [ ... ] }
 * - Advertencia visual de atomicidad: si uno falla, el backend rechaza el lote completo.
 * - Validación integral de cada elemento del lote antes del envío.
 * - UX Crítica: Conservación total de todos los gastos ingresados si la petición falla (ej. error 400).
 */
export function ExpenseBatchForm({
  spaceId: propSpaceId,
  members: propMembers,
  api: propApi,
  onSuccess,
  onCancel,
  className = '',
}) {
  const workspace = useWorkspace()
  const { notify } = useUI()

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
  const [gastos, setGastos] = useState(() => [
    createEmptyExpense(1, defaultPayerId),
    createEmptyExpense(2, defaultPayerId),
  ])

  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState(null)

  // Agregar nuevo gasto al lote
  const handleAddExpense = () => {
    const nextId = Date.now()
    setGastos(prev => [...prev, createEmptyExpense(nextId, defaultPayerId)])
  }

  // Eliminar un gasto del lote
  const handleRemoveExpense = (tempId) => {
    if (gastos.length <= 1) return
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
    setServerError(null)

    let hasAnyError = false
    const updatedGastos = gastos.map((g, index) => {
      const itemErrors = {}

      if (!g.descripcion.trim()) {
        itemErrors.descripcion = 'La descripción es obligatoria.'
      }

      const numMonto = parseFloat(g.monto)
      if (isNaN(numMonto) || numMonto <= 0) {
        itemErrors.monto = 'El importe debe ser mayor a 0.'
      }

      if (!g.fecha) {
        itemErrors.fecha = 'La fecha es requerida.'
      }

      if (!g.pagadorId || Number(g.pagadorId) <= 0) {
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
      notify('Hay errores en uno o más gastos del lote. Revisa los campos resaltados.', 'error')
      return
    }

    setBusy(true)

    // Contrato estricto: { "gastos": [ { ... }, ... ] }
    const payload = {
      gastos: gastos.map(g => ({
        descripcion: g.descripcion.trim(),
        monto: Number(parseFloat(g.monto).toFixed(2)),
        fecha: g.fecha,
        pagadorId: Number(g.pagadorId),
        tipoReparto: g.tipoReparto,
        participantes: g.participantes.map(p => ({
          usuarioId: Number(p.usuarioId),
          porcentaje: Number(Number(p.porcentaje).toFixed(2)),
          importe: Number(Number(p.importe).toFixed(2)),
        })),
      })),
    }

    try {
      if (!effectiveSpaceId) {
        throw new Error('No se identificó el espacio activo.')
      }

      // Endpoint de lote en backend
      const endpoint = `/api/v1/espacios/${effectiveSpaceId}/gastos/lote`
      let response
      try {
        response = await effectiveApi(endpoint, {
          method: 'POST',
          body: payload,
        })
      } catch (err) {
        // Soporte de fallback a endpoint /batch si el backend lo expone con ese nombre
        if (err.status === 404) {
          response = await effectiveApi(`/api/v1/espacios/${effectiveSpaceId}/gastos/batch`, {
            method: 'POST',
            body: payload,
          })
        } else {
          throw err
        }
      }

      notify(`Lote de ${gastos.length} gastos registrado con éxito.`, 'success')
      workspace?.invalidate?.()

      if (onSuccess) {
        onSuccess(response)
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
      notify(errorMsg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className={`expense-batch-container space-y-6 ${className}`}>
      {/* Cabecera y Alerta Crítica de Atomicidad */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold text-primary">Registro de gastos por lote</h2>
            <p className="text-sm text-secondary">
              Agrega múltiples gastos y envíalos en una sola operación compartida.
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-secondary block">Total del lote ({gastos.length} gastos)</span>
            <strong className="text-xl font-bold text-brand-primary block">{money(totalLote)}</strong>
          </div>
        </div>

        {/* Notificación visual de la regla de lote transaccional */}
        <InlineAlert tone="info">
          <strong>Registro transaccional en lote:</strong> Si cualquiera de los gastos del lote falla
          o contiene información inválida, <strong>el lote completo será rechazado</strong> por el servidor.
          Revisa que todos los gastos estén completos.
        </InlineAlert>

        {serverError && (
          <InlineAlert tone="error">
            {serverError}
          </InlineAlert>
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
                className="p-4 border border-subtle rounded-xl bg-panel space-y-4 relative transition-shadow hover:shadow-subtle"
              >
                {/* Cabecera del ítem de lote */}
                <div className="flex items-center justify-between border-b border-subtle pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <strong className="text-sm font-semibold text-primary">
                      Gasto #{index + 1}
                    </strong>
                    {g.monto > 0 && (
                      <span className="text-xs font-semibold text-secondary">
                        · {money(g.monto)}
                      </span>
                    )}
                  </div>

                  {gastos.length > 1 && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => handleRemoveExpense(g.tempId)}
                      disabled={busy}
                      className="text-xs text-error hover:bg-error-background px-2 py-1 min-h-[32px]"
                      aria-label={`Quitar gasto número ${index + 1} del lote`}
                    >
                      <Icon name="close" size={14} />
                      Quitar
                    </Button>
                  )}
                </div>

                {/* Campos del gasto individual */}
                <Field
                  label="Descripción"
                  value={g.descripcion}
                  onChange={e => handleFieldChange(g.tempId, 'descripcion', e.target.value)}
                  error={g.errors.descripcion}
                  placeholder="Ej. Supermercado, Almuerzo grupal"
                  required
                  disabled={busy}
                />

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
                      <option value="PORCENTUAL">Porcentual (%)</option>
                      <option value="MONTOS_FIJOS">Montos fijos ($)</option>
                    </select>
                  </Field>
                </div>

                {/* Selector dinámico de participantes para este gasto */}
                <div className="bg-canvas p-3 rounded-lg border border-subtle">
                  <ParticipantsSelector
                    members={effectiveMembers}
                    tipoReparto={g.tipoReparto}
                    monto={numericMonto}
                    value={g.participantes}
                    onChange={(parts, validState) =>
                      handleParticipantsChange(g.tempId, parts, validState)
                    }
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
            disabled={busy}
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
                Cancelar
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
