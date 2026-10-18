import { useState } from 'react'
import { Badge, Button, EmptyState, Icon, ExpenseRow, LoadingState, Modal, useUI } from '../../components/ui'
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
      <ul className="ui-expense-list expense-management-list" aria-label="Gastos del espacio">
        {expenses.map(g => {
          const payer = effectiveMembers.find(m => Number(m.usuarioId ?? m.id) === Number(g.pagadorId))
          const payerName = g.pagadorNombre || payer?.nombreUsuario || `Usuario #${g.pagadorId}`
          const canDelete = g.estado === 'PENDIENTE' && (isAdmin || Number(g.pagadorId) === Number(currentUserId))
          return <li key={g.id} className="expense-management-list__item">
            <ExpenseRow description={g.descripcion} category={g.categoria} date={g.fecha} amount={g.monto == null ? undefined : Number(g.monto)} payerName={payerName} paidByYou={Number(g.pagadorId) === Number(currentUserId)} onSelect={() => setSelectedGasto(g)} status={<Badge tone={g.estado === 'LIQUIDADO' ? 'success' : 'neutral'}>{g.estado === 'LIQUIDADO' ? 'Liquidado' : 'Pendiente'}</Badge>} />
            <span className="expense-management-list__actions">{canDelete && <Button variant="ghost" size="icon" onClick={() => setGastoToDelete(g)} aria-label={`Eliminar ${g.descripcion}`} className="expense-management-list__delete"><Icon name="close" size={16} /></Button>}</span>
          </li>
        })}
      </ul>

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
