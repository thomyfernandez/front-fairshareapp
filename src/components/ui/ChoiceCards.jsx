import { useId } from 'react'

export function ChoiceCards({ label, name, value, onChange, options, disabled, error }) {
  const id = useId()
  return <fieldset className="ui-choice-cards" disabled={disabled} aria-describedby={error ? `${id}-error` : undefined}>
    <legend className="sr-only">{label}</legend>
    <div className="ui-choice-cards__options">{options.map(option => <label className="ui-choice-card" key={option.value}>
      <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} aria-invalid={error ? true : undefined} />
      <span><strong>{option.label}</strong><span>{option.description}</span></span>
    </label>)}</div>
    {error && <p id={`${id}-error`} className="ui-field__error">{error}</p>}
  </fieldset>
}
