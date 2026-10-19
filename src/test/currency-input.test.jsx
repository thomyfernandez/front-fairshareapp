import { describe, expect, it } from 'vitest'
import { formatCurrencyInput, parseCurrencyInput } from '../lib/currency-input'

describe('localized currency inputs', () => {
  it('reads Argentine separators without losing cents or treating grouped thousands as decimals', () => {
    expect(parseCurrencyInput('2.000.000,50')).toBe(2000000.5)
    expect(parseCurrencyInput('2000000,5')).toBe(2000000.5)
    expect(parseCurrencyInput('1.000')).toBe(1000)
    expect(parseCurrencyInput('0')).toBe(0)
    expect(parseCurrencyInput('9.999.999.999,99')).toBe(9999999999.99)
    expect(formatCurrencyInput(2000000.5)).toBe('2.000.000,50')
  })
  it('rejects negative, empty, ambiguous, over-precision and out-of-contract amounts', () => {
    for (const input of ['', '-1', '0-1', '1e5', '20.50', '2,333', 'Infinity', '10.000.000.000', '1..000', '$ 100', '1,']) expect(parseCurrencyInput(input)).toBeNull()
    expect(formatCurrencyInput(null)).toBe('')
    expect(formatCurrencyInput(undefined)).toBe('')
  })
})
