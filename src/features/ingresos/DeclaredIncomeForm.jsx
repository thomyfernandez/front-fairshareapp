import { incomeDestination } from '../../app/navigation'
import { Link } from 'react-router'
import { Field, Submit } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'

/**
 * Ingreso declarado del usuario actual dentro de un espacio. Se publica para la sección Miembros:
 *   <DeclaredIncomeForm spaceId={space.id} member={members.find(m => m.usuarioId === session.usuario.id)} />
 * Es distinto del ingreso mensual de "Mis ingresos" (/api/v1/sueldos), que es el que usa el reparto proporcional.
 */
export function DeclaredIncomeForm({ spaceId, member, onSaved }) {
  const { busy, error, mutate } = useFeature(null)
  if (!spaceId || !member) return null

  async function submit(event) {
    event.preventDefault()
    const sueldoDeclarado = Number(new FormData(event.currentTarget).get('sueldoDeclarado'))
    const result = await mutate(`/api/v1/espacios/${spaceId}/miembros/${member.usuarioId}/sueldo`, 'PUT', { sueldoDeclarado }, 'Ingreso declarado actualizado.')
    if (result.ok) onSaved?.(result.data)
  }

  return <form onSubmit={submit} aria-labelledby="declared-income-title">
    <h3 id="declared-income-title">Mi ingreso declarado en este espacio</h3>
    <p className="text-sm text-secondary">
      Es el ingreso que compartís con los miembros de este espacio como referencia. No reemplaza tu ingreso mensual: los repartos proporcionales usan el que cargás en <Link to={incomeDestination(spaceId)}>Mis ingresos</Link>.
    </p>
    <div className="filters">
      <Field
        key={member.sueldoDeclarado ?? 'vacío'}
        label="Ingreso declarado"
        name="sueldoDeclarado"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        required
        defaultValue={member.sueldoDeclarado ?? ''}
        error={error?.fieldErrors?.sueldoDeclarado}
      />
      <Submit busy={busy}>Guardar</Submit>
    </div>
  </form>
}
