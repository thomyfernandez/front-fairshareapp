import { useState } from 'react'
import { Button, Card, EmptyState, Icon, Modal, PageHeader, ResourceState } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { money, periodLabel } from '../../lib/format'
import { IncomeForm } from './IncomeForm'
import { FRECUENCIA_LABELS, sortByPeriodDesc, TIPO_LABELS } from './model'

export default function IncomePage() {
  // editing: null = cerrado, { income: null } = alta, { income } = edición.
  const [editing, setEditing] = useState(null)
  const [formError, setFormError] = useState(null)
  const { resource, api, busy, run, invalidate, mutate, confirm } = useFeature('/api/v1/sueldos')
  const incomes = sortByPeriodDesc(resource.data)

  function openForm(income) {
    setFormError(null)
    setEditing({ income })
  }

  async function save(body, { replacing }) {
    const income = editing.income
    const label = periodLabel(body.mes, body.anio)
    const result = await run(
      () => api(`/api/v1/sueldos${income ? `/${income.id}` : ''}`, { method: income ? 'PUT' : 'POST', body }),
      income || replacing ? `Ingreso de ${label} actualizado.` : `Ingreso de ${label} registrado.`,
    )
    setFormError(result.ok ? null : result.error)
    if (result.ok) {
      setEditing(null)
      invalidate()
    }
  }

  async function remove(income) {
    const accepted = await confirm({
      title: 'Eliminar ingreso',
      description: `Se eliminará el ingreso de ${money(income.monto)} de ${periodLabel(income.mes, income.anio)}. Los próximos repartos proporcionales usarán tu ingreso más reciente.`,
      confirmLabel: 'Eliminar', danger: true,
    })
    if (accepted) mutate(`/api/v1/sueldos/${income.id}`, 'DELETE', undefined, 'Ingreso eliminado.')
  }

  return <div className="legacy-feature">
    <PageHeader
      title="Mis ingresos"
      description="Registrá tu ingreso de cada mes. Se usa para calcular tu parte en los gastos con reparto proporcional de ese período, en todos tus espacios."
      actions={<Button onClick={() => openForm(null)}><Icon name="plus" size={18} />Agregar ingreso</Button>}
    />
    <ResourceState resource={resource}>
      <Card>
        <h2>Ingresos por período</h2>
        <p className="text-sm text-secondary">Hay un único registro por mes: si guardás un período que ya existe, se actualiza ese registro.</p>
        {incomes.length ? <ul className="list-none m-0 p-0" aria-label="Ingresos registrados">
          {incomes.map(income => <li className="row" key={income.id}>
            <div>
              <strong>{periodLabel(income.mes, income.anio)}</strong>
              <small className="block text-secondary">{TIPO_LABELS[income.tipo] || income.tipo} · cobro {(FRECUENCIA_LABELS[income.frecuencia] || income.frecuencia).toLowerCase()}</small>
            </div>
            <strong>{money(income.monto)}</strong>
            <div className="filters m-0">
              <Button variant="secondary" disabled={busy} onClick={() => openForm(income)} aria-label={`Editar ingreso de ${periodLabel(income.mes, income.anio)}`}>Editar</Button>
              <Button variant="danger" disabled={busy} onClick={() => remove(income)} aria-label={`Eliminar ingreso de ${periodLabel(income.mes, income.anio)}`}>Eliminar</Button>
            </div>
          </li>)}
        </ul> : <EmptyState icon="wallet" title="Todavía no registraste ingresos" description="Agregá tu ingreso del mes para que los gastos proporcionales se repartan según lo que gana cada persona." action={<Button onClick={() => openForm(null)}>Agregar ingreso</Button>} />}
      </Card>
    </ResourceState>
    <Modal
      open={Boolean(editing)}
      onClose={() => setEditing(null)}
      dismissible={!busy}
      title={editing?.income ? `Editar ingreso de ${periodLabel(editing.income.mes, editing.income.anio)}` : 'Agregar ingreso'}
    >
      {editing && <IncomeForm
        income={editing.income}
        incomes={resource.data}
        busy={busy}
        error={formError}
        onSubmit={save}
        onCancel={() => setEditing(null)}
      />}
    </Modal>
  </div>
}
