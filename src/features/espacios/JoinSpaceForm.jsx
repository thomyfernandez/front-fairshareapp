import { useState } from 'react'
import { Button, Field, InlineAlert, Submit } from '../../components/ui'
import { formData } from '../../lib/format'

export function JoinSpaceForm({ onSubmit, busy, error, initialCode = '', onCancel }) {
  const [code, setCode] = useState(initialCode ? initialCode.toUpperCase() : '')

  const handleSubmit = (event) => {
    event.preventDefault()
    const data = formData(event)
    onSubmit?.({ codigo: data.codigo?.trim().toUpperCase() })
  }

  return (
    <form onSubmit={handleSubmit} className="join-space-form" noValidate>
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}

      <Field
        label="Código de invitación"
        name="codigo"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Ej. ABC-123"
        data-autofocus
        required
        minLength={3}
        maxLength={50}
        error={error?.fieldErrors?.codigo}
        hint="Pedile el código de invitación a cualquier integrante que ya pertenezca al espacio."
      />

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
        )}
        <Submit busy={busy}>Unirme al espacio</Submit>
      </div>
    </form>
  )
}
