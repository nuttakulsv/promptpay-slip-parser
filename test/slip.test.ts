import { describe, expect, it } from 'vitest'
import { parseSlip, slipKey, type BankSlip, type TrueMoneySlip } from '../src/index.js'
import { encodeTlv, withCrc } from '../src/tlv.js'
import {
  bankSlipPayload,
  shortCrcPayload,
  tamper,
  trueMoneySlipPayload,
} from './helpers/payloads.js'

function okBank(text: string): BankSlip {
  const r = parseSlip(text)
  if (!r.ok) throw new Error(`${r.code}: ${r.message}`)
  if (r.slip.kind !== 'bank') throw new Error('expected a bank slip')
  return r.slip
}

describe('parseSlip: bank mini-QR', () => {
  it('parses a Bangkok Bank slip', () => {
    const slip = okBank('004000060000010103002021900021231231212000115102TH91049C30')
    expect(slip).toMatchObject({
      kind: 'bank',
      sendingBank: '002',
      transRef: '0002123123121200011',
      country: 'TH',
      crc: { expected: '9C30', actual: '9C30', valid: true },
      warnings: [],
    })
    expect(slip.bank?.abbr).toBe('BBL')
    expect(slip.bank?.nameTh).toBe('ธนาคารกรุงเทพ')
  })

  it('parses an SCB slip', () => {
    const slip = okBank('004100060000010103014022000111222233344ABCD125102TH910417DF')
    expect(slip.sendingBank).toBe('014')
    expect(slip.transRef).toBe('00111222233344ABCD12')
    expect(slip.bank?.nameEn).toBe('Siam Commercial Bank')
  })

  it('trims whitespace and newlines from scanners', () => {
    expect(okBank('  004100060000010103014022000111222233344ABCD125102TH910417DF\n').transRef).toBe(
      '00111222233344ABCD12',
    )
  })

  it('accepts a lowercase CRC', () => {
    expect(okBank('004100060000010103014022000111222233344ABCD125102TH910417df').crc.valid).toBe(
      true,
    )
  })

  it('pads a CRC that lost its leading zeros', () => {
    const { payload, transRef } = shortCrcPayload()
    const slip = okBank(payload)
    expect(slip.transRef).toBe(transRef)
    expect(slip.crc.actual).toHaveLength(4)
    expect(slip.warnings[0]).toMatch(/padded/)
  })

  it('rejects an edited transRef with CRC_MISMATCH but still shows what was read', () => {
    const original = bankSlipPayload('004', '016010174014BTF07795')
    const r = parseSlip(tamper(original, '016010174014BTF07795', '016010174014BTF07796'))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('CRC_MISMATCH')
    expect(r.slip?.kind === 'bank' && r.slip.transRef).toBe('016010174014BTF07796')
    expect(r.slip?.crc.valid).toBe(false)
  })

  it('warns on an unknown bank code', () => {
    const slip = okBank(bankSlipPayload('999', 'ABC123'))
    expect(slip.bank).toBeUndefined()
    expect(slip.warnings).toContain('Unknown bank code "999"')
  })

  it('warns when the country tag is missing', () => {
    const root = encodeTlv([
      { id: '00', value: '000001' },
      { id: '01', value: '006' },
      { id: '02', value: 'KTB0001' },
    ])
    const slip = okBank(withCrc(encodeTlv([{ id: '00', value: root }]), '91'))
    expect(slip.country).toBeUndefined()
    expect(slip.warnings[0]).toMatch(/country/)
  })
})

describe('parseSlip: TrueMoney', () => {
  it('parses a TrueMoney slip with lowercase CRC', () => {
    const payload = trueMoneySlipPayload('P2P', '50001234567890', '02102026')
    expect(payload.slice(-4)).toMatch(/^[0-9a-f]{4}$/)
    const r = parseSlip(payload)
    expect(r.ok).toBe(true)
    const slip = r.ok ? (r.slip as TrueMoneySlip) : undefined
    expect(slip).toMatchObject({
      kind: 'truemoney',
      eventType: 'P2P',
      transactionId: '50001234567890',
      date: '02102026',
      warnings: [],
    })
  })
})

describe('parseSlip: things that are not slips', () => {
  it('explains that a PromptPay payment QR is not a slip', () => {
    const r = parseSlip(
      '00020101021129370016A0000006770101110113006681222333353037645802TH63041DCF',
    )
    expect(r).toMatchObject({ ok: false, code: 'PROMPTPAY_QR' })
  })

  it('rejects empty input', () => {
    expect(parseSlip('   ')).toMatchObject({ ok: false, code: 'EMPTY' })
  })

  it('rejects URLs and random text', () => {
    expect(parseSlip('https://example.com/pay')).toMatchObject({ ok: false, code: 'MALFORMED' })
    expect(parseSlip('hello')).toMatchObject({ ok: false, code: 'MALFORMED' })
  })

  it('rejects TLV without a slip CRC tag', () => {
    expect(parseSlip('000411110104222202043333')).toMatchObject({ ok: false, code: 'NOT_A_SLIP' })
  })

  it('rejects an unknown slip type', () => {
    const root = encodeTlv([
      { id: '00', value: '000002' },
      { id: '01', value: '004' },
      { id: '02', value: 'ABC' },
    ])
    const payload = withCrc(encodeTlv([{ id: '00', value: root }]), '91')
    expect(parseSlip(payload)).toMatchObject({ ok: false, code: 'NOT_A_SLIP' })
  })
})

describe('slipKey', () => {
  it('is stable per transfer and separates banks', () => {
    const a = okBank(bankSlipPayload('004', 'REF1'))
    const b = okBank(bankSlipPayload('014', 'REF1'))
    expect(slipKey(a)).toBe('bank:004:REF1')
    expect(slipKey(a)).not.toBe(slipKey(b))
  })
})
