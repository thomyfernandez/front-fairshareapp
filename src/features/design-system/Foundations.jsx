import tokens from '../../../tokens.json'
import { Avatar, Money, SectionHeading } from '../../components/ui'

// La muestra usa la variable del tema activo; el texto indica el valor de ambos temas.
const themes = { Oscuro: tokens.themes.dark.colors, Claro: tokens.colors }
const colors = [
  ['Acción principal', 'brand-primary', ['brand', 'primary']],
  ['Balance protagonista', 'brand-soft', ['brand', 'soft']],
  ['Texto sobre balance', 'brand-ink', ['brand', 'ink']],
  ['Lienzo Cercana', 'workspace', ['bg', 'workspace']],
  ['Texto principal', 'text-primary', ['text', 'primary']],
  ['Texto de apoyo', 'text-secondary', ['text', 'secondary']],
  ['Estado positivo', 'success-foreground', ['success', 'foreground']],
  ['Requiere revisión', 'warning-foreground', ['warning', 'foreground']],
]
const hex = (palette, [group, name]) => palette[group][name].$value.hex

// Expone los tokens reales y sus roles para que diseño y código compartan la misma fuente.
export function Foundations() {
  return <section className="ds-section" id="fundamentos" aria-labelledby="ds-foundations-title"><SectionHeading id="ds-foundations-title" title="Fundamentos de Cercana" description="Calma, claridad y una identidad violeta reservada para lo que importa." />
    <ul className="ds-palette">{colors.map(([label, name, path]) => <li key={name}><span className="ds-swatch" style={{ backgroundColor: `var(--color-${name})` }} aria-hidden="true" /><div><strong>{label}</strong><code>--color-{name}</code><span>{Object.entries(themes).map(([theme, palette]) => `${theme} ${hex(palette, path)}`).join(' · ')}</span></div></li>)}</ul>
    <div className="ds-foundations-grid"><div><h3>Tipografía</h3><p className="ds-type-title">Inter, clara y cercana.</p><p>16 px para lectura. 14 px para contexto. 12 px para metadatos secundarios. El balance usa 40–48 px y nunca compite con otra cifra del mismo tamaño.</p><div className="ds-money-examples"><Money value={111382} hideZeroDecimals /><Money value={111382.5} hideZeroDecimals /></div><p>Solo se ocultan los decimales cuando son cero. El detalle conserva el formato completo.</p></div><div><h3>Espacio y forma</h3><div className="ds-spacing" aria-label="Escala de espaciado"><span>4</span><span>8</span><span>12</span><span>16</span><span>24</span><span>32</span></div><p>Espaciado en múltiplos de 4 px. Radio de 24 px para el balance; bordes y sombras discretos para el resto.</p><div className="ds-avatar-examples"><Avatar name="Thomas Fernandez" /><Avatar name="Ana Ruiz" size="small" /><span>Iniciales como apoyo; nombre completo junto al avatar.</span></div></div></div>
  </section>
}
