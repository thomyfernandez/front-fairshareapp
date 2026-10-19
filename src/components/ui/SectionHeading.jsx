// Agrupa el título y la acción de una sección sin agregar otra tarjeta.
export function SectionHeading({ title, description, action, id }) {
  return <div className="ui-section-heading"><div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div>{action && <div className="ui-section-heading__action">{action}</div>}</div>
}
