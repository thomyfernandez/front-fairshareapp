import { cents, today } from '../../lib/format'
import { validExpenseAmount } from '../gastos/expense-experience'

export function templateAmount(template) {
  const values = [template.montoBase ?? 0, template.montoVariable ?? 0]
  if (values.some(value => !Number.isFinite(Number(value)) || Number(value) < 0)) return null
  return values.reduce((sum, value) => sum + cents(value), 0) / 100
}

export function templateUnavailable(template, members) {
  if (template.vencido || (template.fechaProximaRevision && template.fechaProximaRevision <= today())) return 'Actualizá el monto y la revisión antes de agregarla.'
  if (!validExpenseAmount(templateAmount(template))) return 'Actualizá el monto antes de agregarla.'
  if (!members.some(member => Number(member.usuarioId ?? member.id) === Number(template.pagadorId))) return 'El pagador ya no pertenece al espacio. Creá una plantilla con un pagador actual.'
  if (template.reglaDivision && !['EQUITATIVA', 'PROPORCIONAL_INGRESOS'].includes(template.reglaDivision)) return 'Esta plantilla necesita un reparto compatible antes de agregarla.'
  return null
}

export function templateExpense(template, members, tempId) {
  return {
    tempId, sourceTemplateId: template.id, descripcion: template.nombre,
    monto: String(templateAmount(template)), fecha: today(), pagadorId: String(template.pagadorId),
    tipoReparto: template.reglaDivision || 'EQUITATIVA',
    ...(template.categoriaId != null ? { categoriaId: template.categoriaId } : {}),
    participantes: members.map(member => ({ usuarioId: Number(member.usuarioId ?? member.id) })),
    touched: true,
  }
}
