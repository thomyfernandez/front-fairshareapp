import { useState } from 'react'
import { Button, Icon, InlineAlert, Modal } from '../../components/ui'
import { expenseIcon } from '../../components/ui/expense-icons'

export function ExpenseCategoryPicker({ value, onChange, description, category, categories, disabled = false, compact = false, label = 'Categoría' }) {
  const [open, setOpen] = useState(false)
  const selected = categories.data.find(item => Number(item.id) === Number(value))
  const selectedLabel = selected?.nombre || category || 'Sin categoría'
  function choose(next) { onChange(next); setOpen(false) }
  return <div className={`expense-icon-picker${compact ? ' expense-icon-picker--compact' : ''}`}>
    {!compact && <span className="expense-icon-picker__label">{label}</span>}
    <Button variant="secondary" disabled={disabled} className="expense-icon-picker__trigger" onClick={() => setOpen(true)} aria-label={`Cambiar ${label.toLocaleLowerCase('es-AR')}: ${selectedLabel}`} aria-haspopup="dialog" title={`${label}: ${selectedLabel}`}>
      <Icon name={expenseIcon(selectedLabel === 'Sin categoría' ? null : selectedLabel, description)} size={20} />{!compact && <span>{selectedLabel}</span>}<Icon name="chevron" size={14} className="expense-icon-picker__chevron" />
    </Button>
    <Modal open={open} onClose={() => setOpen(false)} title="Elegí una categoría" description="Clasificá el gasto. El ícono se asigna automáticamente según la categoría." className="expense-icon-picker__modal" footer={<Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>}>
      {categories.loading ? <p role="status">Cargando categorías…</p> : categories.error ? <InlineAlert tone="error">No pudimos cargar las categorías. <Button variant="secondary" onClick={categories.reload}>Reintentar</Button></InlineAlert> : <>
        {!categories.data.length && <p>No hay categorías disponibles.</p>}
        <div className="expense-icon-picker__options" role="group" aria-label="Categorías disponibles">
          {[{ id: null, nombre: 'Sin categoría' }, ...categories.data].map(choice => {
            const active = choice.id === null ? value == null : Number(choice.id) === Number(value)
            return <Button key={choice.id ?? 'none'} variant="secondary" className="expense-icon-picker__option" aria-label={`Usar categoría: ${choice.nombre}`} aria-pressed={active} data-autofocus={active || undefined} onClick={() => choose(choice)}>
              <Icon name={choice.id == null ? 'receipt' : expenseIcon(choice.nombre)} size={24} /><span>{choice.nombre}</span>{active && <Icon name="check" size={14} className="expense-icon-picker__check" />}
            </Button>
          })}
        </div>
      </>}
    </Modal>
  </div>
}
