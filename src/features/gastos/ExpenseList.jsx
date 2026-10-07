import { useState } from 'react'
import { Badge, Button, EmptyState, Icon, LoadingState, Modal, useUI } from '../../components/ui'
import { dateLabel, money } from '../../lib/format'
import { useWorkspace } from '../../app/useWorkspace'
import { ExpenseDetail } from './ExpenseDetail.jsx'

/**
 * ExpenseList
 * Listado visual de gastos compartidos con soporte para:
 * - Vista en tarjetas o filas con tokens del Design System.
 * - Acción para abrir el detalle completo (ExpenseDetail).
 * - Acción para eliminar gasto con Modal accesible de confirmación previa.
 * - Llamada a la API DELETE /api/v1/espacios/{espacioId}/gastos/{gastoId}.
 */
export function ExpenseList({
  expenses = [],
  members = [],
  spaceId: propSpaceId,
  loading = false,
  error = null,
  onExpenseDeleted,
  onRegisterClick,
  className = '',
}) {
  const workspace = useWorkspace()
  const { notify } = useUI()

  const effectiveSpaceId = propSpaceId || workspace?.spaceId
  const effectiveMembers = members.length ? members : workspace?.members || []
  const effectiveApi = workspace?.api
  const currentUserId = workspace?.session?.usuario?.id
  const isAdmin = workspace?.isAdmin

  // Estado para el modal de detalle
  const [selectedGasto, setSelectedGasto] = useState(null)

  // Estado para el modal de confirmación de eliminación
  const [gastoToDelete, setGastoToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Ejecución de eliminación contra la API
  const handleConfirmDelete = async () => {
    if (!gastoToDelete || !effectiveApi) return
    setDeleting(true)

    try {
      const endpoint = effectiveSpaceId
        ? `/api/v1/espacios/${effectiveSpaceId}/gastos/${gastoToDelete.id}`
        : `/api/v1/gastos/${gastoToDelete.id}`

      try {
        await effectiveApi(endpoint, { method: 'DELETE' })
      } catch (err) {
        // Fallback al endpoint sin espacioId si el primero devuelve 404
        if (err.status === 404) {
          await effectiveApi(`/api/v1/gastos/${gastoToDelete.id}`, { method: 'DELETE' })
        } else {
          throw err
        }
      }

      notify('Gasto eliminado. El balance se ha recalculado.', 'success')
      workspace?.invalidate?.()
      onExpenseDeleted?.(gastoToDelete.id)
      setGastoToDelete(null)
    } catch (err) {
      notify(err.message || 'No se pudo eliminar el gasto. Intenta nuevamente.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <LoadingState label="Cargando gastos del espacio…" rows={4} />
  }

  if (error) {
    return (
      <div className="ui-error" role="alert">
        <Icon name="info" />
        <div>
          <h2>Error al cargar los gastos</h2>
          <p>{error?.message || 'Ocurrió un problema de comunicación.'}</p>
        </div>
      </div>
    )
  }

  if (!expenses.length) {
    return (
      <EmptyState
        icon="receipt"
        title="No hay gastos registrados"
        description="Registra el primer gasto compartido para comenzar a llevar el balance del grupo."
        action={
          onRegisterClick && (
            <Button variant="primary" onClick={onRegisterClick}>
              <Icon name="plus" size={16} />
              Registrar primer gasto
            </Button>
          )
        }
      />
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Listado de tarjetas de gasto */}
      <div className="divide-y divide-subtle border border-subtle rounded-xl bg-canvas overflow-hidden shadow-subtle">
        {expenses.map(g => {
          // Resolver pagador
          const payer = effectiveMembers.find(
            m => Number(m.usuarioId ?? m.id) === Number(g.pagadorId)
          )
          const pagadorNombre =
            g.pagadorNombre ||
            payer?.nombreUsuario ||
            `Usuario #${g.pagadorId}`

          const canDelete =
            g.estado === 'PENDIENTE' && (isAdmin || Number(g.pagadorId) === Number(currentUserId))

          return (
            <article
              key={g.id}
              className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap hover:bg-panel transition-colors"
            >
              {/* Información izquierda: Ícono, descripción, fecha, pagador */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span
                  className="w-10 h-10 rounded-lg bg-header text-brand-primary flex items-center justify-center shrink-0 border border-subtle mt-0.5"
                  aria-hidden="true"
                >
                  <Icon name="receipt" size={20} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-base font-semibold text-primary block truncate">
                      {g.descripcion}
                    </strong>
                    <Badge
                      tone={
                        g.estado === 'LIQUIDADO'
                          ? 'success'
                          : g.estado === 'PENDIENTE'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {g.estado === 'LIQUIDADO' ? 'Liquidado' : 'Pendiente'}
                    </Badge>
                  </div>

                  <p className="text-xs text-secondary mt-1 flex items-center gap-2 flex-wrap">
                    <span>{dateLabel(g.fecha)}</span>
                    <span>·</span>
                    <span>Pagó: <strong>{pagadorNombre}</strong></span>
                    {g.tipoReparto && (
                      <>
                        <span>·</span>
                        <span className="capitalize">{g.tipoReparto.toLowerCase().replace('_', ' ')}</span>
                      </>
                    )}
                    {g.participantes?.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{g.participantes.length} participantes</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Información derecha: Monto y acciones */}
              <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                <div className="text-right">
                  <strong className="text-base sm:text-lg font-bold text-primary block">
                    {money(g.monto)}
                  </strong>
                </div>

                <div className="flex items-center gap-1">
                  {/* Botón Ver Detalle */}
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => setSelectedGasto(g)}
                    title="Ver detalle del reparto"
                    aria-label={`Ver detalle de ${g.descripcion}`}
                    className="text-xs px-2.5 py-1.5 min-h-[38px]"
                  >
                    <Icon name="info" size={16} />
                    <span className="hidden sm:inline">Detalle</span>
                  </Button>

                  {/* Botón Eliminar con Modal */}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => setGastoToDelete(g)}
                      title="Eliminar gasto"
                      aria-label={`Eliminar ${g.descripcion}`}
                      className="text-xs px-2.5 py-1.5 min-h-[38px] text-error hover:bg-error-background"
                    >
                      <Icon name="close" size={16} />
                      <span className="hidden sm:inline">Eliminar</span>
                    </Button>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Modal de Detalle */}
      {selectedGasto && (
        <ExpenseDetail
          gasto={selectedGasto}
          spaceId={effectiveSpaceId}
          members={effectiveMembers}
          open={Boolean(selectedGasto)}
          onClose={() => setSelectedGasto(null)}
        />
      )}

      {/* Modal de Confirmación para Eliminar */}
      <Modal
        open={Boolean(gastoToDelete)}
        onClose={() => !deleting && setGastoToDelete(null)}
        title="¿Eliminar este gasto?"
        description="Esta acción recalculará los balances del grupo y no se puede deshacer."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setGastoToDelete(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={handleConfirmDelete}
            >
              Confirmar eliminación
            </Button>
          </div>
        }
      >
        {gastoToDelete && (
          <div className="p-3 bg-panel border border-subtle rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <strong className="text-sm text-primary">{gastoToDelete.descripcion}</strong>
              <strong className="text-sm font-semibold text-brand-primary">
                {money(gastoToDelete.monto)}
              </strong>
            </div>
            <p className="text-xs text-secondary">
              Registrado el {dateLabel(gastoToDelete.fecha)}
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
