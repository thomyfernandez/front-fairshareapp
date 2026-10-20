import { money } from '../../lib/format'

// Conserva el importe completo para lectores de pantalla y al copiar el texto.
export function Money({ value, hideZeroDecimals = false, className = '' }) {
  const formatted = money(value)
  const separator = formatted.lastIndexOf(',')
  const decimals = formatted.slice(separator)
  return <span className={`money ${className}`}><span className="sr-only">{formatted}</span><span aria-hidden="true">{formatted.slice(0, separator)}{(!hideZeroDecimals || decimals !== ',00') && <span className="money__decimals">{decimals}</span>}</span></span>
}
