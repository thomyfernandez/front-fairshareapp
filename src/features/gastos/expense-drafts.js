import { readDraft } from '../../lib/draft-storage'

export function readExpenseDraft(userId, spaceId, kind) {
  const value = readDraft(userId, spaceId, kind)
  const validRow = row => row && typeof row.descripcion === 'string' && ['string', 'number'].includes(typeof row.monto) && typeof row.fecha === 'string' && Array.isArray(row.participantes)
  if (kind === 'individual') return validRow(value) ? value : null
  return Array.isArray(value?.gastos) && value.gastos.length <= 100 && (value.gastos.length > 0 || validRow(value.removed?.expense)) && value.gastos.every(validRow) ? value : null
}
