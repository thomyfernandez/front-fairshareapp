import { Button } from './Button'
import { Icon } from './Icon'

export function Card({ as: Tag = 'section', className = '', children, ...props }) {
  return <Tag className={`ui-card ${className}`} {...props}>{children}</Tag>
}
export function Badge({ tone = 'neutral', children }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>
}
export function PageHeader({ eyebrow, title, description, actions }) {
  return <div className="page-heading"><div>{eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}<h1 tabIndex={-1} data-page-heading>{title}</h1>{description && <p className="page-heading__description">{description}</p>}</div>{actions && <div className="page-heading__actions">{actions}</div>}</div>
}
export function EmptyState({ title, description, action, icon = 'grid', children }) {
  return <div className="ui-empty"><span className="ui-empty__icon"><Icon name={icon} size={26} /></span><h2>{title || children}</h2>{description && <p>{description}</p>}{action}</div>
}
export function Empty({ children }) { return <EmptyState title={children} /> }
export function LoadingState({ label = 'Cargando información…', rows = 3 }) {
  return <div className="ui-loading" role="status" aria-live="polite"><span className="sr-only">{label}</span>{Array.from({ length: rows }, (_, index) => <div className="ui-skeleton" key={index} aria-hidden="true" />)}</div>
}
export function ErrorState({ error, onRetry, title = 'No pudimos cargar esta información' }) {
  return <div className="ui-error" role="alert"><Icon name="info" /><div><h2>{title}</h2><p>{error?.message || 'Intentá nuevamente en unos momentos.'}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Reintentar</Button>}</div></div>
}
export function InlineAlert({ tone = 'info', children }) {
  return <div className={`ui-alert ui-alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon name="info" /><div>{children}</div></div>
}
export function ResourceState({ resource, children }) {
  if (resource.loading) return <LoadingState />
  if (resource.error) return <ErrorState error={resource.error} onRetry={resource.reload} />
  return children
}
