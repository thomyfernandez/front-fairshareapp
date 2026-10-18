import { Field, Submit } from '../../components/ui'
import { nextMonth, formData } from '../../lib/format'

export function RecurringForm({ spacePath, session, members, mutate, busy }) {
    const peopleSelect = (name, label, helpText, value = session?.usuario?.id) => (
    <Field label={label} helpText={helpText}>
    <select name={name} defaultValue={value} required>
        {members?.map(m => (
        <option key={m.usuarioId || m.id} value={m.usuarioId || m.id}>
            {m.nombreUsuario || m.nombre}
        </option>
        ))}
    </select>
    </Field>
    )

return (
    <details>
    <summary>Crear nueva plantilla</summary>
    <form 
        className="grid-form" 
        onSubmit={event => {
            event.preventDefault()
            const d = formData(event)
            for (const k of ['pagadorId', 'montoBase', 'montoVariable', 'frecuenciaAjusteMeses']) {
            d[k] = Number(d[k])
        }
        mutate(`${spacePath}/favoritos`, 'POST', d, 'Plantilla creada con éxito.') 
        }}
    >
        <Field 
            label="Nombre del gasto" 
            name="nombre" 
            helpText="Identificador claro del gasto recurrente (ej: Alquiler, Internet, Expensas)." 
            required 
            minLength={2} 
            maxLength={100} 
        />
        
        {peopleSelect(
            'pagadorId', 
            'Pagador por defecto', 
            'Miembro del espacio responsable de abonar inicialmente este gasto.'
        )}
        
        <Field 
            label="Monto base fijo" 
            name="montoBase" 
            type="number" 
            min="0" 
            step="0.01" 
            helpText="Importe estable o tarifa fija que no varía mes a mes." 
            required 
        />
        
        <Field 
            label="Monto variable estimado" 
            name="montoVariable" 
            type="number" 
            min="0" 
            step="0.01" 
            defaultValue="0" 
            helpText="Valor estimado para cargos variables o adicionales (ingresar 0 si no aplica)." 
            required 
        />
        
        <Field 
            label="Revisión de tarifa (en meses)" 
            name="frecuenciaAjusteMeses" 
            type="number" 
            min="1" 
            defaultValue="1" 
            helpText="Cada cuántos meses se requiere reevaluar o actualizar los montos de esta plantilla." 
            required 
        />
        
        <Field 
            label="Próxima fecha de revisión" 
            name="fechaProximaRevision" 
            type="date" 
            defaultValue={nextMonth()} 
            helpText="Fecha límite en la que el sistema exigirá la actualización de la tarifa." 
            required 
        />
        
        <Field 
            label="Método de reparto" 
            helpText="Criterio para distribuir el importe total entre los participantes del espacio."
        >
        <select name="reglaDivision">
            <option value="EQUITATIVA">Partes iguales (Equitativo)</option>
            <option value="PROPORCIONAL_INGRESOS">Según ingresos declarados (Proporcional)</option>
        </select>
        </Field>
        
        <Submit busy={busy}>Guardar plantilla</Submit>
        </form>
    </details>
    )
}