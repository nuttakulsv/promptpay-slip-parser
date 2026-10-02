import { describe, expect, it } from 'vitest'
import { banks, getBank } from '../src/index.js'

describe('banks', () => {
  it('uses 3-digit codes and unique abbreviations', () => {
    const abbrs = new Set<string>()
    for (const [code, bank] of banks) {
      expect(code).toMatch(/^\d{3}$/)
      expect(bank.code).toBe(code)
      expect(bank.nameTh).toMatch(/^ธนาคาร/)
      expect(abbrs.has(bank.abbr)).toBe(false)
      abbrs.add(bank.abbr)
    }
  })

  it('covers the banks that issue most slips', () => {
    for (const code of ['002', '004', '006', '011', '014', '025', '030', '034']) {
      expect(getBank(code), code).toBeDefined()
    }
  })

  it('accepts unpadded codes', () => {
    expect(getBank(14)?.abbr).toBe('SCB')
    expect(getBank('4')?.abbr).toBe('KBANK')
    expect(getBank('123')).toBeUndefined()
  })
})
