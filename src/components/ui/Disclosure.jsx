// Delega el despliegue y la navegación con teclado al control nativo del navegador.
export function Disclosure({ title, children, className = '', ...props }) {
  return <details className={`ui-disclosure ${className}`} {...props}><summary>{title}</summary><div className="ui-disclosure__body">{children}</div></details>
}
