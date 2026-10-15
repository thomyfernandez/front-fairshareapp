import { useEffect, useState } from 'react'
import { Badge, Button, Icon, LoadingState, Modal } from '../../components/ui'
import { dateLabel, money } from '../../lib/format'
import { useWorkspace } from '../../app/useWorkspace'

/**
 * ExpenseDetail
 * Muestra el desglose completo de un gasto:
 * - Quién realizó el pago y monto total.
 * - Regla y estado del gasto.
 * - Lista de participantes con su porcentaje e importe asignado.
 * Puede funcionar como Modal accesible o como vista incrustada.
 */
export function ExpenseDetail({
  gasto: initialGasto,
  gastoId,
  spaceId: propSpaceId,
  members: propMembers,
  api: propApi,
  open = true,
  onClose,
  asModal = true,
}) {
  const workspace = useWorkspace()
  const effectiveSpaceId = propSpaceId || workspace?.spaceId
  const effectiveMembers = propMembers || workspace?.members || []
  const effectiveApi = propApi || workspace?.api

  const [gasto, setGasto] = useState(initialGasto || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Si se pasa gasto directamente, actualizar
  useEffect(() => {
    if (initialGasto) {
      setGasto(initialGasto)
    }
  }, [initialGasto])

  // Si no tenemos participantes o solo tenemos gastoId, consultar a la API
  useEffect(() => {
    const idToFetch = initialGasto?.id || gastoId
    if (!open || !idToFetch || !effectiveApi) return

    // Si ya tenemos participantes completos en el objeto, no es obligatorio refetchear
    if (initialGasto?.participantes && initialGasto.participantes.length > 0) {
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    const fetchDetail = async () => {
      try {
        const path = effectiveSpaceId
          ? `/api/v1/espacios/${effectiveSpaceId}/gastos/${idToFetch}`
          : `/api/v1/gastos/${idToFetch}`
        const data = await effectiveApi(path)
        if (isMounted) setGasto(data)
      } catch (err) {
        // Intento de fallback si el backend expone /api/v1/gastos/:id
        try {
          const fallbackData = await effectiveApi(`/api/v1/gastos/${idToFetch}`)
          if (isMounted) setGasto(fallbackData)
        } catch {
          if (isMounted) setError(err.message || 'No se pudo cargar el detalle del gasto.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchDetail()

    return () => {
      isMounted = false
    }
  }, [initialGasto, gastoId, effectiveSpaceId, effectiveApi, open])

  // Resolver nombre de pagador
  const pagadorMember = effectiveMembers.find(
    m => Number(m.usuarioId ?? m.id) === Number(gasto?.pagadorId)
  )
  const pagadorNombre =
    gasto?.pagadorNombre ||
    pagadorMember?.nombreUsuario ||
    (gasto?.pagadorId ? `Usuario #${gasto.pagadorId}` : 'Gasto compartido')

  const content = (
    <div className="space-y-6">
      {loading && <LoadingState label="Cargando detalles del gasto…" rows={3} />}

      {error && (
        <div className="ui-error" role="alert">
          <Icon name="info" />
          <div>
            <h2>Error al cargar el gasto</h2>
            <p>{error}</p>
          </div>
        </div>
      )}

      {!loading && gasto && (
        <>
          {/* Tarjeta de resumen principal */}
          <div className="p-4 bg-panel border border-subtle rounded-xl flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-1">
                Monto total del gasto
              </span>
              <strong className="text-2xl font-bold text-primary block">
                {money(gasto.monto)}
              </strong>
              <span className="text-xs text-secondary block mt-1">
                Registrado el {dateLabel(gasto.fecha)}
              </span>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge
                tone={
                  gasto.estado === 'LIQUIDADO'
                    ? 'success'
                    : gasto.estado === 'PENDIENTE'
                    ? 'warning'
                    : 'neutral'
                }
              >
                {gasto.estado === 'LIQUIDADO' ? 'Liquidado' : 'Pendiente de balance'}
              </Badge>
              <Badge tone="brand">
                Reparto: {gasto.tipoReparto || gasto.regla || 'EQUITATIVA'}
              </Badge>
            </div>
          </div>

          {/* Bloque: ¿Quién pagó? */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
              <Icon name="wallet" size={16} className="text-brand-primary" />
              ¿Quién realizó el pago?
            </h3>
            <div className="flex items-center justify-between p-3 bg-canvas border border-subtle rounded-lg">
              <div className="flex items-center gap-3">
                <span
                  className="w-9 h-9 rounded-full bg-header text-brand-primary font-semibold text-sm flex items-center justify-center border border-subtle"
                  aria-hidden="true"
                >
                  {pagadorNombre.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong className="text-sm text-primary block">{pagadorNombre}</strong>
                  <span className="text-xs text-secondary">Abonó el importe total</span>
                </div>
              </div>
              <strong className="text-sm font-semibold text-primary">
                {money(gasto.monto)}
              </strong>
            </div>
          </div>

          {/* Bloque: ¿Cómo se dividió entre los participantes? */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Icon name="users" size={16} className="text-brand-primary" />
                Participantes y división ({gasto.participantes?.length || 0})
              </h3>
            </div>

            {(!gasto.participantes || gasto.participantes.length === 0) ? (
              <p className="text-xs text-secondary italic p-3 bg-panel rounded-lg border border-subtle">
                No hay desglose individual de participantes registrado para este gasto.
              </p>
            ) : (
              <div className="divide-y divide-subtle border border-subtle rounded-lg overflow-hidden bg-canvas">
                {gasto.participantes.map(p => {
                  const member = effectiveMembers.find(
                    m => Number(m.usuarioId ?? m.id) === Number(p.usuarioId)
                  )
                  const nombre =
                    p.usuarioNombre ||
                    member?.nombreUsuario ||
                    `Usuario #${p.usuarioId}`
                  const isPayer = Number(p.usuarioId) === Number(gasto.pagadorId)

                  return (
                    <div
                      key={p.usuarioId}
                      className="flex items-center justify-between p-3 gap-3 hover:bg-panel transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-8 h-8 rounded-full bg-panel text-secondary text-xs font-medium flex items-center justify-center shrink-0 border border-subtle"
                          aria-hidden="true"
                        >
                          {nombre.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-primary block truncate">
                            {nombre}
                          </span>
                          <span className="text-xs text-secondary">
                            {p.porcentaje !== undefined ? `${p.porcentaje}% del total` : 'Cuota asignada'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <strong className="text-sm font-semibold text-primary block">
                            {money(p.importe)}
                          </strong>
                          {isPayer ? (
                            <span className="text-xs text-success-foreground block font-medium">
                              Pagó (recupera {money(gasto.monto - p.importe)})
                            </span>
                          ) : (
                            <span className="text-xs text-secondary block">
                              Le corresponde pagar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )

  if (!asModal) {
    return content
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={gasto?.descripcion || 'Detalle del gasto'}
      description="Desglose del pago y distribución entre miembros."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar detalle
        </Button>
      }
    >
      {content}
    </Modal>
  )
}
