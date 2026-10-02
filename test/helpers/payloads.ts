// Test-only builders for slip QR payloads. Intentionally not part of the public API.
import { crc16, encodeTlv, withCrc } from '../../src/tlv.js'

export function bankSlipPayload(sendingBank: string, transRef: string): string {
  const root = encodeTlv([
    { id: '00', value: '000001' },
    { id: '01', value: sendingBank },
    { id: '02', value: transRef },
  ])
  return withCrc(
    encodeTlv([
      { id: '00', value: root },
      { id: '51', value: 'TH' },
    ]),
    '91',
  )
}

export function trueMoneySlipPayload(
  eventType: string,
  transactionId: string,
  date: string,
): string {
  const root = encodeTlv([
    { id: '00', value: '01' },
    { id: '01', value: '01' },
    { id: '02', value: eventType },
    { id: '03', value: transactionId },
    { id: '04', value: date },
  ])
  const head = `${encodeTlv([{ id: '00', value: root }])}9104`
  return head + crc16(head).toLowerCase()
}

/** Replace the transaction reference but keep the old CRC, like an edited slip. */
export function tamper(payload: string, from: string, to: string): string {
  if (from.length !== to.length) throw new Error('keep the same length so TLV stays valid')
  return payload.replace(from, to)
}

/** Find a bank slip whose CRC starts with "0", then drop the zeros like some bank apps do. */
export function shortCrcPayload(sendingBank = '004'): { payload: string; transRef: string } {
  for (let i = 0; ; i++) {
    const transRef = `TEST${String(i).padStart(16, '0')}`
    const full = bankSlipPayload(sendingBank, transRef)
    if (full.slice(-4).startsWith('0')) {
      return { payload: full.slice(0, -4) + full.slice(-4).replace(/^0+/, ''), transRef }
    }
  }
}
