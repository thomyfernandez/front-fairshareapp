import { EmptyState } from '../../components/ui'
import { MemberCard } from './MemberCard'

export function MembersList({ members, currentUserId, canManageRoles, onChangeRole }) {
  if (!members.length) {
    return (
      <EmptyState
        icon="users"
        title="Todavía no hay integrantes"
        description="Compartí el código de invitación de este espacio para sumar al primer integrante."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          isSelf={member.usuarioId === currentUserId}
          canManageRoles={canManageRoles}
          onChangeRole={onChangeRole}
        />
      ))}
    </ul>
  )
}
