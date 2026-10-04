import { useState } from 'react'
import { Field, Submit, Empty, PageHeader, ResourceState } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { money, today, formData } from '../../lib/format'
import { useWorkspace } from '../../app/useWorkspace'
import { useSearchParams } from 'react-router'
import { Button, useUI } from '../../components/ui'

export default function ExpensesPage() {
  const { spaceId } = useWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const [rule, setRule] = useState('EQUITATIVA')
  const { notify } = useUI()
  const spacePath = `/api/v1/espacios/${spaceId}`
  const filters = new URLSearchParams([...searchParams].filter(([key]) => ['desde', 'hasta'].includes(key)))
  const { resource, membersState, members, session, isAdmin, busy, mutate, confirm } = useFeature(`${spacePath}/gastos${filters.size ? `?${filters}` : ''}`)
  const expenses = resource.data
  const peopleSelect = (name, label, value = session.usuario.id) => <Field label={label}><select name={name} defaultValue={value} required>{members.map(m => <option key={m.usuarioId} value={m.usuarioId}>{m.nombreUsuario}</option>)}</select></Field>
  return <div className="legacy-feature"><PageHeader title="Gastos" actions={filters.size ? <Button variant="secondary" onClick={() => setSearchParams({})}>Limpiar filtros</Button> : null} /><ResourceState resource={resource}><ResourceState resource={membersState}><section className="card"><h2>Gastos del espacio</h2><details open={searchParams.has('nuevo') || undefined}><summary>Registrar un gasto</summary><form onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); const participantes = f.getAll('participantes').map(id => ({ usuarioId: Number(id), ...(rule === 'PERSONALIZADA' ? { importe: Number(f.get(`importe-${id}`)) } : {}) })); const body = { descripcion: f.get('descripcion'), monto: Number(f.get('monto')), fecha: f.get('fecha'), pagadorId: Number(f.get('pagadorId')), regla: rule, participantes }; mutate(`${spacePath}/gastos`, 'POST', body, 'Gasto registrado.') }}>
            <div className="grid-form"><Field label="Descripción" name="descripcion" required maxLength={255} /><Field label="Monto total" name="monto" type="number" min="0.01" step="0.01" required /><Field label="Fecha" name="fecha" type="date" defaultValue={today()} required />{peopleSelect('pagadorId', 'Pagó')}
              <Field label="Reparto"><select value={rule} onChange={e => setRule(e.target.value)}><option value="EQUITATIVA">Equitativo</option><option value="PROPORCIONAL_INGRESOS">Proporcional a ingresos</option><option value="PARTICIPACION_PARCIAL">Solo participantes elegidos</option><option value="PERSONALIZADA">Importes personalizados</option></select></Field></div>
            <fieldset><legend>Participantes</legend>{members.map(m => <div className="participant" key={m.usuarioId}><label className="check"><input type="checkbox" name="participantes" value={m.usuarioId} defaultChecked />{m.nombreUsuario}</label>{rule === 'PERSONALIZADA' && <Field label={`Importe de ${m.nombreUsuario}`} name={`importe-${m.usuarioId}`} type="number" min="0" step="0.01" defaultValue="0" />}</div>)}</fieldset><Submit busy={busy}>Registrar gasto</Submit>
          </form></details>
            <form className="filters" onSubmit={event => { event.preventDefault(); const d = formData(event); if (d.desde && d.hasta && d.desde > d.hasta) { notify('La fecha desde debe ser anterior o igual a la fecha hasta.', 'error'); return } setSearchParams(new URLSearchParams(Object.entries(d).filter(([, v]) => v))) }}><Field label="Desde" name="desde" type="date" defaultValue={searchParams.get('desde') || ''} /><Field label="Hasta" name="hasta" type="date" defaultValue={searchParams.get('hasta') || ''} /><Submit busy={busy}>Filtrar</Submit></form>
            {expenses.map(g => <article key={g.id} className="expense"><div className="row"><div><strong>{g.descripcion}</strong><small>{g.fecha} · {g.estado}</small></div><strong>{money(g.monto)}</strong>{g.estado === 'PENDIENTE' && (isAdmin || g.pagadorId === session.usuario.id) && <button disabled={busy} className="danger" onClick={async () => { if (await confirm('¿Eliminar este gasto? El balance se recalculará.')) mutate(`/api/v1/gastos/${g.id}`, 'DELETE', undefined, 'Gasto eliminado.') }}>Eliminar</button>}</div><details><summary>Ver reparto</summary>{g.participantes?.map(p => <div className="row" key={p.usuarioId}><span>{p.usuarioNombre || `Usuario ${p.usuarioId}`}</span><span>{money(p.importe)}</span></div>)}</details></article>)}{!expenses.length && <Empty>No hay gastos para mostrar.</Empty>}
          </section></ResourceState></ResourceState></div>
}
