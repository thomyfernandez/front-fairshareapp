import { Button, Icon } from '../components/ui'
import { useThemePreference } from './useAppTheme'

// El texto nombra la acción disponible, no el estado: así no depende del ícono para entenderse.
export function ThemeToggle({ className = '', compact = false }) {
  const { theme, toggleTheme } = useThemePreference()
  const nextIsLight = theme === 'dark'
  return <Button variant="ghost" className={`theme-toggle ${className}`} onClick={toggleTheme} aria-label={nextIsLight ? 'Usar modo claro' : 'Usar modo oscuro'}>
    <Icon name={nextIsLight ? 'sun' : 'moon'} size={18} /><span>{compact ? (nextIsLight ? 'Modo claro' : 'Modo oscuro') : (nextIsLight ? 'Usar modo claro' : 'Usar modo oscuro')}</span>
  </Button>
}
