import { Badge, Button, Card, Avatar } from '../../components/ui'
import { changeRoleActionLabel, roleLabel, roleTone } from './model'

export function MemberCard({ member, isSelf, canManageRoles, onChangeRole }) {
  return (
    <Card as="li" className="member-item">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={member.nombreUsuario} />
        <div className="min-w-0">
          <p className="font-medium text-primary break-words">
            {member.nombreUsuario}
            {isSelf && <span className="font-normal text-secondary"> (vos)</span>}
          </p>
          <p className="text-sm text-secondary break-all">{member.emailUsuario}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={roleTone(member.rol)}>{roleLabel(member.rol)}</Badge>
        {canManageRoles && (
          <Button
            variant="ghost"
            onClick={() => onChangeRole(member)}
            aria-label={`${changeRoleActionLabel(member.rol)} a ${member.nombreUsuario}`}
          >
            {changeRoleActionLabel(member.rol)}
          </Button>
        )}
      </div>
    </Card>
  )
}
