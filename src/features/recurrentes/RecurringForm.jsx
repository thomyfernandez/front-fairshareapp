import { Field, PanelDisclosure, Submit } from '../../components/ui'
import { nextMonth, formData } from '../../lib/format'
import { RecurringAmountFields } from './RecurringAmountFields'
import { REGLAS_DIVISION } from './model'

export function RecurringForm({ spacePath, session, members, mutate, busy }) {
  const currentUser = session?.usuario?.id
  const payer = members.some(member => Number(member.usuarioId) === Number(currentUser)) ? currentUser : members[0]?.usuarioId ?? ''
  return <PanelDisclosure title="Crear plantilla" icon="plus" className="recurring-create">
    <form aria-label="Crear plantilla recurrente" className="grid-form recurring-template-form" onSubmit={event => {
      event.preventDefault()
      const data = formData(event)
      data.nombre = data.nombre.trim()
      for (const key of ['pagadorId', 'montoBase', 'montoVariable', 'frecuenciaAjusteMeses']) data[key] = Number(data[key])
      mutate(`${spacePath}/favoritos`, 'POST', data, 'Plantilla creada.')
    }}>
      <Field label="Nombre" name="nombre" required minLength={2} maxLength={100} disabled={busy} />
      <Field label="Pagador"><select name="pagadorId" defaultValue={payer} required disabled={busy}>
        {!members.length && <option value="">No hay miembros disponibles</option>}
        {members.map(member => <option key={member.usuarioId} value={member.usuarioId}>{member.nombreUsuario}</option>)}
      </select></Field>
      <RecurringAmountFields amountName="montoBase" additionalName="montoVariable" disabled={busy} />
      <Field label="Revisar cada (meses)" name="frecuenciaAjusteMeses" type="number" min="1" step="1" defaultValue="1" required disabled={busy} />
      <Field label="Próxima revisión" name="fechaProximaRevision" type="date" defaultValue={nextMonth()} required disabled={busy} />
      <Field label="Reparto"><select name="reglaDivision" disabled={busy}>{Object.entries(REGLAS_DIVISION).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <div className="recurring-template-form__actions"><Submit busy={busy} disabled={!members.length}>Crear plantilla</Submit></div>
    </form>
  </PanelDisclosure>
}
