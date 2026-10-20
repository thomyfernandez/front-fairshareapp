import { useState } from 'react'
import { Button, Disclosure, Icon, useUI } from '../../components/ui'

export function InvitationCode({ code, spaceName = 'el espacio', className = '', compact = false }) {
  const { notify } = useUI()
  const [copiedType, setCopiedType] = useState(null)

  if (!code) return null

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/espacios?unirse=1&codigo=${encodeURIComponent(code)}`
    : ''

  const copyToClipboard = async (text, type, message) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'absolute'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        const copied = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (!copied) throw new Error('No se pudo copiar')
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
          title: `Sumate a ${spaceName} en FairShare`,
          text: `Sumate al espacio ${spaceName} en FairShare con el código de invitación: ${code}`,
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

  if (compact) return <div className={`settings-invitation ${className}`}>
    <div className="settings-invitation__main"><div className="invite-code-box"><span className="invite-code-box__label">Código del espacio</span><strong className="invite-code-box__code" data-testid="invite-code">{code}</strong></div>
      <Button variant="secondary" onClick={() => copyToClipboard(inviteUrl, 'link', 'Invitación copiada.')}><Icon name={copiedType === 'link' ? 'check' : 'copy'} size={16} />{copiedType === 'link' ? 'Invitación copiada' : 'Copiar invitación'}</Button>
    </div>
    <Disclosure title="Otras formas de invitar" className="settings-invitation__alternatives"><div>
      <Button variant="ghost" onClick={() => copyToClipboard(code, 'code', 'Código de invitación copiado.')}><Icon name={copiedType === 'code' ? 'check' : 'copy'} size={16} />{copiedType === 'code' ? 'Código copiado' : 'Copiar solo el código'}</Button>
      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && <Button variant="ghost" onClick={handleShare}><Icon name="share" size={16} />Compartir invitación</Button>}
    </div></Disclosure>
  </div>

  return (
    <div className={`invite-card__body ${className}`}>
      <div className="invite-code-box">
        <span className="invite-code-box__label">CÓDIGO DE INVITACIÓN</span>
        <strong className="invite-code-box__code" data-testid="invite-code">{code}</strong>
      </div>

      <div className="invite-card__actions">
        <Button
          variant={copiedType === 'code' ? 'secondary' : 'primary'}
          onClick={() => copyToClipboard(code, 'code', 'Código de invitación copiado.')}
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
  )
}
