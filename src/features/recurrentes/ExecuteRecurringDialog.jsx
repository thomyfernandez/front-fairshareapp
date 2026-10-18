import { Submit } from '../../components/ui'
import { money } from '../../lib/format'

export function ExecuteRecurringDialog({ template, mutate, busy }) {
  const montoTotal = Number(template.montoBase) + Number(template.montoVariable)

return (
    <details className="d-inline-block">
    <summary 
        role="button" 
        className={`button-like ${template.vencido ? 'disabled text-muted' : ''}`}
        onClick={(e) => {
            if (template.vencido) {
            e.preventDefault()
            alert('No se puede ejecutar un gasto con una plantilla vencida. Por favor, actualiza la tarifa primero.')
            }
        }}
    >
        Generar gasto
    </summary>
    
    {!template.vencido && (
        <div className="execution-preview-box p-3 border rounded mt-2 bg-light">
        <p className="mb-2 text-sm">
            Estás por generar un gasto manual basado en la plantilla <strong>{template.nombre}</strong>.
        </p>
        <ul className="text-xs mb-3 pl-3">
            <li><strong>Importe total a registrar:</strong> {money(montoTotal)}</li>
            <li><strong>Regla de división:</strong> {template.reglaDivision}</li>
            <li><strong>Tipo de ejecución:</strong> Manual (requiere tu confirmación explícita)</li>
        </ul>
          
        <form 
            onSubmit={(e) => {
                e.preventDefault()
                mutate(
                    `/api/v1/favoritos/${template.id}/ejecutar`, 
                    'POST', 
                    undefined, 
                    'Gasto generado e imputado en el espacio exitosamente.'
            )
        }}
    >
            <Submit busy={busy}>Confirmar y generar gasto</Submit>
        </form>
        </div>
        )}
    </details>
    )
}