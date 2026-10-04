import { describe, expect, it } from 'vitest'
import { expenseSummary, monthOptions, personalBalance } from '../features/dashboard/model'

describe('dashboard financial meanings', () => {
  it('uses only the selected month and sums in cents', () => {
    const summary = expenseSummary([
      { id: 1, fecha: '2026-10-01', monto: .1, estado: 'PENDIENTE' },
      { id: 2, fecha: '2026-10-02', monto: .2, estado: 'LIQUIDADO' },
      { id: 3, fecha: '2026-09-30', monto: 100, estado: 'PENDIENTE' },
    ], '2026-10')
    expect(summary).toMatchObject({ total: .3, count: 2, pending: .1 })
    expect(summary.recent.map(item => item.id)).toEqual([2, 1])
  })
  it('keeps payable and receivable separate and excludes paid debts', () => {
    expect(personalBalance([
      { deudorId: 1, acreedorId: 2, monto: 50, estado: 'PENDIENTE' },
      { deudorId: 2, acreedorId: 1, monto: 80, estado: 'PARCIAL' },
      { deudorId: 1, acreedorId: 2, monto: 100, estado: 'SALDADA' },
      { deudorId: 3, acreedorId: 2, monto: 200, estado: 'PENDIENTE' },
    ], 1)).toEqual({ payable: 50, receivable: 80 })
  })
  it('offers twelve real calendar months across a year boundary', () => {
    const options = monthOptions(new Date(2026, 0, 31))
    expect(options).toHaveLength(12)
    expect(options[0].value).toBe('2026-01')
    expect(options[1].value).toBe('2025-12')
  })
})
