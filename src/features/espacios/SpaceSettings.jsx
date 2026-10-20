import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button, Icon, InlineAlert, PageHeader } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { money } from '../../lib/format'
import { InvitationCode } from './InvitationCode'
import { SettingsForm, SettingsSection } from './SettingsForm'
import { spaceTypes, splitLabel } from './settings-options'

export default function SpaceSettings() {
  const { space, spaceId, session, isAdmin, api, run, invalidate, confirm, busy, error } = useFeature(null)
  const navigate = useNavigate()
  const [operation, setOperation] = useState('save')
  if (!space) return null

  async function deleteSpace() {
    if (busy || !isAdmin) return
    const accepted = await confirm({
      title: `¿Eliminar «${space.nombre}»?`,
      description: 'Se eliminarán permanentemente el espacio, sus gastos, balances, liquidaciones y plantillas recurrentes. Afecta a todos los integrantes y no se puede deshacer.',
      danger: true, confirmLabel: 'Eliminar definitivamente',
    })
    if (!accepted) return
    setOperation('delete')
    const result = await run(() => api(`/api/v1/espacios/${spaceId}?solicitanteId=${session.usuario.id}`, { method: 'DELETE' }), 'Espacio eliminado.')
    if (result.ok) { invalidate(); navigate('/espacios') }
  }

  return <div className="feature-page space-settings-page">
    <PageHeader eyebrow={space.nombre} title="Configuración" description="Tu espacio, sus reglas y las personas con quienes lo compartís." actions={<Badge tone={isAdmin ? 'brand' : 'neutral'}>{isAdmin ? 'Administrador' : 'Miembro'}</Badge>} />
    {isAdmin ? <SettingsForm space={space} spaceId={spaceId} userId={session.usuario.id} busy={busy} run={(...args) => { setOperation('save'); return run(...args) }} api={api} invalidate={invalidate} confirm={confirm} error={operation === 'save' ? error : null} /> : <>
      <p className="settings-permission">Estás visualizando la configuración como miembro. Solo los administradores pueden modificarla.</p>
      <SettingsSection title="Tu espacio" description="Los datos que identifican a tu grupo."><dl className="settings-readonly"><div><dt>Nombre</dt><dd>{space.nombre}</dd></div><div><dt>Tipo de espacio</dt><dd>{spaceTypes[space.tipo] || 'Sin tipo definido'}</dd></div><div><dt>Descripción</dt><dd>{space.descripcion || 'Sin descripción'}</dd></div></dl></SettingsSection>
      <SettingsSection title="Cómo reparten los gastos" description="La modalidad predeterminada para los próximos gastos."><p className="settings-readonly__value">{splitLabel(space.reglaReparto)}</p></SettingsSection>
      <SettingsSection title="Presupuesto del espacio" description="Es acumulado y se descuenta al cerrar liquidaciones."><dl className="settings-readonly"><div><dt>Saldo disponible</dt><dd>{space.presupuestoBase != null ? `${money(space.presupuestoBase)} ARS` : 'No disponible'}</dd></div></dl></SettingsSection>
    </>}
    <SettingsSection title="Invitar personas" description="Sumá integrantes compartiendo la invitación a tu espacio.">
      {space.codigo ? <InvitationCode code={space.codigo} spaceName={space.nombre} compact /> : <p className="settings-context">El código de invitación no está disponible. Volvé a cargar el espacio.</p>}
    </SettingsSection>
    {isAdmin && <SettingsSection title="Eliminar espacio" description="Esta acción afecta a todos los integrantes." className="settings-delete">
      <p>Se borrarán permanentemente los gastos, balances, liquidaciones y recurrentes de este espacio.</p>
      <Button variant="danger" onClick={deleteSpace} loading={busy}><Icon name="close" size={16} />Eliminar este espacio</Button>
      {operation === 'delete' && error && <InlineAlert tone="error">{error.message}</InlineAlert>}
    </SettingsSection>}
  </div>
}
