import { describe, expect, it } from 'vitest'
import { crc16, decodeTlv, encodeTlv, TlvError } from '../src/index.js'

describe('crc16', () => {
  it('matches CRC-16/CCITT-FALSE check value', () => {
    expect(crc16('123456789')).toBe('29B1')
  })

  it('matches CRCs printed in real payload formats', () => {
    expect(crc16('004000060000010103002021900021231231212000115102TH9104')).toBe('9C30')
    expect(crc16('00020101021129390016A000000677010111031514000080111111153037645802TH6304')).toBe(
      '7C0F',
    )
  })

  it('pads to 4 digits', () => {
    expect(crc16('')).toBe('FFFF')
    expect(crc16('TEST00000000000000000003')).toMatch(/^[0-9A-F]{4}$/)
  })
})

describe('decodeTlv / encodeTlv', () => {
  it('round-trips', () => {
    const tags = [
      { id: '00', value: '01' },
      { id: '29', value: '0016A000000677010111' },
      { id: '58', value: 'TH' },
    ]
    const text = encodeTlv(tags)
    expect(text).toBe('00020129200016A0000006770101115802TH')
    expect(decodeTlv(text)).toEqual(tags)
  })

  it('handles empty values and an empty string', () => {
    expect(decodeTlv('0100')).toEqual([{ id: '01', value: '' }])
    expect(decodeTlv('')).toEqual([])
  })

  it('throws on a value that runs past the end', () => {
    expect(() => decodeTlv('0005ABC')).toThrow(TlvError)
  })

  it('throws on a non-numeric header', () => {
    expect(() => decodeTlv('AB02XX')).toThrow(/Invalid tag header/)
    expect(() => decodeTlv('00XX')).toThrow(TlvError)
  })

  it('refuses values longer than 99 characters', () => {
    expect(() => encodeTlv([{ id: '00', value: 'x'.repeat(100) }])).toThrow(TlvError)
  })
})
