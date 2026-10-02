import { describe, expect, it } from 'vitest'
import {
  createBillPayment,
  createPromptPay,
  parsePromptPay,
  type PromptPayQr,
} from '../src/index.js'

function ok(text: string): PromptPayQr {
  const r = parsePromptPay(text)
  if (!r.ok) throw new Error(`${r.code}: ${r.message}`)
  return r.qr
}

describe('createPromptPay', () => {
  it('builds a static mobile QR', () => {
    expect(createPromptPay({ target: '0812223333' })).toBe(
      '00020101021129370016A0000006770101110113006681222333353037645802TH63041DCF',
    )
  })

  it('builds a dynamic QR with an amount', () => {
    expect(createPromptPay({ target: '081-222-3333', amount: 30 })).toBe(
      '00020101021229370016A0000006770101110113006681222333353037645802TH540530.0063043CAD',
    )
  })

  it('accepts +66 and 66 mobile formats', () => {
    const expected = createPromptPay({ target: '0812223333' })
    expect(createPromptPay({ target: '+66 81 222 3333' })).toBe(expected)
    expect(createPromptPay({ target: '66812223333' })).toBe(expected)
  })

  it('builds a TrueMoney e-wallet QR', () => {
    expect(createPromptPay({ target: '140000801111111' })).toBe(
      '00020101021129390016A000000677010111031514000080111111153037645802TH63047C0F',
    )
  })

  it('builds a national ID QR', () => {
    const qr = ok(createPromptPay({ target: '1-2345-67890-12-1', amount: 1250.5 }))
    expect(qr.recipient).toEqual({ type: 'national-id', value: '1234567890121' })
    expect(qr.amount).toBe(1250.5)
  })

  it('rejects bad input', () => {
    expect(() => createPromptPay({ target: 'abc' })).toThrow(TypeError)
    expect(() => createPromptPay({ target: '12345' })).toThrow(RangeError)
    expect(() => createPromptPay({ target: '0812223333', amount: 0 })).toThrow(RangeError)
    expect(() => createPromptPay({ target: '0812223333', amount: -5 })).toThrow(RangeError)
    expect(() => createPromptPay({ target: '0812223333', amount: 10.005 })).toThrow(/decimal/)
    expect(() => createPromptPay({ target: '0812223333', amount: Number.NaN })).toThrow(RangeError)
    expect(() => createPromptPay({ target: '081222333', type: 'mobile' })).toThrow(/mobile/)
  })

  it('handles amounts that are awkward in floating point', () => {
    expect(ok(createPromptPay({ target: '0812223333', amount: 0.1 + 0.2 })).amount).toBe(0.3)
    expect(createPromptPay({ target: '0812223333', amount: 19.99 })).toContain('540519.99')
  })
})

describe('createBillPayment', () => {
  it('builds a bill payment QR with ref3', () => {
    expect(
      createBillPayment({
        billerId: '0112233445566',
        ref1: 'CUSTOMER001',
        ref2: 'INV001',
        ref3: 'SCB',
      }),
    ).toBe(
      '00020101021130620016A000000677010112011301122334455660211CUSTOMER0010306INV00153037645802TH62070703SCB6304780E',
    )
  })

  it('round-trips through the parser', () => {
    const qr = ok(createBillPayment({ billerId: '010555012345601', ref1: 'ORDER42', amount: 99 }))
    expect(qr.kind).toBe('bill-payment')
    expect(qr.dynamic).toBe(true)
    expect(qr.biller).toEqual({
      billerId: '010555012345601',
      ref1: 'ORDER42',
      ref2: undefined,
      ref3: undefined,
      crossBorder: false,
    })
  })
})

describe('parsePromptPay', () => {
  it('reads mobile number and amount', () => {
    const qr = ok(
      '00020101021229370016A0000006770101110113006680111111153037645802TH540520.15630442BE',
    )
    expect(qr).toMatchObject({
      kind: 'promptpay',
      dynamic: true,
      recipient: { type: 'mobile', value: '0066801111111', mobile: '0801111111' },
      amount: 20.15,
      currency: '764',
      country: 'TH',
    })
  })

  it('recognises TrueMoney wallets and decodes the personal message', () => {
    const qr = ok(
      '00020101021229390016A000000677010111031514000080111111153037645802TH540510.05814800480065006C006C006F00200057006F0072006C006400216304F5A2',
    )
    expect(qr.recipient).toEqual({
      type: 'e-wallet',
      value: '140000801111111',
      wallet: 'truemoney',
      mobile: '0801111111',
    })
    expect(qr.amount).toBe(10.05)
    expect(qr.message).toBe('Hello World!')
  })

  it('flags a wrong CRC', () => {
    const r = parsePromptPay(
      '00020101021229370016A0000006770101110113006680111111153037645802TH540520.156304FFFF',
    )
    expect(r).toMatchObject({ ok: false, code: 'CRC_MISMATCH' })
    expect(!r.ok && r.qr?.amount).toBe(20.15)
  })

  it('rejects slips and junk', () => {
    expect(
      parsePromptPay('004000060000010103002021900021231231212000115102TH91049C30'),
    ).toMatchObject({
      ok: false,
      code: 'NOT_PROMPTPAY',
    })
    expect(parsePromptPay('not a qr')).toMatchObject({ ok: false, code: 'MALFORMED' })
    expect(parsePromptPay('')).toMatchObject({ ok: false, code: 'EMPTY' })
  })

  it('rejects a merchant template with a foreign AID', () => {
    const r = parsePromptPay('00020101021129200016A0000000041010105802TH6304ABCD')
    expect(r.ok).toBe(false)
  })
})
