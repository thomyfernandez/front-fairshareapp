import { useState } from 'react'
import { Badge, Button, Card, Checkbox, EmptyState, Field, InlineAlert, LoadingState, Modal, PageHeader, PasswordField, useUI } from '../../components/ui'
import { SummaryPreview } from './SummaryPreview'
import { Foundations } from './Foundations'

export default function ComponentGallery() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const { notify, confirm } = useUI()
  return <div className="ds-gallery"><PageHeader eyebrow="FAIRSHARE · CERCANA" title="Sistema de diseño" description="Primera etapa: fundamentos y componentes para un resumen más claro. Ejemplos de demostración, sin cambios sobre tus datos." />
    <nav className="ds-section-nav" aria-label="Secciones del sistema de diseño"><a href="#resumen">Resumen de referencia</a><a href="#fundamentos">Fundamentos</a><a href="#componentes">Componentes base</a></nav>
    <SummaryPreview />
    <Foundations />
    <section className="ds-section" id="componentes" aria-label="Componentes base"><div className="gallery-grid"><Card><h2>Acciones</h2><p>Un botón principal por flujo. Usá texto que describa la acción.</p><div className="gallery-actions"><Button onClick={() => notify('Ejemplo de acción completada.')}>Principal</Button><Button variant="secondary" onClick={() => setOpen(true)}>Abrir modal</Button><Button variant="ghost" onClick={() => notify('Ejemplo de mensaje informativo.', 'info')}>Informativo</Button><Button variant="danger" onClick={async () => { const accepted = await confirm({ title: 'Ejemplo de confirmación', description: 'Esta demostración no elimina información.', danger: true, confirmLabel: 'Confirmar ejemplo' }); if (accepted) notify('Confirmación aceptada. No se modificaron datos.') }}>Confirmar acción</Button><Button disabled>Deshabilitado</Button><Button loading>Procesando…</Button></div></Card>
      <Card><h2>Formularios</h2><form onSubmit={event => { event.preventDefault(); notify('Formulario de ejemplo validado.') }}><Field label="Email" type="email" value={email} onChange={event => setEmail(event.target.value)} hint="El texto de ayuda acompaña al campo." required /><PasswordField label="Contraseña de ejemplo" autoComplete="off" /><Field label="Campo con error" defaultValue="Ejemplo" error="Revisá este dato antes de continuar." /><Field label="Modalidad"><select><option>Equitativa</option><option>Proporcional</option></select></Field><Checkbox label="Opción de ejemplo" /><Button type="submit">Validar ejemplo</Button></form></Card>
      <Card><h2>Estados y mensajes</h2><div className="gallery-actions"><Badge>Neutral</Badge><Badge tone="brand">Activo</Badge><Badge tone="success">Completado</Badge><Badge tone="warning">Requiere revisión</Badge><Badge tone="error">Error</Badge></div><InlineAlert>Mostrá mensajes breves y orientados a la próxima acción.</InlineAlert><InlineAlert tone="warning">Las advertencias explican la consecuencia antes de confirmar.</InlineAlert><InlineAlert tone="error">Los errores incluyen texto, además de color.</InlineAlert><LoadingState rows={2} /></Card>
      <Card><h2>Contenido vacío</h2><EmptyState title="Todavía no hay movimientos" description="Explicá por qué está vacío y ofrecé una acción útil." action={<Button variant="secondary" onClick={() => notify('Esta acción es una demostración.', 'info')}>Acción de ejemplo</Button>} /></Card>
    </div></section><Modal open={open} onClose={() => setOpen(false)} title="Un modal accesible" description="El foco queda dentro del diálogo. Escape permite cerrarlo." footer={<Button variant="secondary" data-autofocus onClick={() => setOpen(false)}>Cerrar ejemplo</Button>}><p>Usá los componentes de <code>src/components/ui</code> y las variables generadas desde <code>tokens.json</code>.</p></Modal>
  </div>
}
