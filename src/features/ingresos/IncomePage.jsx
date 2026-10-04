import { useState } from 'react'
import { Field, Submit, Empty, PageHeader, ResourceState } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { money, formData } from '../../lib/format'

export default function IncomePage() {
  const [salaryEdit, setSalaryEdit] = useState(null)
  const { resource, busy, run, refresh, mutate, confirm } = useFeature('/api/v1/sueldos')
  const salaries = resource.data
  return <div className="legacy-feature"><PageHeader title="Mis ingresos" /><ResourceState resource={resource}><section className="card"><h2>Mis ingresos</h2><p>Se utilizan para calcular repartos proporcionales.</p><form key={salaryEdit?.id || 'new'} className="grid-form" onSubmit={event => { event.preventDefault(); const d = formData(event); for (const key of ['monto', 'mes', 'anio']) d[key] = Number(d[key]); run(async () => { await api(`/api/v1/sueldos${salaryEdit ? `/${salaryEdit.id}` : ''}`, { method: salaryEdit ? 'PUT' : 'POST', body: d }); setSalaryEdit(null); await refresh() }, 'Ingreso guardado.') }}>
            <Field label="Monto" name="monto" type="number" min="0.01" step="0.01" defaultValue={salaryEdit?.monto} required /><Field label="Mes" name="mes" type="number" min="1" max="12" defaultValue={salaryEdit?.mes || new Date().getMonth() + 1} required /><Field label="Año" name="anio" type="number" min="2000" max={new Date().getFullYear() + 1} defaultValue={salaryEdit?.anio || new Date().getFullYear()} required />
            <Field label="Tipo"><select name="tipo" defaultValue={salaryEdit?.tipo || 'FIJO'}><option>FIJO</option><option>VARIABLE</option></select></Field><Field label="Frecuencia"><select name="frecuencia" defaultValue={salaryEdit?.frecuencia || 'MENSUAL'}><option>MENSUAL</option><option>QUINCENAL</option></select></Field><Submit busy={busy}>{salaryEdit ? 'Guardar cambios' : 'Guardar ingreso'}</Submit>
          </form>{salaryEdit && <button className="link" onClick={() => setSalaryEdit(null)}>Cancelar edición</button>}
            {salaries.map(s => <article className="row" key={s.id}><div><strong>{s.mes}/{s.anio}</strong><small>{s.tipo} · {s.frecuencia}</small></div><strong>{money(s.monto)}</strong><button className="secondary" onClick={() => setSalaryEdit(s)}>Editar</button><button disabled={busy} className="danger" onClick={async () => { if (await confirm('¿Eliminar este ingreso?')) mutate(`/api/v1/sueldos/${s.id}`, 'DELETE', undefined, 'Ingreso eliminado.') }}>Eliminar</button></article>)}{!salaries.length && <Empty>No registraste ingresos todavía.</Empty>}
          </section></ResourceState></div>
}
