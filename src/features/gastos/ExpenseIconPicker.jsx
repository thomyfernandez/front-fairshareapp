import { useState } from 'react'
import { Button, Icon, Modal } from '../../components/ui'
import { expenseIcon, expenseIconChoices } from '../../components/ui/expense-icons'

export function ExpenseIconPicker({ value, onChange, description, category, disabled = false, compact = false, label = 'Ícono del gasto' }) {
  const [open, setOpen] = useState(false)
  const selected = expenseIconChoices.find(choice => choice.value === value)
  const selectedLabel = selected?.label || 'Automático'
  function choose(next) { onChange(next); setOpen(false) }
  return <div className={`expense-icon-picker${compact ? ' expense-icon-picker--compact' : ''}`}>
    {!compact && <span className="expense-icon-picker__label">{label}</span>}
    <Button variant="secondary" disabled={disabled} className="expense-icon-picker__trigger" onClick={() => setOpen(true)} aria-label={`Cambiar ${label.toLocaleLowerCase('es-AR')}: ${selectedLabel}`} aria-haspopup="dialog" title={`${label}: ${selectedLabel}`}>
      <Icon name={expenseIcon(category, description, value)} size={20} />{!compact && <span>{selectedLabel}</span>}<Icon name="chevron" size={14} className="expense-icon-picker__chevron" />
    </Button>
    <Modal open={open} onClose={() => setOpen(false)} title="Elegí un ícono" description="Se mostrará junto a este gasto. Podés elegirlo sin cambiar su categoría." className="expense-icon-picker__modal" footer={<Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>}>
      <div className="expense-icon-picker__options" role="group" aria-label="Íconos disponibles">
        {[{ value: null, label: 'Automático', icon: expenseIcon(category, description) }, ...expenseIconChoices].map(choice => {
          const active = choice.value === (selected?.value || null)
          return <Button key={choice.value || 'auto'} variant="secondary" className="expense-icon-picker__option" aria-label={`Usar ícono: ${choice.label}`} aria-pressed={active} data-autofocus={active || undefined} onClick={() => choose(choice.value)}>
            <Icon name={choice.icon} size={24} /><span>{choice.label}</span>{active && <Icon name="check" size={14} className="expense-icon-picker__check" />}
          </Button>
        })}
      </div>
    </Modal>
  </div>
}
