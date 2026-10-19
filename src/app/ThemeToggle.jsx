import { Button, Icon } from '../components/ui'
import { useThemePreference } from './useAppTheme'

// El texto nombra la acción disponible, no el estado: así no depende del ícono para entenderse.
export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useThemePreference()
  const nextIsLight = theme === 'dark'
  return <Button variant="ghost" className={`theme-toggle ${className}`} onClick={toggleTheme}>
    <Icon name={nextIsLight ? 'sun' : 'moon'} size={17} />{nextIsLight ? 'Usar modo claro' : 'Usar modo oscuro'}
  </Button>
}
