import { useId } from 'react'
import { Icon } from './Icon'

// Presenta una tarea pendiente sin convertirla en una alerta intrusiva ni repetir balances.
export function ActionNotice({ title, description, action, tone = 'neutral', icon = 'info' }) {
  const id = useId()
  return <aside className={`ui-action-notice ui-action-notice--${tone}`} aria-labelledby={id}><Icon name={icon} /><div className="ui-action-notice__content"><h3 id={id}>{title}</h3>{description && <p>{description}</p>}</div>{action && <div className="ui-action-notice__action">{action}</div>}</aside>
}
