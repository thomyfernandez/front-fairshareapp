import { useRef, useState } from 'react'
import { Button, EmptyState, Icon, InlineAlert, Modal, Money } from '../../components/ui'
import { cents, dateLabel } from '../../lib/format'
import { batchMemberName, validExpenseAmount } from '../gastos/expense-experience'

export function RecurringBatchTray({ batch, members, onEmptyClose }) {
  const [open, setOpen] = useState(false)
  const viewRef = useRef(null)
  const rows = batch.draft?.gastos || []
  const valid = rows.length > 0 && rows.every(row => validExpenseAmount(row.monto))
  const total = valid ? rows.reduce((sum, row) => sum + cents(row.monto), 0) / 100 : null
  const totalLabel = total === null ? 'Por completar' : <Money value={total} />
  const count = `${rows.length} ${rows.length === 1 ? 'gasto' : 'gastos'}`
  function close() {
    setOpen(false)
    if (!batch.draft) onEmptyClose?.()
  }
  function remove(tempId) {
    batch.remove(tempId)
    // El control de la fila desaparece: devolver el foco a un destino estable.
    viewRef.current?.focus()
  }
  return <>
    <span className="sr-only" role="status" aria-live="polite">{batch.announcement}</span>
    {batch.error && <InlineAlert tone="error">{batch.error}</InlineAlert>}
    {batch.draft && <section className="recurring-tray" aria-label="Gastos para registrar">
      <div className="recurring-tray__info"><Icon name="receipt" /><div><strong>{count} para registrar</strong></div></div>
      <div className="recurring-tray__total"><span>Total</span><strong>{totalLabel}</strong></div>
      <div className="recurring-tray__actions"><Button variant="secondary" onClick={() => setOpen(true)}>Ver selección</Button><Button onClick={batch.review}>Revisar gastos</Button></div>
    </section>}
    <Modal open={open} title="Gastos para registrar" description="Podés quitar gastos acá. En el siguiente paso podrás editar importes, fechas y participantes antes de confirmar." onClose={close} footer={<><Button ref={viewRef} variant="secondary" data-autofocus onClick={close}>Seguir eligiendo</Button>{batch.draft && <Button onClick={batch.review}>Revisar gastos</Button>}</>}>
      {!rows.length ? <EmptyState icon="receipt" title="No hay gastos seleccionados" description={batch.draft?.removed ? 'Podés recuperar el gasto que quitaste desde el formulario de gastos.' : 'Agregá una plantilla para comenzar.'} /> : <ul className="recurring-tray-list">{rows.map((row, index) => <li key={row.tempId}>
        <div><strong>{row.descripcion.trim() || 'Sin descripción'}</strong><p>{dateLabel(row.fecha, { compact: true })} · Pagó {batchMemberName(members, row.pagadorId)}</p></div>
        <strong>{validExpenseAmount(row.monto) ? <Money value={row.monto} /> : 'Por completar'}</strong>
        <Button variant="ghost" aria-label={`Quitar ${row.descripcion.trim() || `gasto ${index + 1}`} de la selección`} onClick={() => remove(row.tempId)}><Icon name="close" size={16} />Quitar</Button>
      </li>)}</ul>}
      {rows.length > 0 && <div className="recurring-tray-dialog-total"><span>Total · {count}</span><strong>{totalLabel}</strong></div>}
      <p className="recurring-tray-note">Todavía no se registraron estos gastos ni cambió el balance. Los cambios en estos gastos no modifican las plantillas.</p>
      <p className="recurring-tray-note">{batch.location === 'memory' ? 'El borrador se conserva mientras mantengas esta sesión abierta.' : 'El borrador se guarda en esta pestaña. Podés salir y retomarlo después.'}</p>
    </Modal>
  </>
}
