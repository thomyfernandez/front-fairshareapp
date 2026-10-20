import { Field, PanelDisclosure, Submit } from '../../components/ui'
import { nextMonth, formData } from '../../lib/format'
import { RecurringAmountFields } from './RecurringAmountFields'

export function UpdateRecurringDialog({ template, mutate, busy, open }) {
  return <PanelDisclosure title="Actualizar monto y revisión" icon="settings" open={open || undefined}>
    <form aria-label={`Actualizar plantilla ${template.nombre}`} className="grid-form recurring-template-form" onSubmit={event => {
      event.preventDefault()
      const data = formData(event)
      data.nuevoMontoBase = Number(data.nuevoMontoBase)
      data.nuevoMontoVariable = Number(data.nuevoMontoVariable)
      mutate(`/api/v1/favoritos/${template.id}/actualizar-monto`, 'PUT', data, 'Plantilla actualizada.')
    }}>
      <RecurringAmountFields key={`${template.id}-${template.montoBase}-${template.montoVariable}`} amountName="nuevoMontoBase" additionalName="nuevoMontoVariable" initialAmount={template.montoBase} initialAdditional={template.montoVariable} disabled={busy} />
      <Field label="Nueva revisión" name="nuevaFechaProximaRevision" type="date" defaultValue={nextMonth()} required disabled={busy} />
      <div className="recurring-template-form__actions"><Submit busy={busy}>Actualizar</Submit></div>
    </form>
  </PanelDisclosure>
}
