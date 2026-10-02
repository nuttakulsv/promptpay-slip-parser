import { getBank, type Bank } from './banks.js'
import { checkCrc, decodeTemplate, decodeTlv, tagValue, TlvError, type CrcCheck } from './tlv.js'

export interface BankSlip {
  kind: 'bank'
  /** 3-digit code of the bank that sent the money */
  sendingBank: string
  /** Bank details, when the code is known */
  bank?: Bank
  /** Transaction reference used by bank slip verification APIs */
  transRef: string
  country?: string
  crc: CrcCheck
  /** The payload as read from the QR code */
  raw: string
  warnings: string[]
}

export interface TrueMoneySlip {
  kind: 'truemoney'
  /** For example "P2P" */
  eventType: string
  transactionId: string
  /** Date printed in the QR, DDMMYYYY */
  date: string
  crc: CrcCheck
  raw: string
  warnings: string[]
}

export type Slip = BankSlip | TrueMoneySlip

export type SlipErrorCode =
  'EMPTY' | 'MALFORMED' | 'PROMPTPAY_QR' | 'NOT_A_SLIP' | 'CRC_MISMATCH' | 'NO_QR_FOUND'

export type ParseSlipResult =
  { ok: true; slip: Slip } | { ok: false; code: SlipErrorCode; message: string; slip?: Slip }

// Some bank apps print the CRC without its leading zeros, e.g. "9104ABC".
const SHORT_CRC = /9104([0-9A-Fa-f]{1,3})$/

/**
 * Parse the text of a transfer slip QR code.
 *
 * `ok: true` means the payload is a well-formed slip with a matching CRC.
 * It does not mean the transfer happened; confirm `transRef` with the bank for that.
 */
export function parseSlip(text: string): ParseSlipResult {
  const raw = text.trim()
  if (!raw) return fail('EMPTY', 'The QR text is empty')

  const warnings: string[] = []
  let payload = raw
  const short = SHORT_CRC.exec(raw)
  if (short?.[1]) {
    payload = raw.slice(0, short.index + 4) + short[1].padStart(4, '0')
    warnings.push(`CRC "${short[1]}" was shorter than 4 characters and was padded with zeros`)
  }

  let tags
  try {
    tags = decodeTlv(payload)
  } catch (err) {
    if (err instanceof TlvError) return fail('MALFORMED', `Not a TLV payload: ${err.message}`)
    throw err
  }

  if (tagValue(tags, '00') === '01' && (tagValue(tags, '29') ?? tagValue(tags, '30'))) {
    return fail(
      'PROMPTPAY_QR',
      'This is a PromptPay payment QR (the code you scan to pay), not a transfer slip',
    )
  }

  const root = decodeTemplate(tagValue(tags, '00'))
  const crc = checkCrc(payload, '91')
  if (!root || !crc || tags.at(-1)?.id !== '91') {
    return fail(
      'NOT_A_SLIP',
      'The payload does not have the slip verification layout (tags 00 and 91)',
    )
  }

  let slip: Slip
  if (tagValue(root, '00') === '000001') {
    const sendingBank = tagValue(root, '01')
    const transRef = tagValue(root, '02')
    if (!sendingBank || !transRef) {
      return fail('NOT_A_SLIP', 'Slip payload is missing the sending bank or transaction reference')
    }
    const country = tagValue(tags, '51')
    const bank = getBank(sendingBank)
    if (!bank) warnings.push(`Unknown bank code "${sendingBank}"`)
    if (country !== 'TH') warnings.push(`Expected country "TH" in tag 51, got "${country ?? ''}"`)
    slip = { kind: 'bank', sendingBank, bank, transRef, country, crc, raw, warnings }
  } else if (tagValue(root, '00') === '01' && tagValue(root, '01') === '01') {
    const transactionId = tagValue(root, '03')
    if (!transactionId) return fail('NOT_A_SLIP', 'TrueMoney slip payload has no transaction id')
    slip = {
      kind: 'truemoney',
      eventType: tagValue(root, '02') ?? '',
      transactionId,
      date: tagValue(root, '04') ?? '',
      crc,
      raw,
      warnings,
    }
  } else {
    return fail('NOT_A_SLIP', `Unknown slip type "${tagValue(root, '00') ?? ''}" in tag 00`)
  }

  if (!crc.valid) {
    return {
      ok: false,
      code: 'CRC_MISMATCH',
      message: `CRC mismatch: payload says ${crc.actual}, content gives ${crc.expected}. The QR was edited or misread.`,
      slip,
    }
  }
  return { ok: true, slip }
}

/** A stable key for de-duplication: the same transfer always produces the same key. */
export function slipKey(slip: Slip): string {
  return slip.kind === 'bank'
    ? `bank:${slip.sendingBank}:${slip.transRef}`
    : `truemoney:${slip.transactionId}`
}

function fail(code: SlipErrorCode, message: string): ParseSlipResult {
  return { ok: false, code, message }
}
