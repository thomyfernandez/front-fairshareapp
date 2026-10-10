import { useState } from 'react'
import { Button, Field, InlineAlert, Submit } from '../../components/ui'
import { formData } from '../../lib/format'

export function CreateSpaceForm({ onSubmit, busy, error, onCancel }) {
  const [regla, setRegla] = useState('CINCUENTA_CINCUENTA')
  const [presupuesto, setPresupuesto] = useState('0')
  const [budgetError, setBudgetError] = useState(null)

  const handleBudgetChange = (event) => {
    const { value, validity } = event.target
    setPresupuesto(value)

    if (validity?.badInput) {
      setBudgetError('Ingresá un importe válido mayor o igual a 0.')
      return
    }

    if (value === '' || value.includes('-')) {
      setBudgetError('El presupuesto base no puede ser negativo.')
      return
    }

    const num = Number(value)
    if (Number.isNaN(num) || num < 0) {
      setBudgetError('El presupuesto base no puede ser negativo.')
      return
    }

    setBudgetError(null)
  }

  const handleBudgetKeyDown = (event) => {
    if (event.key === '-' || event.key === 'e' || event.key === 'E' || event.key === '+') {
      event.preventDefault()
    }
  }

  const isInvalidBudget = Boolean(budgetError) || presupuesto === '' || Number(presupuesto) < 0 || Number.isNaN(Number(presupuesto))

  const handleSubmit = (event) => {
    event.preventDefault()
    if (isInvalidBudget) return
    const data = formData(event)
    data.presupuestoBase = Number(presupuesto || 0)
    onSubmit?.(data)
  }

  const displayBudgetError = budgetError || (isInvalidBudget ? 'El presupuesto base no puede ser negativo.' : error?.fieldErrors?.presupuestoBase)

  return (
    <form onSubmit={handleSubmit} className="create-space-form" noValidate>
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}

      <Field
        label="Nombre del espacio"
        name="nombre"
        placeholder="Ej. Departamento Palermo, Vacaciones 2026"
        data-autofocus
        required
        minLength={2}
        maxLength={100}
        error={error?.fieldErrors?.nombre}
      />

      <Field
        label="Descripción (opcional)"
        name="descripcion"
        placeholder="Breve detalle sobre los gastos que compartirán"
        maxLength={255}
        error={error?.fieldErrors?.descripcion}
      />

      <Field label="Tipo de espacio" name="tipo">
        <select name="tipo" defaultValue="HOGAR">
          <option value="HOGAR">Hogar (convivencia, expensas, servicios)</option>
          <option value="VIAJE">Viaje (vacaciones, escapadas)</option>
          <option value="PAREJA">Pareja (gastos cotidianos)</option>
          <option value="TRABAJO">Trabajo o Proyecto</option>
          <option value="OTRO">Otro</option>
        </select>
      </Field>

      <Field
        label="Modalidad de reparto inicial"
        name="reglaReparto"
        error={error?.fieldErrors?.reglaReparto}
      >
        <select
          name="reglaReparto"
          value={regla}
          onChange={(e) => setRegla(e.target.value)}
        >
          <option value="CINCUENTA_CINCUENTA">Equitativa (partes iguales)</option>
          <option value="PROPORCIONAL">Proporcional (según ingresos declarados)</option>
        </select>
      </Field>

      <div style={{ margin: '12px 0' }}>
        <InlineAlert tone="info">
          {regla === 'PROPORCIONAL'
            ? 'En el reparto proporcional, los gastos se distribuyen según el sueldo mensual que declare cada participante. Es ideal si los integrantes tienen ingresos diferentes.'
            : 'En el reparto equitativo, todos los participantes aportan la misma parte de cada gasto en partes iguales.'}
        </InlineAlert>
      </div>

      <Field
        label="Presupuesto base inicial (ARS)"
        name="presupuestoBase"
        type="number"
        min="0"
        step="0.01"
        value={presupuesto}
        onChange={handleBudgetChange}
        onKeyDown={handleBudgetKeyDown}
        required
        error={displayBudgetError}
        hint="Es un fondo estimado o límite de gastos para el espacio. No es una cuenta bancaria ni dinero real transferido."
      />

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
        )}
        <Submit busy={busy} disabled={isInvalidBudget}>Crear espacio</Submit>
      </div>
    </form>
  )
}
