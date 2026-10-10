import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button, Card, Field, Icon, InlineAlert, PageHeader, Submit } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { formData, money } from '../../lib/format'
import { InvitationCode } from './InvitationCode'

export default function SpaceSettings() {
  const { space, spaceId, session, isAdmin, api, run, invalidate, confirm, busy, error } = useFeature(null)
  const navigate = useNavigate()

  const [regla, setRegla] = useState(space?.reglaReparto || 'CINCUENTA_CINCUENTA')
  const [presupuesto, setPresupuesto] = useState(String(space?.presupuestoBase ?? '0'))
  const [budgetError, setBudgetError] = useState(null)

  const handleBudgetChange = (event) => {
    const { value, validity } = event.target
    setPresupuesto(value)

    if (validity?.badInput) {
      setBudgetError('Ingresá un importe válido mayor o igual a 0.')
      return
    }

    if (value === '' || value.includes('-')) {
      setBudgetError('El presupuesto base no puede ser negativo.')
      return
    }

    const num = Number(value)
    if (Number.isNaN(num) || num < 0) {
      setBudgetError('El presupuesto base no puede ser negativo.')
      return
    }

    setBudgetError(null)
  }

  const handleBudgetKeyDown = (event) => {
    if (event.key === '-' || event.key === 'e' || event.key === 'E' || event.key === '+') {
      event.preventDefault()
    }
  }

  const isInvalidBudget = Boolean(budgetError) || presupuesto === '' || Number(presupuesto) < 0 || Number.isNaN(Number(presupuesto))

  if (!space) return null

  const handleSave = async (event) => {
    event.preventDefault()
    if (isInvalidBudget) return
    const data = formData(event)
    const newRegla = data.reglaReparto
    const newPresupuesto = Number(data.presupuestoBase || 0)

    // Si cambió la regla de reparto, solicitar confirmación explícita
    if (newRegla !== space.reglaReparto) {
      const accepted = await confirm({
        title: '¿Modificar la regla de reparto?',
        description: `El espacio pasará de reparto ${space.reglaReparto === 'PROPORCIONAL' ? 'Proporcional' : 'Equitativo'} a ${newRegla === 'PROPORCIONAL' ? 'Proporcional a ingresos' : 'Equitativo (50/50)'}. Esto cambiará cómo se distribuyen los futuros gastos entre los integrantes.`,
        confirmLabel: 'Sí, cambiar regla',
      })
      if (!accepted) return
    }

    const body = {
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || '',
      tipo: data.tipo,
      reglaReparto: newRegla,
      presupuestoBase: newPresupuesto,
    }

    const result = await run(
      () => api(`/api/v1/espacios/${spaceId}?solicitanteId=${session.usuario.id}`, {
        method: 'PUT',
        body,
      }),
      'Configuración del espacio actualizada con éxito.'
    )

    if (result.ok) {
      invalidate()
    }
  }

  const handleDeleteSpace = async () => {
    const accepted = await confirm({
      title: `¿Eliminar "${space.nombre}"?`,
      description: 'Esta acción es irreversible y eliminará el espacio, sus gastos y sus liquidaciones registradas.',
      danger: true,
      confirmLabel: 'Sí, eliminar definitivamente',
    })
    if (!accepted) return

    const result = await run(
      () => api(`/api/v1/espacios/${spaceId}?solicitanteId=${session.usuario.id}`, {
        method: 'DELETE',
      }),
      'Espacio eliminado.'
    )

    if (result.ok) {
      invalidate()
      navigate('/espacios')
    }
  }

  return (
    <div className="space-settings-page">
      <PageHeader
        eyebrow="CONFIGURACIÓN DEL ESPACIO"
        title={`Configuración · ${space.nombre}`}
        description="Administrá los datos generales, el presupuesto y la modalidad de reparto de gastos."
        actions={
          <Badge tone={isAdmin ? 'brand' : 'neutral'}>
            {isAdmin ? 'Administrador' : 'Miembro'}
          </Badge>
        }
      />

      <div style={{ display: 'grid', gap: '24px', maxWidth: '800px' }}>
        {!isAdmin ? (
          <Card>
            <InlineAlert tone="info">
              Estás visualizando la configuración como miembro. Solo los administradores del espacio pueden modificar los datos, el presupuesto o la regla de reparto.
            </InlineAlert>

            <dl style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
              <div>
                <dt style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Nombre</dt>
                <dd style={{ margin: 0, fontWeight: 'var(--font-weight-medium)' }}>{space.nombre}</dd>
              </div>
              <div>
                <dt style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Descripción</dt>
                <dd style={{ margin: 0 }}>{space.descripcion || 'Sin descripción'}</dd>
              </div>
              <div>
                <dt style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Presupuesto disponible</dt>
                <dd style={{ margin: 0, fontWeight: 'var(--font-weight-medium)' }}>{money(space.presupuestoBase)}</dd>
              </div>
              <div>
                <dt style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Modalidad de reparto</dt>
                <dd style={{ margin: 0 }}>
                  {space.reglaReparto === 'PROPORCIONAL' ? 'Proporcional a ingresos' : 'Equitativo (50/50)'}
                </dd>
              </div>
            </dl>
          </Card>
        ) : (
          <Card>
            <div className="card-heading" style={{ marginBottom: '20px' }}>
              <div>
                <h2>Datos y reglas del espacio</h2>
                <p>Modificá la información básica y el comportamiento financiero del grupo.</p>
              </div>
            </div>

            {error && <InlineAlert tone="error">{error.message}</InlineAlert>}

            <form onSubmit={handleSave} noValidate>
              <Field
                label="Nombre del espacio"
                name="nombre"
                defaultValue={space.nombre}
                required
                minLength={2}
                maxLength={100}
                error={error?.fieldErrors?.nombre}
              />

              <Field
                label="Descripción"
                name="descripcion"
                defaultValue={space.descripcion || ''}
                maxLength={255}
                error={error?.fieldErrors?.descripcion}
              />

              <Field label="Tipo de espacio" name="tipo">
                <select name="tipo" defaultValue={space.tipo || 'HOGAR'}>
                  <option value="HOGAR">Hogar (convivencia, expensas, servicios)</option>
                  <option value="VIAJE">Viaje (vacaciones, escapadas)</option>
                  <option value="PAREJA">Pareja (gastos cotidianos)</option>
                  <option value="TRABAJO">Trabajo o Proyecto</option>
                  <option value="OTRO">Otro</option>
                </select>
              </Field>

              <Field
                label="Modalidad de reparto de gastos"
                name="reglaReparto"
                error={error?.fieldErrors?.reglaReparto}
              >
                <select
                  name="reglaReparto"
                  value={regla}
                  onChange={(e) => setRegla(e.target.value)}
                >
                  <option value="CINCUENTA_CINCUENTA">Equitativa (partes iguales 50/50)</option>
                  <option value="PROPORCIONAL">Proporcional a ingresos mensuales</option>
                </select>
              </Field>

              <div style={{ margin: '12px 0' }}>
                <InlineAlert tone="info">
                  {regla === 'PROPORCIONAL'
                    ? 'Proporcional: los gastos se dividen según el sueldo que declare cada participante. Si alguien no declara sueldo, el sistema distribuye con base en los miembros que sí lo declararon.'
                    : 'Equitativa: cada participante del gasto asume una fracción idéntica, independientemente de sus ingresos.'}
                </InlineAlert>
              </div>

              <Field
                label="Presupuesto base asignado (ARS)"
                name="presupuestoBase"
                type="number"
                min="0"
                step="0.01"
                value={presupuesto}
                onChange={handleBudgetChange}
                onKeyDown={handleBudgetKeyDown}
                required
                error={budgetError || (isInvalidBudget ? 'El presupuesto base no puede ser negativo.' : error?.fieldErrors?.presupuestoBase)}
                hint="Tope o fondo disponible del espacio. No representa un saldo bancario real ni dinero transferido."
              />

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <Submit busy={busy} disabled={isInvalidBudget}>Guardar cambios</Submit>
              </div>
            </form>
          </Card>
        )}

        {/* Sección de invitación */}
        <Card className="invite-card" style={{ marginTop: 0 }}>
          <div className="card-heading">
            <div>
              <h2>Código de invitación</h2>
              <p>Compartí este código o enlace para sumar nuevos integrantes a este espacio.</p>
            </div>
            <span className="invite-badge" aria-hidden="true">
              <Icon name="users" size={20} />
            </span>
          </div>

          <InvitationCode code={space.codigo} spaceName={space.nombre} />
        </Card>

        {/* Zona sensible / Destructiva */}
        {isAdmin && (
          <Card style={{ borderColor: 'var(--color-error)' }}>
            <div className="card-heading" style={{ marginBottom: '12px' }}>
              <div>
                <h2 style={{ color: 'var(--color-error)' }}>Zona de peligro</h2>
                <p>Acciones destructivas que afectan a todos los integrantes de este espacio.</p>
              </div>
            </div>

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              Eliminar el espacio borrará permanentemente todos los gastos registrados, balances pendientes, liquidaciones y plantillas recurrentes asociadas.
            </p>

            <Button variant="danger" onClick={handleDeleteSpace} loading={busy}>
              <Icon name="close" size={16} />
              Eliminar este espacio
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
