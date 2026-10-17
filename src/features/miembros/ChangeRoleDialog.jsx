import { Button, InlineAlert } from '../../components/ui'
import { otherRole, roleChangeConsequence, roleLabel } from './model'

export function ChangeRoleDialog({ member, isSelf, soleAdmin, busy, error, onConfirm, onCancel }) {
  const nextRole = otherRole(member.rol)
  const risky = nextRole === 'MIEMBRO' && soleAdmin
  const consequence = roleChangeConsequence({ nextRole, isSelf, soleAdmin })

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-secondary">Rol actual</dt>
          <dd className="font-medium text-primary">{roleLabel(member.rol)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-secondary">Nuevo rol</dt>
          <dd className="font-medium text-primary">{roleLabel(nextRole)}</dd>
        </div>
      </dl>

      <InlineAlert tone={risky ? 'error' : 'info'}>{consequence}</InlineAlert>

      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}

      <div className="flex flex-wrap gap-3">
        <Button loading={busy} onClick={onConfirm}>
          Confirmar cambio
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
