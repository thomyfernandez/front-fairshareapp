import { describe, expect, it } from 'vitest'
import { balanceCounterpart, budgetProjection, expenseSummary, monthOptions, payerDisplayName, personalBalance } from '../features/dashboard/model'

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


describe('dashboard actionable financial context', () => {
  it('uses pending expenses only against the available balance, without double counting closed expenses', () => {
    const summary = expenseSummary([
      { id: 1, fecha: '2026-10-01', monto: 200, estado: 'PENDIENTE' },
      { id: 2, fecha: '2026-10-02', monto: 300, estado: 'LIQUIDADO' },
    ], '2026-10')
    expect(summary.total).toBe(500)
    expect(budgetProjection(1000, summary.pending)).toEqual({ remaining: 800, percent: 20, progress: 20, exceeded: false })
  })
  it('handles missing, zero and exceeded budgets without Infinity or negative progress', () => {
    expect(budgetProjection(null, 10)).toBeNull()
    expect(budgetProjection(0, 10)).toEqual({ remaining: -10, percent: null, progress: 100, exceeded: true })
    expect(budgetProjection(100, 150)).toEqual({ remaining: -50, percent: 150, progress: 100, exceeded: true })
    expect(budgetProjection(100, 0).progress).toBe(0)
  })
  it('identifies one counterpart and deduplicates their debts', () => {
    expect(balanceCounterpart([
      { deudorId: 1, acreedorId: 2, acreedorNombre: 'Thomas', monto: 30 },
      { deudorId: '1', acreedorId: '2', acreedorNombre: 'Thomas', monto: 45 },
      { deudorId: 1, acreedorId: 3, acreedorNombre: 'María', monto: 20, estado: 'SALDADA' },
    ], 1)).toBe('A Thomas')
  })
  it('counts people rather than debts and explains incoming payments', () => {
    expect(balanceCounterpart([
      { deudorId: 1, acreedorId: 2, monto: 30 },
      { deudorId: 1, acreedorId: 3, monto: 45 },
    ], 1)).toBe('A 2 integrantes')
    expect(balanceCounterpart([{ deudorId: 2, deudorNombre: 'Thomas', acreedorId: 1, monto: 30 }], 1)).toBe('De Thomas')
  })
  it('does not conflate opposite directions or invent unknown people', () => {
    expect(balanceCounterpart([
      { deudorId: 1, acreedorId: 2, monto: 30 },
      { deudorId: 2, acreedorId: 1, monto: 30 },
    ], 1)).toBeNull()
    expect(balanceCounterpart([], 1)).toBeNull()
    expect(balanceCounterpart([{ deudorId: 1, monto: 30 }], 1)).toBeNull()
  })
  it('formats period labels consistently without capitalizing a connector', () => {
    expect(monthOptions(new Date(2026, 9, 1))[0].label).toBe('Octubre 2026')
  })
})


it('acorta nombres únicos y conserva apellidos cuando el nombre coincide', () => {
  expect(payerDisplayName('Thomas Fernandez', [{ nombreUsuario: 'Thomas Fernandez' }, { nombreUsuario: 'Ana Ruiz' }])).toBe('Thomas')
  expect(payerDisplayName('Thomas Fernandez', [{ nombreUsuario: 'Thomas Fernandez' }, { nombreUsuario: 'Thomas López' }])).toBe('Thomas Fernandez')
  expect(payerDisplayName('María Fernández', [])).toBe('María Fernández')
})
