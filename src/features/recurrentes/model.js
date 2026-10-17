export const REGLAS_DIVISION = {
    EQUITATIVA: 'Equitativo',
    PROPORCIONAL_INGRESOS: 'Proporcional a ingresos'
}

export function requiereEjecucionManual(template) {
    return template.vencido || false;
}