import { useNavigate, useSearchParams } from 'react-router'
import { Button, Card, EmptyState, ErrorState, Icon, LoadingState, Modal, PageHeader } from '../../components/ui'
import { useFeature } from '../../hooks/useFeature'
import { SpaceCard } from './SpaceCard'
import { CreateSpaceForm } from './CreateSpaceForm'
import { JoinSpaceForm } from './JoinSpaceForm'

export default function SpacesPage() {
  const { spaces, spacesState, session, api, busy, error, run, invalidate } = useFeature(null)
  const [query, setQuery] = useSearchParams()
  const navigate = useNavigate()

  const mode = query.has('crear') ? 'create' : query.has('unirse') ? 'join' : null
  const initialCode = query.get('codigo') || ''

  const handleCreate = async (body) => {
    const result = await run(
      () => api('/api/v1/espacios', { method: 'POST', body }),
      'Espacio creado. Ya sos su administrador.'
    )
    if (result.ok) {
      invalidate()
      navigate(`/espacios/${result.data.id}/resumen`)
    }
  }

  const handleJoin = async ({ codigo }) => {
    const result = await run(
      () => api('/api/v1/espacios/unirse', {
        method: 'POST',
        body: { codigo: codigo.trim(), usuarioId: session.usuario.id },
      }),
      'Ya sos parte del espacio.'
    )
    if (result.ok) {
      invalidate()
      navigate(`/espacios/${result.data.espacioId}/resumen`)
    }
  }

  const handleCloseModal = () => {
    setQuery({})
  }

  return (
    <div className="spaces-page">
      <PageHeader
        eyebrow="UN LUGAR PARA CADA GRUPO"
        title="Mis espacios"
        description="Organizá los gastos de tu hogar, un viaje o un proyecto con reglas transparentes."
        actions={
          <>
            <Button variant="secondary" onClick={() => setQuery({ unirse: '1' })}>
              Unirme con código
            </Button>
            <Button onClick={() => setQuery({ crear: '1' })}>
              <Icon name="plus" size={18} />
              Crear espacio
            </Button>
          </>
        }
      />

      {spacesState.loading ? (
        <LoadingState label="Cargando tus espacios…" />
      ) : spacesState.error ? (
        <ErrorState error={spacesState.error} onRetry={spacesState.reload} />
      ) : !spaces.length ? (
        <Card>
          <EmptyState
            icon="users"
            title="Tu próximo espacio empieza acá"
            description="Creá un espacio para tu grupo o unite con un código de invitación para empezar a compartir gastos."
            action={
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button onClick={() => setQuery({ crear: '1' })}>
                  <Icon name="plus" size={18} />
                  Crear mi primer espacio
                </Button>
                <Button variant="secondary" onClick={() => setQuery({ unirse: '1' })}>
                  Unirme con código
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="spaces-grid">
          {spaces.map((space) => (
            <SpaceCard key={space.id} space={space} />
          ))}
        </div>
      )}

      <Modal
        open={Boolean(mode)}
        title={mode === 'create' ? 'Crear un nuevo espacio' : 'Unirme a un espacio'}
        description={
          mode === 'create'
            ? 'Definí el nombre, la regla para repartir los gastos y el presupuesto inicial.'
            : 'Ingresá el código de invitación que te compartió un integrante.'
        }
        dismissible={!busy}
        onClose={handleCloseModal}
      >
        {mode === 'create' ? (
          <CreateSpaceForm
            onSubmit={handleCreate}
            busy={busy}
            error={error}
            onCancel={handleCloseModal}
          />
        ) : (
          <JoinSpaceForm
            onSubmit={handleJoin}
            busy={busy}
            error={error}
            initialCode={initialCode}
            onCancel={handleCloseModal}
          />
        )}
      </Modal>
    </div>
  )
}
