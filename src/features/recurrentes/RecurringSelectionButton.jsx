import { Button, Icon } from '../../components/ui'
import { templateUnavailable } from './recurring-batch'

// La confirmación se hace en el flujo compartido de Gastos, después de editar el borrador.
export function RecurringSelectionButton({ template, members, batch, busy }) {
  const selected = batch.selected(template.id)
  return <Button variant="secondary" disabled={busy || (!selected && Boolean(templateUnavailable(template, members)))} aria-label={`${selected ? 'Quitar' : 'Agregar'} ${template.nombre} ${selected ? 'de la selección' : 'para registrar'}`} onClick={() => selected ? batch.removeTemplate(template.id) : batch.add(template)}>
    <Icon name={selected ? 'close' : 'plus'} size={16} />{selected ? 'Quitar' : 'Agregar para registrar'}
  </Button>
}
