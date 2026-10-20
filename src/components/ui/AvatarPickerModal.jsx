import { useState } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'
import { Modal } from './Modal'
import { getUserAvatar, userAvatarChoices } from './user-avatars'
import { readAvatar, saveAvatar } from '../../lib/avatar-storage'

export function AvatarPickerModal({ open, onClose, userId, userName = 'Tu perfil' }) {
  const [selected, setSelected] = useState(() => (userId ? readAvatar(userId) : null))

  const selectedChoice = getUserAvatar(selected)
  const initials = userName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('es-AR') || '?'

  const handleSave = () => {
    if (userId) {
      saveAvatar(userId, selected)
    }
    onClose()
  }

  const allChoices = [
    { id: null, label: 'Iniciales', path: null, description: `Tus iniciales (${initials})` },
    ...userAvatarChoices,
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Elegí tu avatar"
      description="Personalizá tu imagen de perfil visible en el menú, balances y miembros."
      className="avatar-picker-modal"
      footer={
        <div className="avatar-picker-modal__footer">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>Guardar avatar</Button>
        </div>
      }
    >
      <div className="avatar-picker-content">
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
