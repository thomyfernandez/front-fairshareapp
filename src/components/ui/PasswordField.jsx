import { useId, useState } from 'react'
import { Button } from './Button'

// Same structure as Field, with a toggle that never leaves the input's accessible name.
export function PasswordField({ label, hint, error, id: providedId, className = '', ...props }) {
  const generatedId = useId()
  const id = providedId || generatedId
  const [visible, setVisible] = useState(false)
  const description = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  return <div className={`ui-field ${className}`}>
    <label htmlFor={id}>{label}{props.required && <span className="sr-only"> (obligatorio)</span>}</label>
    <div className="ui-password">
      <input {...props} id={id} type={visible ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} className="ui-input" aria-invalid={error ? true : undefined} aria-describedby={description} />
      <Button variant="ghost" className="ui-password__toggle" aria-controls={id} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVisible(value => !value)}>{visible ? 'Ocultar' : 'Mostrar'}</Button>
    </div>
    {hint && <span className="ui-field__hint" id={`${id}-hint`}>{hint}</span>}
    {error && <span className="ui-field__error" id={`${id}-error`}>{error}</span>}
  </div>
}
