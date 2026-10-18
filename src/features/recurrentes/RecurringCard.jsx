import { money } from '../../lib/format'
import { UpdateRecurringDialog } from './UpdateRecurringDialog'
import { ExecuteRecurringDialog } from './ExecuteRecurringDialog'
import { REGLAS_DIVISION } from './model'

export function RecurringCard({ template, members, mutate, confirm, busy }) {
    const pagador = members?.find(m => (m.usuarioId || m.id) === template.pagadorId)
    const nombrePagador = pagador ? (pagador.nombreUsuario || pagador.nombre) : 'No asignado'
    const montoTotal = Number(template.montoBase) + Number(template.montoVariable)

return (
    <article className={`expense recurring-card ${template.vencido ? 'vencida-alert border-danger' : ''}`}>
    <div className="row">
        <div className="template-info">
        <strong>{template.nombre}</strong>
        <ul className="template-details mt-1 text-sm">
            <li><strong>Pagador:</strong> {nombrePagador}</li>
            <li><strong>Reparto:</strong> {REGLAS_DIVISION[template.reglaDivision] || template.reglaDivision}</li>
            <li><strong>Monto Base:</strong> {money(Number(template.montoBase))} | <strong>Variable:</strong> {money(Number(template.montoVariable))}</li>
            <li className={template.vencido ? 'text-danger font-weight-bold' : ''}>
                <strong>Próxima Revisión:</strong> {template.fechaProximaRevision} 
                {template.vencido && <span className="badge badge-danger ml-1"> ¡TARIFA VENCIDA!</span>}
            </li>
        </ul>
        </div>
        
    <div className="template-total align-self-center">
        <span className="text-muted text-xs d-block">Total estimado:</span>
        <strong>{money(montoTotal)}</strong>
    </div>

    <div className="template-actions align-self-center">
        <ExecuteRecurringDialog template={template} mutate={mutate} busy={busy} />
        <button 
            disabled={busy} 
            className="danger ml-2" 
            onClick={async () => { 
            if (await confirm('¿Estás seguro de eliminar esta plantilla? Esta acción no afectará los gastos que ya hayan sido generados previamente.')) {
                mutate(`/api/v1/favoritos/${template.id}`, 'DELETE', undefined, 'Plantilla eliminada correctamente.')
            }
            }}
        >
            Eliminar
        </button>
        </div>
    </div>
    
    <UpdateRecurringDialog template={template} mutate={mutate} busy={busy} />
    </article>
    )
}