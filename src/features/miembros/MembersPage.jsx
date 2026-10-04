import { Field, Submit, PageHeader, ResourceState } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { formData } from '../../lib/format'

export default function MembersPage() {
  const { membersState: resource, space, members, session, isAdmin, busy, mutate } = useFeature(null)
  const spacePath = `/api/v1/espacios/${space.id}`
  return <div className="legacy-feature"><PageHeader title="Miembros" /><ResourceState resource={resource}><section className="card"><h2>Miembros y configuración</h2>{members.map(m => <article className="row" key={m.id}><div><strong>{m.nombreUsuario}</strong><small>{m.rol}</small></div>{isAdmin && <button disabled={busy} className="secondary" onClick={() => mutate(`${spacePath}/miembros/${m.usuarioId}/rol?rol=${m.rol === 'ADMIN' ? 'MIEMBRO' : 'ADMIN'}`, 'PATCH', undefined, 'Rol actualizado.')}>{m.rol === 'ADMIN' ? 'Quitar administración' : 'Hacer administrador'}</button>}</article>)}
            <form className="filters" onSubmit={event => { event.preventDefault(); const d = formData(event); mutate(`${spacePath}/miembros/${session.usuario.id}/sueldo`, 'PUT', { sueldoDeclarado: Number(d.sueldoDeclarado) }, 'Ingreso declarado actualizado.') }}><Field label="Mi ingreso declarado en este espacio" name="sueldoDeclarado" type="number" min="0" step="0.01" required /><Submit busy={busy}>Guardar</Submit></form>
            {isAdmin && <><form className="filters" onSubmit={event => { event.preventDefault(); const d = formData(event); mutate(`${spacePath}/presupuesto-base?presupuestoBase=${Number(d.presupuesto)}`, 'PATCH', undefined, 'Presupuesto actualizado.') }}><Field label="Presupuesto disponible" name="presupuesto" type="number" min="0" step="0.01" defaultValue={space.presupuestoBase} key={space.presupuestoBase} required /><Submit busy={busy}>Actualizar presupuesto</Submit></form>
              <form className="filters" onSubmit={event => { event.preventDefault(); const d = formData(event); mutate(`${spacePath}/regla-distribucion?reglaReparto=${d.regla}`, 'PATCH', undefined, 'Regla actualizada.') }}><Field label="Regla del espacio"><select name="regla" defaultValue={space.reglaReparto}><option value="CINCUENTA_CINCUENTA">Equitativa</option><option value="PROPORCIONAL">Proporcional</option></select></Field><Submit busy={busy}>Guardar regla</Submit></form></>}
          </section></ResourceState></div>
}
