import { forwardRef } from 'react'

export const Button = forwardRef(function Button({ variant = 'primary', size = 'normal', loading = false, disabled, type = 'button', className = '', children, ...props }, ref) {
  return <button ref={ref} type={type} className={`ui-button ui-button--${variant} ui-button--${size} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
    {loading && <span className="ui-spinner" aria-hidden="true" />}{children}
  </button>
})

export function Submit({ busy, children, ...props }) {
  return <Button type="submit" loading={busy} {...props}>{busy ? 'Procesando…' : children}</Button>
}
