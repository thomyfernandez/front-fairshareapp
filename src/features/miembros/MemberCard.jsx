import { Badge, Button, Card, Icon } from '../../components/ui'
import { changeRoleActionLabel, roleLabel, roleTone } from './model'

export function MemberCard({ member, isSelf, canManageRoles, onChangeRole }) {
  return (
    <Card as="li" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-panel text-brand-primary"
          aria-hidden="true"
        >
          <Icon name="users" size={20} />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-primary truncate">
            {member.nombreUsuario}
            {isSelf && <span className="font-normal text-secondary"> (vos)</span>}
          </p>
          <p className="text-sm text-secondary truncate">{member.emailUsuario}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={roleTone(member.rol)}>{roleLabel(member.rol)}</Badge>
        {canManageRoles && (
          <Button
            variant="secondary"
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
