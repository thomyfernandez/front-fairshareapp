import { useState } from 'react'
import { useNavigate } from 'react-router'
import { readDraft, removeDraft, saveDraft } from '../../lib/draft-storage'
import { readExpenseDraft } from '../gastos/expense-drafts'
import { templateExpense, templateUnavailable } from './recurring-batch'

export function useRecurringBatch({ userId, spaceId, members }) {
  const [draft, setDraft] = useState(() => readExpenseDraft(userId, spaceId, 'lote'))
  const [error, setError] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const [location, setLocation] = useState('tab')
  const navigate = useNavigate()
  const readCurrent = () => readExpenseDraft(userId, spaceId, 'lote')
  function persist(value) {
    if (value.gastos.length || value.removed) setLocation(saveDraft(userId, spaceId, 'lote', value))
    else removeDraft(userId, spaceId, 'lote')
    setDraft(value.gastos.length || value.removed ? value : null)
    setError(null)
  }
  function add(template) {
    const unavailable = templateUnavailable(template, members)
    if (unavailable) { setError(unavailable); return }
    const current = readCurrent()
    if (!current && readDraft(userId, spaceId, 'lote')) { setError('No pudimos leer el borrador de gastos. Revisalo desde Gastos antes de agregar más.'); return }
    const rows = current?.gastos || []
    if (rows.some(row => String(row.sourceTemplateId) === String(template.id))) return
    if (rows.length + (current?.removed ? 1 : 0) >= 100) { setError('Podés agregar hasta 100 gastos juntos. Revisá la selección antes de agregar más.'); return }
    const tempId = Math.max(0, ...rows.map(row => Number(row.tempId) || 0), Number(current?.removed?.expense?.tempId) || 0) + 1
    persist({ ...current, gastos: [...rows, templateExpense(template, members, tempId)] })
    setAnnouncement(`${template.nombre} agregado para registrar. Todavía no se registró.`)
  }
  function remove(tempId) {
    const current = readCurrent()
    if (!current) return
    const removed = current.gastos.find(row => row.tempId === tempId)
    persist({ ...current, gastos: current.gastos.filter(row => row.tempId !== tempId) })
    setAnnouncement(`${removed?.descripcion || 'Gasto'} quitado de la selección.`)
  }
  return {
    draft, add, remove, error, announcement, location,
    selected: id => draft?.gastos.some(row => String(row.sourceTemplateId) === String(id)),
    removeTemplate: id => { const row = readCurrent()?.gastos.find(item => String(item.sourceTemplateId) === String(id)); if (row) remove(row.tempId) },
    review: () => { navigate(`/espacios/${spaceId}/gastos?nuevo=1&modo=lote`); window.scrollTo({ top: 0, behavior: 'instant' }) },
  }
}
