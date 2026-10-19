import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { UIProvider } from '../components/ui'
import { MemberCard } from '../features/miembros/MemberCard'
import { MembersList } from '../features/miembros/MembersList'
import {
  changeRoleActionLabel,
  isSoleAdmin,
  otherRole,
  roleChangeConsequence,
  roleLabel,
} from '../features/miembros/model'

describe('model de miembros', () => {
  const admin = { usuarioId: 1, rol: 'ADMIN' }
  const miembro = { usuarioId: 2, rol: 'MIEMBRO' }

  it('roleLabel y otherRole traducen el enum del backend', () => {
    expect(roleLabel('ADMIN')).toBe('Administrador')
    expect(roleLabel('MIEMBRO')).toBe('Miembro')
    expect(otherRole('ADMIN')).toBe('MIEMBRO')
    expect(otherRole('MIEMBRO')).toBe('ADMIN')
  })

  it('changeRoleActionLabel describe la acción según el rol actual', () => {
    expect(changeRoleActionLabel('ADMIN')).toMatch(/quitar/i)
    expect(changeRoleActionLabel('MIEMBRO')).toMatch(/hacer administrador/i)
  })

  it('isSoleAdmin detecta cuando un admin es el único administrador del espacio', () => {
    expect(isSoleAdmin([admin, miembro], 1)).toBe(true)
    expect(isSoleAdmin([admin, { ...miembro, rol: 'ADMIN' }], 1)).toBe(false)
    expect(isSoleAdmin([admin, miembro], 2)).toBe(false)
  })

  it('roleChangeConsequence advierte con mayor severidad cuando el espacio quedaría sin administradores', () => {
    const normal = roleChangeConsequence({ nextRole: 'MIEMBRO', isSelf: false, soleAdmin: false })
    const riesgoso = roleChangeConsequence({ nextRole: 'MIEMBRO', isSelf: true, soleAdmin: true })
    expect(normal).toMatch(/permisos de administración/i)
    expect(riesgoso).toMatch(/único administrador/i)
    expect(riesgoso).not.toBe(normal)
  })
})

describe('MemberCard', () => {
  const member = { id: 10, usuarioId: 2, nombreUsuario: 'Juan Pérez', emailUsuario: 'juan@test.com', rol: 'MIEMBRO' }

  it('muestra nombre, identificación y rol comprensible', () => {
    render(
      <UIProvider>
        <MemberCard member={member} isSelf={false} canManageRoles={false} onChangeRole={vi.fn()} />
      </UIProvider>
    )
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('juan@test.com')).toBeInTheDocument()
    expect(screen.getByText('Miembro')).toBeInTheDocument()
  })

  it('marca al propio usuario y oculta la acción de rol cuando no se puede administrar', () => {
    render(
      <UIProvider>
        <MemberCard member={member} isSelf canManageRoles={false} onChangeRole={vi.fn()} />
      </UIProvider>
    )
    expect(screen.getByText('(vos)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /hacer administrador/i })).not.toBeInTheDocument()
  })

  it('permite disparar el cambio de rol cuando el usuario puede administrar', () => {
    const onChangeRole = vi.fn()
    render(
      <UIProvider>
        <MemberCard member={member} isSelf={false} canManageRoles onChangeRole={onChangeRole} />
      </UIProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: /hacer administrador/i }))
    expect(onChangeRole).toHaveBeenCalledWith(member)
  })
})

describe('MembersList', () => {
  it('muestra un estado vacío cuando no hay integrantes', () => {
    render(
      <UIProvider>
        <MembersList members={[]} currentUserId={1} canManageRoles={false} onChangeRole={vi.fn()} />
      </UIProvider>
    )
    expect(screen.getByText(/todavía no hay integrantes/i)).toBeInTheDocument()
  })

  it('renderiza una tarjeta por integrante', () => {
    const members = [
      { id: 1, usuarioId: 1, nombreUsuario: 'Ana', emailUsuario: 'ana@test.com', rol: 'ADMIN' },
      { id: 2, usuarioId: 2, nombreUsuario: 'Beto', emailUsuario: 'beto@test.com', rol: 'MIEMBRO' },
    ]
    render(
      <UIProvider>
        <MembersList members={members} currentUserId={1} canManageRoles onChangeRole={vi.fn()} />
      </UIProvider>
    )
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Beto')).toBeInTheDocument()
  })
})

vi.mock('../hooks/useFeature', () => ({ useFeature: vi.fn() }))

import { useFeature } from '../hooks/useFeature'
import MembersPage from '../features/miembros/MembersPage'

function renderMembersPage(overrides = {}) {
  const mutate = overrides.mutate || vi.fn().mockResolvedValue({ ok: true })
  useFeature.mockReturnValue({
    space: { id: 5, nombre: 'Depto', codigo: 'DEPTO-123' },
    spaceId: 5,
    membersState: { data: overrides.members, error: null, loading: false, reload: vi.fn() },
    members: overrides.members,
    session: { usuario: { id: overrides.userId ?? 1, nombre: 'Yo' } },
    isAdmin: overrides.isAdmin ?? true,
    busy: overrides.busy ?? false,
    error: overrides.error ?? null,
    mutate,
    ...overrides.extra,
  })
  render(
    <MemoryRouter>
      <UIProvider>
        <MembersPage />
      </UIProvider>
    </MemoryRouter>
  )
  return { mutate }
}

describe('MembersPage', () => {
  const members = [
    { id: 1, usuarioId: 1, nombreUsuario: 'Yo', emailUsuario: 'yo@test.com', rol: 'ADMIN' },
    { id: 2, usuarioId: 2, nombreUsuario: 'Otra Persona', emailUsuario: 'otra@test.com', rol: 'MIEMBRO' },
  ]

  it('oculta las acciones de rol para quien no es administrador', () => {
    renderMembersPage({ members, isAdmin: false })
    expect(screen.queryByRole('button', { name: /hacer administrador|quitar administración/i })).not.toBeInTheDocument()
  })

  it('explica las consecuencias antes de confirmar un ascenso a administrador', () => {
    renderMembersPage({ members })
    fireEvent.click(screen.getByRole('button', { name: /hacer administrador a otra persona/i }))
    expect(screen.getByText(/va a poder cambiar roles/i)).toBeInTheDocument()
  })

  it('advierte cuando el propio administrador es el único y está a punto de dejar el rol', () => {
    const soloAdminMembers = [members[0], { ...members[1], rol: 'MIEMBRO' }]
    renderMembersPage({ members: soloAdminMembers, userId: 1, isAdmin: true })
    fireEvent.click(screen.getByRole('button', { name: /quitar administración a yo/i }))
    expect(screen.getByText(/único administrador/i)).toBeInTheDocument()
  })

  it('confirma el cambio de rol llamando a mutate con el rol y el solicitante correctos', async () => {
    const { mutate } = renderMembersPage({ members })
    fireEvent.click(screen.getByRole('button', { name: /hacer administrador a otra persona/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar cambio/i }))
    expect(mutate).toHaveBeenCalledWith(
      '/api/v1/espacios/5/miembros/2/rol?rol=ADMIN&solicitanteId=1',
      'PATCH',
      undefined,
      'Rol actualizado.'
    )
  })

  it('muestra el rechazo del backend sin cerrar el diálogo', async () => {
    const mutate = vi.fn().mockResolvedValue({ ok: false, error: { message: 'No tenés permisos de administrador.' } })
    renderMembersPage({ members, mutate, error: { message: 'No tenés permisos de administrador.' } })
    fireEvent.click(screen.getByRole('button', { name: /hacer administrador a otra persona/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar cambio/i }))
    expect(await screen.findByText('No tenés permisos de administrador.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmar cambio/i })).toBeInTheDocument()
  })

  it('muestra el ingreso declarado propio y deja claro que la edición está pendiente', () => {
    const membersConSueldo = [{ ...members[0], sueldoDeclarado: 500000 }, members[1]]
    renderMembersPage({ members: membersConSueldo })
    expect(screen.getByText('$ 500.000,00')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Tu ingreso declarado en este espacio', { exact: true }))
    expect(screen.getByText(/La edición del ingreso declarado todavía no está disponible/)).toBeVisible()
  })

  it('muestra un estado honesto cuando todavía no se declaró ingreso en el espacio', () => {
    renderMembersPage({ members })
    expect(screen.getByText(/todavía no declaraste un ingreso/i)).toBeInTheDocument()
  })
})
