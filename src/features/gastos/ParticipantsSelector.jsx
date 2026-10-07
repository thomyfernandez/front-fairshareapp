import { useId, useMemo, useState, useEffect } from 'react'
import { Badge, Button, Icon } from '../../components/ui'
import { cents, money } from '../../lib/format'

/**
 * Normaliza los miembros para asegurar que tengan usuarioId y nombreUsuario legibles.
 */
function normalizeMembers(members = []) {
  return members.map(m => ({
    usuarioId: Number(m.usuarioId ?? m.id),
    nombreUsuario: m.nombreUsuario ?? m.nombre ?? m.email ?? `Usuario ${m.usuarioId ?? m.id}`,
    rol: m.rol || null,
  }))
}

/**
 * ParticipantsSelector
 * Componente para seleccionar y calcular la distribución de participantes en un gasto.
 * Soporta dinámicamente:
 * - EQUITATIVA: partes iguales entre los seleccionados con estimación en vivo.
 * - PORCENTUAL: valida que la suma sea exactamente 100% y muestra estimación monetaria en vivo.
 * - MONTOS_FIJOS: valida que la suma de importes coincida con el monto total del gasto y muestra porcentajes en vivo.
 */
export function ParticipantsSelector({
  members = [],
  tipoReparto = 'EQUITATIVA',
  monto = 0,
  value,
  onChange,
  disabled = false,
  error: externalError,
}) {
  const normalizedMembers = useMemo(() => normalizeMembers(members), [members])
  const numericMonto = Math.max(0, Number(monto) || 0)
  const totalCents = cents(numericMonto)

  // Estado interno para EQUITATIVA: selección de quién participa (true/false)
  const [selectedEquitativa, setSelectedEquitativa] = useState(() => {
    const initial = {}
    normalizedMembers.forEach(m => {
      initial[m.usuarioId] = true
    })
    return initial
  })

  // Estado interno para PORCENTUAL: porcentajes individuales por miembro
  const [porcentajes, setPorcentajes] = useState(() => {
    const initial = {}
    const count = normalizedMembers.length || 1
    const basePct = (100 / count).toFixed(2)
    normalizedMembers.forEach(m => {
      initial[m.usuarioId] = basePct
    })
    return initial
  })

  // Estado interno para MONTOS_FIJOS: importes individuales por miembro
  const [importes, setImportes] = useState(() => {
    const initial = {}
    normalizedMembers.forEach(m => {
      initial[m.usuarioId] = ''
    })
    return initial
  })

  // Sincronizar si cambian los miembros
  useEffect(() => {
    setSelectedEquitativa(prev => {
      const next = { ...prev }
      normalizedMembers.forEach(m => {
        if (next[m.usuarioId] === undefined) next[m.usuarioId] = true
      })
      return next
    })
    setPorcentajes(prev => {
      const next = { ...prev }
      normalizedMembers.forEach(m => {
        if (next[m.usuarioId] === undefined) next[m.usuarioId] = '0'
      })
      return next
    })
    setImportes(prev => {
      const next = { ...prev }
      normalizedMembers.forEach(m => {
        if (next[m.usuarioId] === undefined) next[m.usuarioId] = ''
      })
      return next
    })
  }, [normalizedMembers])

  // Cálculo y validación en vivo según el tipo de reparto
  const { participantes, isValid, validationError, statusBadge } = useMemo(() => {
    if (!normalizedMembers.length) {
      return {
        participantes: [],
        isValid: false,
        validationError: 'No hay miembros disponibles para asignar.',
        statusBadge: null,
      }
    }

    if (tipoReparto === 'EQUITATIVA') {
      const activeMembers = normalizedMembers.filter(m => selectedEquitativa[m.usuarioId])
      const count = activeMembers.length

      if (count === 0) {
        return {
          participantes: [],
          isValid: false,
          validationError: 'Debes seleccionar al menos un participante para el reparto equitativo.',
          statusBadge: <Badge tone="error">0 seleccionados</Badge>,
        }
      }

      // Distribución precisa de centavos para que la suma siempre coincida con el monto
      const baseCents = count > 0 ? Math.floor(totalCents / count) : 0
      const remainderCents = count > 0 ? totalCents % count : 0

      const result = activeMembers.map((m, index) => {
        const participantCents = baseCents + (index < remainderCents ? 1 : 0)
        const importe = participantCents / 100
        const porcentaje = Number((100 / count).toFixed(2))
        return {
          usuarioId: m.usuarioId,
          porcentaje,
          importe,
        }
      })

      return {
        participantes: result,
        isValid: true,
        validationError: null,
        statusBadge: (
          <Badge tone="brand">
            {count} {count === 1 ? 'persona' : 'personas'} · {money(numericMonto / count)} c/u
          </Badge>
        ),
      }
    }

    if (tipoReparto === 'PORCENTUAL') {
      let sumPct = 0
      const list = []

      normalizedMembers.forEach(m => {
        const pctRaw = parseFloat(porcentajes[m.usuarioId]) || 0
        sumPct += pctRaw
        if (pctRaw > 0) {
          const importe = Number(((numericMonto * pctRaw) / 100).toFixed(2))
          list.push({
            usuarioId: m.usuarioId,
            porcentaje: Number(pctRaw.toFixed(2)),
            importe,
          })
        }
      })

      const diff = Math.round((100 - sumPct) * 100) / 100
      const isExactly100 = Math.abs(diff) < 0.01

      if (list.length === 0) {
        return {
          participantes: [],
          isValid: false,
          validationError: 'Debes ingresar porcentajes mayores a 0 para los participantes.',
          statusBadge: <Badge tone="error">Total: 0% / 100%</Badge>,
        }
      }

      if (!isExactly100) {
        const errorMsg = diff > 0
          ? `La suma de porcentajes es ${sumPct.toFixed(2)}%. Falta asignar ${diff.toFixed(2)}%.`
          : `La suma de porcentajes es ${sumPct.toFixed(2)}%. Se excede por ${Math.abs(diff).toFixed(2)}%.`
        return {
          participantes: list,
          isValid: false,
          validationError: errorMsg,
          statusBadge: (
            <Badge tone={diff > 0 ? 'warning' : 'error'}>
              Total: {sumPct.toFixed(2)}% / 100% ({diff > 0 ? `Falta ${diff.toFixed(2)}%` : `Exceso ${Math.abs(diff).toFixed(2)}%`})
            </Badge>
          ),
        }
      }

      return {
        participantes: list,
        isValid: true,
        validationError: null,
        statusBadge: <Badge tone="success">Total: 100% asignado ✓</Badge>,
      }
    }

    if (tipoReparto === 'MONTOS_FIJOS') {
      let sumCents = 0
      const list = []

      normalizedMembers.forEach(m => {
        const rawImp = parseFloat(importes[m.usuarioId]) || 0
        if (rawImp > 0) {
          const memberCents = cents(rawImp)
          sumCents += memberCents
          const pct = totalCents > 0 ? Number(((memberCents / totalCents) * 100).toFixed(2)) : 0
          list.push({
            usuarioId: m.usuarioId,
            porcentaje: pct,
            importe: Number(rawImp.toFixed(2)),
          })
        }
      })

      const diffCents = totalCents - sumCents
      const isMatch = totalCents > 0 && diffCents === 0

      if (list.length === 0) {
        return {
          participantes: [],
          isValid: false,
          validationError: 'Debes asignar un importe mayor a 0 a los participantes.',
          statusBadge: <Badge tone="error">Sin asignar</Badge>,
        }
      }

      if (totalCents <= 0) {
        return {
          participantes: list,
          isValid: false,
          validationError: 'Ingresa primero un monto total positivo en el gasto para validar los importes fijos.',
          statusBadge: <Badge tone="warning">Monto total pendiente</Badge>,
        }
      }

      if (!isMatch) {
        const errorMsg = diffCents > 0
          ? `Suma de importes: ${money(sumCents / 100)}. Faltan asignar ${money(diffCents / 100)} del total.`
          : `Suma de importes: ${money(sumCents / 100)}. Se excede por ${money(Math.abs(diffCents) / 100)} del total.`
        return {
          participantes: list,
          isValid: false,
          validationError: errorMsg,
          statusBadge: (
            <Badge tone={diffCents > 0 ? 'warning' : 'error'}>
              {money(sumCents / 100)} de {money(numericMonto)}
            </Badge>
          ),
        }
      }

      return {
        participantes: list,
        isValid: true,
        validationError: null,
        statusBadge: <Badge tone="success">Total: {money(numericMonto)} asignado ✓</Badge>,
      }
    }

    return {
      participantes: [],
      isValid: false,
      validationError: 'Tipo de reparto desconocido.',
      statusBadge: null,
    }
  }, [normalizedMembers, tipoReparto, numericMonto, totalCents, selectedEquitativa, porcentajes, importes])

  // Notificar al componente padre cuando cambie el resultado
  useEffect(() => {
    if (onChange) {
      onChange(participantes, { isValid, error: validationError })
    }
  }, [participantes, isValid, validationError, onChange])

  // Acciones rápidas para EQUITATIVA
  const selectAll = () => {
    const next = {}
    normalizedMembers.forEach(m => { next[m.usuarioId] = true })
    setSelectedEquitativa(next)
  }

  const deselectAll = () => {
    const next = {}
    normalizedMembers.forEach(m => { next[m.usuarioId] = false })
    setSelectedEquitativa(next)
  }

  // Acción rápida para PORCENTUAL: Repartir equitativamente
  const distributeEvenlyPct = () => {
    const count = normalizedMembers.length
    if (count === 0) return
    const basePct = Math.floor((100 / count) * 100) / 100
    const remainder = Math.round((100 - basePct * count) * 100) / 100
    const next = {}
    normalizedMembers.forEach((m, idx) => {
      const val = (basePct + (idx === 0 ? remainder : 0)).toFixed(2)
      next[m.usuarioId] = val
    })
    setPorcentajes(next)
  }

  // Acción rápida para MONTOS_FIJOS: Asignar monto total distribuido
  const distributeEvenlyAmount = () => {
    const count = normalizedMembers.length
    if (count === 0 || totalCents === 0) return
    const baseCents = Math.floor(totalCents / count)
    const remainder = totalCents % count
    const next = {}
    normalizedMembers.forEach((m, idx) => {
      const memberCents = baseCents + (idx < remainder ? 1 : 0)
      next[m.usuarioId] = (memberCents / 100).toFixed(2)
    })
    setImportes(next)
  }

  const activeError = externalError || validationError

  return (
    <div className="space-y-3">
      {/* Cabecera del selector */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-subtle">
        <div className="flex items-center gap-2">
          <Icon name="users" size={18} className="text-secondary" />
          <span className="text-sm font-semibold text-primary">Participantes del reparto</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusBadge}
          {tipoReparto === 'EQUITATIVA' && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="small"
                onClick={selectAll}
                disabled={disabled}
                className="text-xs px-2 py-1 min-h-[32px]"
              >
                Todos
              </Button>
              <Button
                variant="ghost"
                size="small"
                onClick={deselectAll}
                disabled={disabled}
                className="text-xs px-2 py-1 min-h-[32px]"
              >
                Ninguno
              </Button>
            </div>
          )}
          {tipoReparto === 'PORCENTUAL' && (
            <Button
              variant="ghost"
              size="small"
              onClick={distributeEvenlyPct}
              disabled={disabled}
              className="text-xs px-2 py-1 min-h-[32px]"
            >
              Distribuir 100%
            </Button>
          )}
          {tipoReparto === 'MONTOS_FIJOS' && numericMonto > 0 && (
            <Button
              variant="ghost"
              size="small"
              onClick={distributeEvenlyAmount}
              disabled={disabled}
              className="text-xs px-2 py-1 min-h-[32px]"
            >
              Distribuir total
            </Button>
          )}
        </div>
      </div>

      {/* Lista de participantes */}
      <div className="space-y-2 bg-panel p-3 rounded-lg border border-subtle">
        {normalizedMembers.map(m => {
          const isSelected = selectedEquitativa[m.usuarioId]
          const pctVal = porcentajes[m.usuarioId] || ''
          const impVal = importes[m.usuarioId] || ''
          const partInfo = participantes.find(p => p.usuarioId === m.usuarioId)

          return (
            <div
              key={m.usuarioId}
              className="flex items-center justify-between gap-3 p-2 bg-canvas rounded-md border border-subtle"
            >
              {/* Información del miembro */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  className="w-8 h-8 rounded-full bg-header text-brand-primary text-xs font-semibold flex items-center justify-center shrink-0 border border-subtle"
                  aria-hidden="true"
                >
                  {m.nombreUsuario.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-primary block truncate">
                    {m.nombreUsuario}
                  </span>
                  {m.rol && (
                    <span className="text-xs text-secondary block capitalize">{m.rol.toLowerCase()}</span>
                  )}
                </div>
              </div>

              {/* Modo EQUITATIVA */}
              {tipoReparto === 'EQUITATIVA' && (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {isSelected ? (
                      <div>
                        <span className="text-sm font-semibold text-brand-primary block">
                          {money(partInfo?.importe ?? (numericMonto / (participantes.length || 1)))}
                        </span>
                        <span className="text-xs text-secondary">
                          {partInfo?.porcentaje || 0}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-secondary italic">Excluido ($ 0,00)</span>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    id={`participant-check-${m.usuarioId}`}
                    checked={!!isSelected}
                    disabled={disabled}
                    onChange={e => {
                      setSelectedEquitativa(prev => ({
                        ...prev,
                        [m.usuarioId]: e.target.checked,
                      }))
                    }}
                    className="w-5 h-5 accent-brand-primary cursor-pointer rounded"
                    aria-label={`Incluir a ${m.nombreUsuario} en el reparto equitativo`}
                  />
                </div>
              )}

              {/* Modo PORCENTUAL */}
              {tipoReparto === 'PORCENTUAL' && (
                <div className="flex items-center gap-3">
                  <div className="text-right min-w-[80px]">
                    <span className="text-sm font-medium text-primary block">
                      {money((numericMonto * (parseFloat(pctVal) || 0)) / 100)}
                    </span>
                    <span className="text-xs text-secondary">estimado</span>
                  </div>
                  <div className="flex items-center gap-1 w-24">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0"
                      value={pctVal}
                      disabled={disabled}
                      onChange={e => {
                        const val = e.target.value
                        setPorcentajes(prev => ({ ...prev, [m.usuarioId]: val }))
                      }}
                      className="ui-input text-right py-1 px-2 h-9 text-sm"
                      aria-label={`Porcentaje para ${m.nombreUsuario}`}
                    />
                    <span className="text-xs font-semibold text-secondary">%</span>
                  </div>
                </div>
              )}

              {/* Modo MONTOS_FIJOS */}
              {tipoReparto === 'MONTOS_FIJOS' && (
                <div className="flex items-center gap-3">
                  <div className="text-right min-w-[65px]">
                    <span className="text-xs font-medium text-secondary block">
                      {numericMonto > 0
                        ? `${(((parseFloat(impVal) || 0) / numericMonto) * 100).toFixed(1)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 w-32">
                    <span className="text-xs font-semibold text-secondary">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={impVal}
                      disabled={disabled}
                      onChange={e => {
                        const val = e.target.value
                        setImportes(prev => ({ ...prev, [m.usuarioId]: val }))
                      }}
                      className="ui-input text-right py-1 px-2 h-9 text-sm"
                      aria-label={`Importe fijo para ${m.nombreUsuario}`}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Alerta de validación en vivo si no coincide la suma o faltan datos */}
      {activeError && (
        <p className="ui-field__error text-xs" role="alert">
          {activeError}
        </p>
      )}
    </div>
  )
}
