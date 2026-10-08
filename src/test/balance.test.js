import { describe, expect, it } from 'vitest'
import { debtRole, generalSummary, personalSummary, sortByRelevance } from '../features/balance/model'

const deudas = [
  { id: 1, deudorId: 2, acreedorId: 1, monto: 500 },
  { id: 2, deudorId: 1, acreedorId: 3, monto: 120 },
  { id: 3, deudorId: 3, acreedorId: 2, monto: 80 },
]

describe('balance financial meanings', () => {
  it('classifies the debt role of the current user', () => {
    expect(debtRole(deudas[0], 1)).toBe('acreedor')
    expect(debtRole(deudas[1], 1)).toBe('deudor')
    expect(debtRole(deudas[2], 1)).toBe('tercero')
  })

  it('separates what the user owes from what they are owed', () => {
    expect(personalSummary(deudas, 1)).toEqual({ payable: 120, receivable: 500, net: 380 })
    expect(personalSummary(deudas, 3)).toEqual({ payable: 80, receivable: 120, net: 40 })
  })

  it('summarizes the whole space regardless of who is involved', () => {
    expect(generalSummary(deudas)).toEqual({ count: 3, total: 700 })
    expect(generalSummary([])).toEqual({ count: 0, total: 0 })
  })

  it('brings the debts that involve the current user to the front, keeping the rest in place', () => {
    const ordered = sortByRelevance([deudas[2], deudas[0], deudas[1]], 1)
    expect(ordered.map(d => d.id)).toEqual([1, 2, 3])
  })
})
