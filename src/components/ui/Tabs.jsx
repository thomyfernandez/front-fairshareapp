import { useId } from 'react'

// Conserva los paneles montados para no perder formularios al cambiar de vista.
export function Tabs({ label, items, value, onChange }) {
  const id = useId()
  function navigate(event, index) {
    const last = items.length - 1
    const next = { ArrowRight: (index + 1) % items.length, ArrowLeft: (index + last) % items.length, Home: 0, End: last }[event.key]
    if (next === undefined) return
    event.preventDefault()
    onChange(items[next].value)
    event.currentTarget.parentElement.querySelectorAll('[role=tab]')[next]?.focus()
  }
  return <div className="ui-tabs">
    <div role="tablist" aria-label={label} className="ui-tabs__list">{items.map((item, index) => <button type="button" role="tab" key={item.value} id={`${id}-${item.value}-tab`} aria-controls={`${id}-${item.value}-panel`} aria-selected={value === item.value} tabIndex={value === item.value ? 0 : -1} onClick={() => onChange(item.value)} onKeyDown={event => navigate(event, index)}>{item.label}{item.count > 0 && <span className="ui-tabs__count" aria-hidden="true">{item.count}</span>}</button>)}</div>
    {items.map(item => <section key={item.value} role="tabpanel" id={`${id}-${item.value}-panel`} aria-labelledby={`${id}-${item.value}-tab`} hidden={value !== item.value}>{item.content}</section>)}
  </div>
}
