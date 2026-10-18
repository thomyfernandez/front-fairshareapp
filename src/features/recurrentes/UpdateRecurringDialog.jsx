import { Field, Submit } from '../../components/ui'
import { nextMonth, formData } from '../../lib/format'

export function UpdateRecurringDialog({ template, mutate, busy }) {
return (
    <details open={template.vencido} className="mt-2">
    <summary className={template.vencido ? 'text-danger font-weight-bold' : ''}>
        {template.vencido ? 'Tarifa vencida: Actualizar monto y revisión requerida' : 'Actualizar monto y revisión'}
    </summary>
      
    {template.vencido && (
        <p className="text-danger text-xs mt-1 mb-2">
            El ciclo de revisión de esta plantilla ha expirado. Debes actualizar los valores monetarios y fijar una nueva fecha de revisión antes de poder generar nuevos gastos.
        </p>
    )}

    <form 
        className="grid-form mt-2" 
        onSubmit={event => { 
            event.preventDefault()
            const d = formData(event)
            d.nuevoMontoBase = Number(d.nuevoMontoBase)
            d.nuevoMontoVariable = Number(d.nuevoMontoVariable)
            mutate(`/api/v1/favoritos/${template.id}/actualizar-monto`, 'PUT', d, 'Plantilla actualizada exitosamente.') 
        }}
    >
        <Field 
            label="Nuevo monto base" 
            name="nuevoMontoBase" 
            type="number" 
            min="0" 
            step="0.01" 
            defaultValue={template.montoBase} 
            required 
        />
        
        <Field 
            label="Nuevo monto variable" 
            name="nuevoMontoVariable" 
            type="number" 
            min="0" 
            step="0.01" 
            defaultValue={template.vencido ? 0 : template.montoVariable} 
            required 
        />
        
        <Field 
            label="Nueva fecha de revisión" 
            name="nuevaFechaProximaRevision" 
            type="date" 
            defaultValue={nextMonth()} 
            required 
        />
        
        <Submit busy={busy}>Guardar cambios y renovar tarifa</Submit>
    </form>
    </details>
    )
}