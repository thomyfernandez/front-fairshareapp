import { today } from '../../lib/format'

export const REGLAS_DIVISION = {
  EQUITATIVA: 'Equitativo',
  PROPORCIONAL_INGRESOS: 'Según los ingresos',
}

export function requiresReview(template) {
  return Boolean(template.vencido || (template.fechaProximaRevision && template.fechaProximaRevision <= today()))
}
