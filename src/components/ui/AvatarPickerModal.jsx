import { useRef, useState } from 'react'
import { Button } from './Button'
import { InlineAlert } from './States'
import { Icon } from './Icon'
import { Modal } from './Modal'
import { getUserAvatar, isUserAvatar, userAvatarChoices } from './user-avatars'

export function AvatarPickerModal(props) {
  return props.open ? <AvatarPickerSession key={props.userId} {...props} /> : null
}

function AvatarPickerSession({ onClose, value = null, onSave, userName = 'Tu perfil' }) {
  const [selected, setSelected] = useState(isUserAvatar(value) ? value : null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const pending = useRef(false)

  const selectedChoice = getUserAvatar(selected)
  const initials = userName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('es-AR') || '?'

  const handleSave = async () => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError(null)
    try {
      await onSave(selected)
      onClose()
    } catch (failure) {
      setError(failure.message || 'No pudimos guardar el avatar. Intentá nuevamente.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  const allChoices = [
    { id: null, label: 'Iniciales', path: null, description: `Tus iniciales (${initials})` },
    ...userAvatarChoices,
  ]

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!busy}
      title="Elegí tu avatar"
      description="Tu avatar se guarda en tu cuenta y se muestra a los integrantes de tus espacios."
      className="avatar-picker-modal"
      footer={
        <div className="avatar-picker-modal__footer">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} loading={busy} disabled={!onSave}>Guardar avatar</Button>
        </div>
      }
    >
      <div className="avatar-picker-content">
        {error && <InlineAlert tone="error">{error}</InlineAlert>}
        <div className="avatar-picker-preview" aria-live="polite">
          <div className="avatar-picker-preview__image">
            {selectedChoice ? (
              <img src={selectedChoice.path} alt="" width="64" height="64" />
            ) : (
              <span className="avatar-picker-preview__initials">{initials}</span>
            )}
          </div>
          <div className="avatar-picker-preview__info">
            <strong>{selectedChoice ? selectedChoice.label : 'Iniciales clásicas'}</strong>
            <span>{selectedChoice ? selectedChoice.description : 'Muestra tus iniciales con el color del tema'}</span>
          </div>
        </div>

        <div className="avatar-picker-grid" role="group" aria-label="Catálogo de avatares">
          {allChoices.map(choice => {
            const isSelected = selected === choice.id
            return (
              <button
                key={choice.id || 'initials'}
                type="button"
                disabled={busy}
                className={`avatar-picker-option ${isSelected ? 'avatar-picker-option--selected' : ''}`}
                aria-pressed={isSelected}
                aria-label={`Seleccionar avatar: ${choice.label}`}
                onClick={() => setSelected(choice.id)}
              >
                <div className="avatar-picker-option__thumb">
                  {choice.path ? (
                    <img src={choice.path} alt="" width="44" height="44" />
                  ) : (
                    <span className="avatar-picker-option__initials">{initials}</span>
                  )}
                </div>
                <span className="avatar-picker-option__name">{choice.label}</span>
                {isSelected && (
                  <span className="avatar-picker-option__check" aria-hidden="true">
                    <Icon name="check" size={12} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
