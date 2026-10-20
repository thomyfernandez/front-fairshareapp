// Isotipo "F =": los brazos de la F forman un signo igual, la idea de repartir en partes justas.
// Usa los tokens del tema activo; public/favicon.svg repite la geometría con valores fijos.
export function BrandMark({ size = 34, className = '' }) {
  return <svg className={`brand-mark ${className}`} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <rect width="32" height="32" rx="8.5" fill="var(--color-brand-primary)" />
    <g fill="var(--color-text-inverse)">
      <rect x="8" y="7.5" width="4.5" height="17" rx="2.25" />
      <rect x="15" y="7.5" width="9.5" height="4.5" rx="2.25" />
      <rect x="15" y="14.5" width="9.5" height="4.5" rx="2.25" />
    </g>
  </svg>
}
