import { cloneElement, useId } from 'react'

export function Field({ label, hint, error, children, id: providedId, className = '', ...props }) {
  const generatedId = useId()
  const id = providedId || generatedId
  const description = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  const controlProps = { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': description, className: `ui-input ${children?.props?.className || ''}` }
  return <div className={`ui-field ${className}`}>
    <label htmlFor={id}>{label}{props.required && <span className="sr-only"> (obligatorio)</span>}</label>
    {children ? cloneElement(children, controlProps) : <input {...props} {...controlProps} />}
    {hint && <span className="ui-field__hint" id={`${id}-hint`}>{hint}</span>}
    {error && <span className="ui-field__error" id={`${id}-error`}>{error}</span>}
  </div>
}

export function Checkbox({ label, error, id: providedId, ...props }) {
  const generatedId = useId()
  const id = providedId || generatedId
  return <div><label className="ui-checkbox" htmlFor={id}><input id={id} type="checkbox" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...props} /><span>{label}</span></label>{error && <p className="ui-field__error" id={`${id}-error`}>{error}</p>}</div>
}
