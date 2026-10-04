import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button, Card, EmptyState, ErrorState, Field, Icon, InlineAlert, LoadingState, Modal, PageHeader, Submit } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { formData, money } from '../../lib/format'

// Existing create/join flows extracted for integrante 3. The shell only links here.
export default function SpacesPage() {
  const { spaces, spacesState, session, api, busy, error, run, invalidate } = useFeature(null)
  const [query, setQuery] = useSearchParams()
  const navigate = useNavigate()
  const mode = query.has('crear') ? 'create' : query.has('unirse') ? 'join' : null
  const create = async event => {
    event.preventDefault()
    const body = formData(event)
    body.presupuestoBase = Number(body.presupuestoBase)
    const result = await run(() => api('/api/v1/espacios', { method: 'POST', body }), 'Espacio creado. Ya sos su administrador.')
    if (result.ok) { invalidate(); navigate(`/espacios/${result.data.id}/resumen`) }
  }
  const join = async event => {
    event.preventDefault()
    const body = formData(event)
    const result = await run(() => api('/api/v1/espacios/unirse', { method: 'POST', body: { codigo: body.codigo.trim(), usuarioId: session.usuario.id } }), 'Ya sos parte del espacio.')
    if (result.ok) { invalidate(); navigate(`/espacios/${result.data.espacioId}/resumen`) }
  }
  return <div><PageHeader eyebrow="UN LUGAR PARA CADA GRUPO" title="Mis espacios" description="Organizá los gastos de tu hogar, un viaje o un proyecto." actions={<><Button variant="secondary" onClick={() => setQuery({ unirse: '1' })}>Unirme con código</Button><Button onClick={() => setQuery({ crear: '1' })}><Icon name="plus" size={18} />Crear espacio</Button></>} />
    {spacesState.loading ? <LoadingState /> : spacesState.error ? <ErrorState error={spacesState.error} onRetry={spacesState.reload} /> : !spaces.length ? <Card><EmptyState title="Tu próximo espacio empieza acá" description="Creá un espacio para tu grupo o unite con un código de invitación." action={<Button onClick={() => setQuery({ crear: '1' })}>Crear mi primer espacio</Button>} /></Card> : <div className="spaces-grid">{spaces.map(space => <Card key={space.id} className="space-card"><span className="space-card__icon"><Icon name="users" size={24} /></span><h2>{space.nombre}</h2><p>{space.descripcion || 'Un espacio para compartir con claridad.'}</p><dl><div><dt>Presupuesto disponible</dt><dd>{money(space.presupuestoBase)}</dd></div><div><dt>Reparto</dt><dd>{space.reglaReparto === 'PROPORCIONAL' ? 'Proporcional' : 'Equitativo'}</dd></div></dl><Link className="ui-link" to={`/espacios/${space.id}/resumen`}>Abrir espacio <Icon name="arrow" size={16} /></Link></Card>)}</div>}
    <Modal open={Boolean(mode)} title={mode === 'create' ? 'Crear un espacio' : 'Unirme a un espacio'} description={mode === 'create' ? 'Elegí cómo organizar los gastos de tu grupo.' : 'Pedile el código de invitación a un integrante del espacio.'} dismissible={!busy} onClose={() => setQuery({})}>
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}
      {mode === 'create' ? <form onSubmit={create}><Field label="Nombre" name="nombre" data-autofocus required minLength={2} maxLength={100} error={error?.fieldErrors?.nombre} /><Field label="Descripción" name="descripcion" maxLength={255} error={error?.fieldErrors?.descripcion} />
        <Field label="Tipo"><select name="tipo"><option value="HOGAR">Hogar</option><option value="VIAJE">Viaje</option><option value="PAREJA">Pareja</option><option value="TRABAJO">Trabajo</option><option value="OTRO">Otro</option></select></Field>
        <Field label="Reparto inicial" hint="El reparto proporcional considera los ingresos de cada participante."><select name="reglaReparto"><option value="CINCUENTA_CINCUENTA">Equitativo</option><option value="PROPORCIONAL">Proporcional</option></select></Field>
        <Field label="Presupuesto inicial (ARS)" name="presupuestoBase" type="number" min="0" step="0.01" defaultValue="0" required error={error?.fieldErrors?.presupuestoBase} hint="Es el presupuesto del espacio, no el saldo de una cuenta bancaria." /><Submit busy={busy}>Crear espacio</Submit>
      </form> : <form onSubmit={join}><Field label="Código de invitación" name="codigo" data-autofocus required error={error?.fieldErrors?.codigo} /><Submit busy={busy}>Unirme</Submit></form>}
    </Modal>
  </div>
}
