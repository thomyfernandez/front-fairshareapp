import { useRef, useState } from 'react'
import { Button, ChoiceCards, CurrencyField, Field, InlineAlert, Submit } from '../../components/ui'
import { formatCurrencyInput, parseCurrencyInput } from '../../lib/currency-input'
import { money } from '../../lib/format'

import { spaceTypes, splitOptions, splitLabel } from './settings-options'

export function SettingsSection({ title, description, children, className = '' }) {
  return <section className={`settings-section ${className}`} aria-label={title}>
    <div className="settings-section__heading"><h2>{title}</h2><p>{description}</p></div>
    <div className="settings-section__content">{children}</div>
  </section>
}

export function SettingsForm({ space, spaceId, userId, busy, run, api, invalidate, confirm, error }) {
  const [edits, setEdits] = useState({})
  const [saved, setSaved] = useState(null)
  const [checking, setChecking] = useState(false)
  const [notice, setNotice] = useState('')
  const [validation, setValidation] = useState({})
  const latestSpace = useRef(space)
  latestSpace.current = space
  const locked = useRef(false)
  // Usa la respuesta confirmada mientras llega la actualización del contexto.
  const current = saved?.source === space ? saved.data : space
  const values = {
    nombre: edits.nombre ?? current.nombre,
    descripcion: edits.descripcion ?? current.descripcion ?? '',
    tipo: edits.tipo ?? current.tipo ?? 'HOGAR',
    reglaReparto: edits.reglaReparto ?? current.reglaReparto,
    presupuestoBase: edits.presupuestoBase ?? formatCurrencyInput(current.presupuestoBase),
  }
  const parsed = parseCurrencyInput(values.presupuestoBase)
  const normalized = { ...values, nombre: values.nombre.trim(), descripcion: values.descripcion.trim(), presupuestoBase: parsed }
  const body = Object.fromEntries(Object.keys(edits).map(key => [key, normalized[key]])
    .filter(([key, value]) => value !== (key === 'presupuestoBase' && current[key] != null ? Number(current[key]) : current[key] ?? '')))
  const dirty = Object.keys(body).length > 0
  const budgetError = parsed === null ? 'Ingresá un importe entre 0 y 9.999.999.999,99. Usá coma para los centavos.' : undefined
  const disabled = busy || checking
  const change = (key, value) => { setEdits(previous => ({ ...previous, [key]: value })); setNotice(''); setValidation(previous => ({ ...previous, [key]: undefined })) }

  async function save(event) {
    event.preventDefault()
    if (locked.current || disabled || !dirty) return
    const errors = {}
    if (values.nombre.trim().length < 2 || values.nombre.trim().length > 100) errors.nombre = 'El nombre debe tener entre 2 y 100 caracteres.'
    if (values.descripcion.trim().length > 255) errors.descripcion = 'La descripción puede tener hasta 255 caracteres.'
    if (budgetError) errors.presupuestoBase = budgetError
    setValidation(errors)
    if (Object.keys(errors).length) {
      event.currentTarget.querySelector(`[name="${Object.keys(errors)[0]}"]`)?.focus()
      return
    }
    locked.current = true
    setChecking(true)
    setNotice('')
    try {
      const sensitive = []
      if ('reglaReparto' in body) sensitive.push(`Los próximos gastos se repartirán «${splitLabel(body.reglaReparto).toLocaleLowerCase('es-AR')}». Los gastos existentes conservan su reparto.`)
      if ('presupuestoBase' in body) sensitive.push(`El saldo disponible pasará de ${current.presupuestoBase == null ? 'no disponible' : money(current.presupuestoBase)} a ${money(body.presupuestoBase)}. Este importe reemplaza el saldo actual; no se suma.`)
      if (sensitive.length && !await confirm({ title: 'Revisá los cambios del espacio', description: sensitive.join(' '), confirmLabel: 'Guardar cambios' })) return
      // Un saldo actualizado durante la revisión requiere volver a revisar el cambio.
      if (Object.keys(body).some(key => latestSpace.current[key] !== space[key])) {
        setNotice('Los datos del espacio cambiaron. Revisá los valores actuales antes de guardar.')
        return
      }
      const result = await run(() => api(`/api/v1/espacios/${spaceId}?solicitanteId=${userId}`, { method: 'PUT', body }), 'Cambios guardados.')
      if (result.ok) {
        setSaved({ source: latestSpace.current, data: result.data || { ...current, ...body } })
        setEdits({})
        setNotice('Cambios guardados.')
        invalidate()
      }
    } finally { locked.current = false; setChecking(false) }
  }

  return <form className="settings-form" onSubmit={save} noValidate aria-label="Configuración del espacio">
    {error && <InlineAlert tone="error">{error.message}</InlineAlert>}
    <SettingsSection title="Tu espacio" description="Los datos que identifican a tu grupo.">
      <fieldset disabled={disabled} className="settings-fields">
        <legend className="sr-only">Datos del espacio</legend>
        <div className="settings-fields__row">
          <Field label="Nombre del espacio" name="nombre" value={values.nombre} onChange={event => change('nombre', event.target.value)} required minLength={2} maxLength={100} error={validation.nombre || error?.fieldErrors?.nombre} />
          <Field label="Tipo de espacio" error={error?.fieldErrors?.tipo}><select name="tipo" value={values.tipo} onChange={event => change('tipo', event.target.value)}>{Object.entries(spaceTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        </div>
        <Field label="Descripción (opcional)" error={validation.descripcion || error?.fieldErrors?.descripcion}><textarea name="descripcion" value={values.descripcion} onChange={event => change('descripcion', event.target.value)} maxLength={255} rows={2} /></Field>
      </fieldset>
    </SettingsSection>
    <SettingsSection title="Cómo reparten los gastos" description="Elegí la modalidad predeterminada para los próximos gastos.">
      <ChoiceCards label="Modalidad de reparto" name="reglaReparto" value={values.reglaReparto} onChange={value => change('reglaReparto', value)} options={splitOptions} disabled={disabled} error={error?.fieldErrors?.reglaReparto} />
      {values.reglaReparto === 'PROPORCIONAL' && <p className="settings-context">El reparto usa los ingresos declarados para el período del gasto. Cada participante puede actualizarlos desde Mis ingresos.</p>}
    </SettingsSection>
    <SettingsSection title="Presupuesto del espacio" description="El saldo disponible para cerrar gastos compartidos.">
      <CurrencyField label="Saldo disponible (ARS)" name="presupuestoBase" value={values.presupuestoBase} onChange={value => change('presupuestoBase', value)} disabled={disabled} required error={budgetError || validation.presupuestoBase || error?.fieldErrors?.presupuestoBase} hint="Al guardar, este importe reemplaza el saldo actual. No se suma al presupuesto." />
      <p className="settings-context">Es acumulado y no se reinicia cada mes. Se descuenta cuando cerrás una liquidación.</p>
    </SettingsSection>
    <div className="settings-save-bar">
      <p role="status" aria-live="polite">{notice || (dirty ? 'Tenés cambios sin guardar' : 'Sin cambios pendientes')}</p>
      <div>{dirty && <Button variant="ghost" disabled={disabled} onClick={() => { setEdits({}); setValidation({}); setNotice('') }}>Descartar cambios</Button>}<Submit busy={busy} disabled={checking || !dirty || Boolean(budgetError)}>Guardar cambios</Submit></div>
    </div>
  </form>
}
