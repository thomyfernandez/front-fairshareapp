import { useState } from 'react'
import { Button, Card, Icon, useUI } from '../../components/ui'

export function InviteCard({ space }) {
  const { notify } = useUI()
  const [copiedType, setCopiedType] = useState(null)

  if (!space?.codigo) return null

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/espacios?unirse=1&codigo=${encodeURIComponent(space.codigo)}`
    : ''

  const copyToClipboard = async (text, type, message) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedType(type)
      notify(message)
      setTimeout(() => setCopiedType(current => (current === type ? null : current)), 2500)
    } catch {
      notify('No se pudo copiar al portapapeles', 'error')
    }
  }

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Sumate a ${space.nombre} en FairShare`,
          text: `Sumate al espacio ${space.nombre} en FairShare con el código de invitación: ${space.codigo}`,
          url: inviteUrl,
        })
      } catch (err) {
        if (err?.name !== 'AbortError') {
          copyToClipboard(inviteUrl, 'link', 'Enlace de invitación copiado.')
        }
      }
    } else {
      copyToClipboard(inviteUrl, 'link', 'Enlace de invitación copiado.')
    }
  }

  return (
    <Card className="invite-card">
      <div className="card-heading">
        <div>
          <h2>Invitar al espacio</h2>
          <p>Compartí el código o enlace directo para sumar a otros integrantes.</p>
        </div>
        <span className="invite-badge" aria-hidden="true">
          <Icon name="users" size={20} />
        </span>
      </div>

      <div className="invite-card__body">
        <div className="invite-code-box">
          <span className="invite-code-box__label">CÓDIGO DE INVITACIÓN</span>
          <strong className="invite-code-box__code" data-testid="invite-code">{space.codigo}</strong>
        </div>

        <div className="invite-card__actions">
          <Button
            variant={copiedType === 'code' ? 'secondary' : 'primary'}
            onClick={() => copyToClipboard(space.codigo, 'code', 'Código de invitación copiado.')}
            aria-label="Copiar código de invitación"
          >
            <Icon name={copiedType === 'code' ? 'check' : 'copy'} size={17} />
            {copiedType === 'code' ? '¡Código copiado!' : 'Copiar código'}
          </Button>

          <Button
            variant="secondary"
            onClick={() => copyToClipboard(inviteUrl, 'link', 'Enlace de invitación copiado.')}
            aria-label="Copiar enlace de invitación"
          >
            <Icon name={copiedType === 'link' ? 'check' : 'link'} size={17} />
            {copiedType === 'link' ? '¡Enlace copiado!' : 'Copiar enlace'}
          </Button>

          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <Button
              variant="secondary"
              onClick={handleShare}
              aria-label="Compartir espacio"
            >
              <Icon name="share" size={17} />
              Compartir
            </Button>
          )}
        </div>
      </div>
      <p className="invite-card__hint">
        Los nuevos integrantes pueden ingresar desde <strong>Mis espacios &gt; Unirme con código</strong> o abrir directamente el enlace compartido.
      </p>
    </Card>
  )
}
