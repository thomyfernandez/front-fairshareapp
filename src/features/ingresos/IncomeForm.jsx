import { useState } from 'react'
import { Button, Field, InlineAlert, Submit } from '../../components/ui'
import { money, monthOptions, periodLabel } from '../../lib/format'
import { findByPeriod, FRECUENCIA_LABELS, TIPO_LABELS } from './model'

export function IncomeForm({ income, incomes, busy, error, onSubmit, onCancel }) {
  const now = new Date()
  const maxYear = now.getFullYear() + 1
  const [period, setPeriod] = useState({ mes: income?.mes || now.getMonth() + 1, anio: income?.anio || now.getFullYear() })
  const existing = findByPeriod(incomes, period.mes, period.anio, income?.id ?? null)
  const fieldErrors = error?.fieldErrors || {}
  // Al editar, mover el ingreso a un período ocupado lo rechaza el servidor (409); lo mostramos junto al período.
  const periodError = income && error?.status === 409 ? error.message : fieldErrors.mes || fieldErrors.anio

  function submit(event) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    onSubmit({
      monto: Number(data.monto), tipo: data.tipo, frecuencia: data.frecuencia,
      mes: Number(period.mes), anio: Number(period.anio),
    }, { replacing: existing })
  }

  return <form onSubmit={submit}>
    <Field label="Monto" name="monto" type="number" inputMode="decimal" min="0.01" step="0.01" required defaultValue={income?.monto} error={fieldErrors.monto} data-autofocus />
    <div className="grid-form">
      <Field label="Mes" error={periodError}>
        <select value={period.mes} onChange={event => setPeriod(value => ({ ...value, mes: Number(event.target.value) }))}>
          {monthOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </Field>
      <Field label="Año" type="number" min="2000" max={maxYear} required value={period.anio} onChange={event => setPeriod(value => ({ ...value, anio: event.target.value }))} />
    </div>
    <div className="grid-form">
      <Field label="Tipo" error={fieldErrors.tipo}>
        <select name="tipo" defaultValue={income?.tipo || 'FIJO'}>
          {Object.entries(TIPO_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label="Frecuencia de cobro" error={fieldErrors.frecuencia}>
        <select name="frecuencia" defaultValue={income?.frecuencia || 'MENSUAL'}>
          {Object.entries(FRECUENCIA_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
    </div>

    {existing && !income && <InlineAlert tone="warning">
      Ya tenés un ingreso de {money(existing.monto)} para {periodLabel(existing.mes, existing.anio)}. Si guardás, ese registro se actualizará con los nuevos datos (no se crea uno nuevo).
    </InlineAlert>}
    {existing && income && <InlineAlert tone="warning">
      Ya tenés otro ingreso para {periodLabel(existing.mes, existing.anio)}. Elegí un período distinto o editá ese registro.
    </InlineAlert>}
    {error && error.status !== 409 && !Object.keys(fieldErrors).length && <InlineAlert tone="error">{error.message}</InlineAlert>}

    <div className="filters">
      <Submit busy={busy} disabled={Boolean(existing && income)}>{income ? 'Guardar cambios' : existing ? 'Actualizar ingreso' : 'Guardar ingreso'}</Submit>
      <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancelar</Button>
    </div>
  </form>
}
