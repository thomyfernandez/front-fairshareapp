import { Disclosure } from './Disclosure'
import { Icon } from './Icon'

// Detalles secundarios dentro de una superficie, con el mismo control nativo de Disclosure.
export function PanelDisclosure({ title, icon = 'info', children, className = '', ...props }) {
  return <Disclosure className={`ui-panel-disclosure ${className}`} title={<><Icon name={icon} /><span>{title}</span><Icon name="chevron" className="ui-panel-disclosure__chevron" /></>} {...props}>{children}</Disclosure>
}
