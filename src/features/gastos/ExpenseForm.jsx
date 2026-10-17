import { useState, useCallback, useId } from 'react'
import { Button, Card, Field, InlineAlert, Submit, useUI } from '../../components/ui'
import { today } from '../../lib/format'
import { useWorkspace } from '../../app/useWorkspace'
import { ParticipantsSelector } from './ParticipantsSelector.jsx'

/**
 * ExpenseForm
 * Componente principal para el registro de gastos en FairShare.
 *
 * Contrato JSON enviado al backend:
 * {
 *   "descripcion": "string",
 *   "monto": 0.0,
 *   "fecha": "YYYY-MM-DD",
 *   "pagadorId": 0,
 *   "tipoReparto": "EQUITATIVA | PORCENTUAL | MONTOS_FIJOS", 
 *   "participantes": [
 *     { "usuarioId": 0, "porcentaje": 0.0, "importe": 0.0 }
 *   ]
 * }
 *
 * UX Crítica:
 * Si la petición falla (ej. error 400 del servidor), todos los datos ingresados
 * permanecen en el estado local para que el usuario pueda corregirlos y reintentar
 * sin perder su progreso.
 */
export function ExpenseForm({
  spaceId: propSpaceId,
  members: propMembers,
  api: propApi,
  initialValues = {},
  onSuccess,
  onCancel,
  className = '',
}) {
  const workspace = useWorkspace()
  const { notify } = useUI()

  // Fuente de datos del espacio y miembros (permite props directos o contexto global)
  const effectiveSpaceId = propSpaceId || workspace?.spaceId
  const effectiveMembers = propMembers || workspace?.members || []
  const effectiveApi = propApi || workspace?.api
  const currentUserId = workspace?.session?.usuario?.id

  // Estados controlados para preservar los datos ante cualquier fallo
  const [descripcion, setDescripcion] = useState(initialValues.descripcion || '')
  const [monto, setMonto] = useState(initialValues.monto !== undefined ? String(initialValues.monto) : '')
  const [fecha, setFecha] = useState(initialValues.fecha || today())
  const [pagadorId, setPagadorId] = useState(() => {
    if (initialValues.pagadorId) return String(initialValues.pagadorId)
    if (currentUserId && effectiveMembers.some(m => (m.usuarioId ?? m.id) === currentUserId)) {
      return String(currentUserId)
    }
    return effectiveMembers[0] ? String(effectiveMembers[0].usuarioId ?? effectiveMembers[0].id) : ''
  })
  const [tipoReparto, setTipoReparto] = useState(initialValues.tipoReparto || 'EQUITATIVA')

  // Participantes calculados y su estado de validación
  const [participantes, setParticipantes] = useState(initialValues.participantes || [])
  const [participantsValidation, setParticipantsValidation] = useState({ isValid: true, error: null })

  // Estados de proceso y feedback
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)

  // Callback del selector de participantes
  const handleParticipantsChange = useCallback((calculatedParticipants, validationState) => {
    setParticipantes(calculatedParticipants)
    setParticipantsValidation(validationState)
    // Limpiar error de participantes si ya es válido
    if (validationState.isValid) {
      setErrors(prev => {
        if (!prev.participantes) return prev
        const next = { ...prev }
        delete next.participantes
        return next
      })
    }
  }, [])

  // Validación y envío del formulario
  const handleSubmit = async (event) => {
    event.preventDefault()
    setServerError(null)

    const clientErrors = {}

    // 1. Validar descripción
    const trimmedDescripcion = descripcion.trim()
    if (!trimmedDescripcion) {
      clientErrors.descripcion = 'La descripción es obligatoria.'
    } else if (trimmedDescripcion.length > 255) {
      clientErrors.descripcion = 'La descripción no puede superar los 255 caracteres.'
    }

    // 2. Validar monto positivo
    const numericMonto = parseFloat(monto)
    if (isNaN(numericMonto) || numericMonto <= 0) {
      clientErrors.monto = 'El importe debe ser un monto positivo mayor a 0.'
    }

    // 3. Validar fecha
    if (!fecha) {
      clientErrors.fecha = 'La fecha del gasto es obligatoria.'
    }

    // 4. Validar pagador
    const numericPagadorId = Number(pagadorId)
    if (!numericPagadorId || numericPagadorId <= 0) {
      clientErrors.pagadorId = 'Debes seleccionar qué persona realizó el pago.'
    }

    // 5. Validar participantes y ausencia de duplicados
    if (!participantes || participantes.length === 0) {
      clientErrors.participantes = 'Debes incluir al menos un participante en el reparto del gasto.'
    } else if (!participantsValidation.isValid) {
      clientErrors.participantes = participantsValidation.error || 'Revisá la distribución de los participantes.'
    } else {
      // Validar que no haya participantes duplicados
      const userIds = participantes.map(p => Number(p.usuarioId))
      const uniqueIds = new Set(userIds)
      if (uniqueIds.size !== userIds.length) {
        clientErrors.participantes = 'No puede haber participantes duplicados en el reparto.'
      }
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    // Sin errores de cliente, limpiar errores visuales previos
    setErrors({})
    setBusy(true)

    // Construcción del contrato JSON estricto
    const payload = {
      descripcion: trimmedDescripcion,
      monto: Number(numericMonto.toFixed(2)),
      fecha,
      pagadorId: numericPagadorId,
      tipoReparto,
      participantes: participantes.map(p => ({
        usuarioId: Number(p.usuarioId),
        porcentaje: Number(Number(p.porcentaje).toFixed(2)),
        importe: Number(Number(p.importe).toFixed(2)),
      })),
    }

    try {
      if (!effectiveSpaceId) {
        throw new Error('No se pudo identificar el espacio activo para registrar el gasto.')
      }

      if (!effectiveApi) {
        throw new Error('El cliente HTTP no está disponible.')
      }

      const response = await effectiveApi(`/api/v1/espacios/${effectiveSpaceId}/gastos`, {
        method: 'POST',
        body: payload,
      })

      notify('Gasto registrado con éxito.', 'success')

      // Invalidar caché del workspace si existe
      workspace?.invalidate?.()

      if (onSuccess) {
        onSuccess(response)
      } else {
        // En caso de formulario persistente sin navegación/cierre, limpiar valores solo en éxito
        setDescripcion('')
        setMonto('')
        setFecha(today())
      }
    } catch (error) {
      // UX CRÍTICA:
      // Si la petición falla (ej. error 400 del servidor), el formulario
      // CONSERVA TODOS LOS DATOS ingresados para que el usuario pueda corregirlos.
      const errorMsg = error?.message || 'No pudimos registrar el gasto. Revisá los datos ingresados.'
      setServerError(errorMsg)

      // Si el servidor devolvió errores por campo (ej. ApiError.fieldErrors)
      if (error?.fieldErrors && typeof error.fieldErrors === 'object') {
        setErrors(prev => ({ ...prev, ...error.fieldErrors }))
      }

      notify(errorMsg, 'error')
    } finally {
      setBusy(false)
    }
  }

  const numericMontoForSelector = Math.max(0, parseFloat(monto) || 0)

  return (
    <Card className={`expense-form-container ${className}`}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Alerta de error del servidor (persiste el formulario para corrección) */}
        {serverError && (
          <InlineAlert tone="error">
            {serverError}
          </InlineAlert>
        )}

        {/* Fila 1: Descripción */}
        <Field
          label="Descripción del gasto"
          name="descripcion"
          value={descripcion}
          onChange={e => {
            setDescripcion(e.target.value)
            if (errors.descripcion) setErrors(prev => ({ ...prev, descripcion: undefined }))
          }}
          error={errors.descripcion}
          placeholder="Ej. Supermercado, Alquiler, Salida grupal"
          maxLength={255}
          required
          disabled={busy}
        />

        {/* Fila 2: Monto y Fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Monto total ($)"
            name="monto"
            type="number"
            min="0.01"
            step="0.01"
            value={monto}
            onChange={e => {
              setMonto(e.target.value)
              if (errors.monto) setErrors(prev => ({ ...prev, monto: undefined }))
            }}
            error={errors.monto}
            placeholder="0.00"
            required
            disabled={busy}
          />

          <Field
            label="Fecha"
            name="fecha"
            type="date"
            value={fecha}
            onChange={e => {
              setFecha(e.target.value)
              if (errors.fecha) setErrors(prev => ({ ...prev, fecha: undefined }))
            }}
            error={errors.fecha}
            required
            disabled={busy}
          />
        </div>

        {/* Fila 3: Pagador y Tipo de reparto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="¿Quién pagó?" error={errors.pagadorId} required>
            <select
              value={pagadorId}
              onChange={e => {
                setPagadorId(e.target.value)
                if (errors.pagadorId) setErrors(prev => ({ ...prev, pagadorId: undefined }))
              }}
              disabled={busy}
              required
            >
              <option value="">Seleccionar miembro...</option>
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

          <Field
            label="Tipo de reparto"
            hint="Determina cómo se distribuye la deuda entre los participantes."
          >
            <select
              value={tipoReparto}
              onChange={e => setTipoReparto(e.target.value)}
              disabled={busy}
              required
            >
              <option value="EQUITATIVA">Equitativa (partes iguales)</option>
              <option value="PORCENTUAL">Porcentual (%)</option>
              <option value="MONTOS_FIJOS">Montos fijos ($)</option>
            </select>
          </Field>
        </div>

        {/* Fila 4: Selector dinámico de participantes */}
        <ParticipantsSelector
          members={effectiveMembers}
          tipoReparto={tipoReparto}
          monto={numericMontoForSelector}
          value={participantes}
          onChange={handleParticipantsChange}
          disabled={busy}
          error={errors.participantes}
        />

        {/* Fila 5: Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-subtle">
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
            Registrar gasto
          </Submit>
        </div>
      </form>
    </Card>
  )
}
