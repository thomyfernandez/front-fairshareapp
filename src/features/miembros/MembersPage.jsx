import { incomeDestination } from '../../app/navigation'
import { useState } from 'react'
import { Link } from 'react-router'
import { PanelDisclosure, InlineAlert, Modal, PageHeader, ResourceState } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { money } from '../../lib/format'
import { ChangeRoleDialog } from './ChangeRoleDialog'
import { InviteCard } from './InviteCard'
import { MembersList } from './MembersList'
import { isSoleAdmin, otherRole } from './model'

export default function MembersPage() {
  const { space, spaceId, membersState, members, session, isAdmin, busy, error, mutate } = useFeature(null)
  const userId = session.usuario.id
  const currentMember = members.find((m) => m.usuarioId === userId)
  const [roleTarget, setRoleTarget] = useState(null)

  const closeDialog = () => setRoleTarget(null)

  async function confirmRoleChange() {
    const nextRole = otherRole(roleTarget.rol)
    const result = await mutate(
      `/api/v1/espacios/${spaceId}/miembros/${roleTarget.usuarioId}/rol?rol=${nextRole}&solicitanteId=${userId}`,
      'PATCH',
      undefined,
      'Rol actualizado.'
    )
    if (result.ok) closeDialog()
  }

  return (
    <div className="feature-page members-page">
      <PageHeader
        eyebrow="INTEGRANTES Y ACCESO"
        title="Miembros"
        description="Mirá quién forma parte de este espacio y quién puede administrarlo."
      />

      <ResourceState resource={membersState}>
        <div className="flex flex-col gap-6">

          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-primary">Integrantes del espacio</h2>
              <span className="text-sm text-secondary">
                {members.length} {members.length === 1 ? 'integrante' : 'integrantes'}
              </span>
            </div>
            <MembersList
              members={members}
              currentUserId={userId}
              canManageRoles={isAdmin}
              onChangeRole={setRoleTarget}
            />
          </section>

          <InviteCard space={space} />
          <PanelDisclosure title="Tu ingreso declarado en este espacio" icon="wallet">
            <p className="text-sm text-secondary">
              Es el ingreso que compartís como referencia en este espacio. Los repartos proporcionales usan tu ingreso mensual de <Link to={incomeDestination(spaceId)} className="ui-link">Mis ingresos</Link>.
            </p>
            <p className="mt-2 text-base font-medium text-primary">
              {currentMember?.sueldoDeclarado != null
                ? money(currentMember.sueldoDeclarado)
                : 'Todavía no declaraste un ingreso en este espacio.'}
            </p>
            <div className="mt-3">
              <InlineAlert tone="info">
                La edición del ingreso declarado todavía no está disponible desde esta pantalla.
              </InlineAlert>
            </div>
          </PanelDisclosure>
        </div>
      </ResourceState>

      <Modal
        open={Boolean(roleTarget)}
        onClose={closeDialog}
        dismissible={!busy}
        title={roleTarget ? `Cambiar rol de ${roleTarget.nombreUsuario}` : ''}
      >
        {roleTarget && (
          <ChangeRoleDialog
            member={roleTarget}
            isSelf={roleTarget.usuarioId === userId}
            soleAdmin={isSoleAdmin(members, roleTarget.usuarioId)}
            busy={busy}
            error={error}
            onConfirm={confirmRoleChange}
            onCancel={closeDialog}
          />
        )}
      </Modal>
    </div>
  )
}
