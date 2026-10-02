import {
  checkCrc,
  decodeTemplate,
  decodeTlv,
  encodeTlv,
  tagValue,
  TlvError,
  withCrc,
  type CrcCheck,
  type TlvTag,
} from './tlv.js'

const AID = {
  promptpay: 'A000000677010111',
  promptpayOta: 'A000000677010114',
  billPayment: 'A000000677010112',
  billPaymentCrossBorder: 'A000000677012006',
}

export type RecipientType = 'mobile' | 'national-id' | 'e-wallet' | 'bank-account' | 'ota'

export interface Recipient {
  type: RecipientType
  /** Value as encoded in the QR, e.g. "0066812223333" for a mobile number */
  value: string
  /** Mobile number in local format ("0812223333"), for mobile and TrueMoney recipients */
  mobile?: string
  /** Set when the e-wallet id is a TrueMoney Wallet */
  wallet?: 'truemoney'
}

export interface Biller {
  billerId: string
  ref1?: string
  ref2?: string
  ref3?: string
  crossBorder: boolean
}

export interface PromptPayQr {
  kind: 'promptpay' | 'bill-payment'
  /** true when the amount is fixed (point of initiation "12") */
  dynamic: boolean
  recipient?: Recipient
  biller?: Biller
  amount?: number
  currency?: string
  country?: string
  merchantName?: string
  merchantCity?: string
  /** TrueMoney personal message (tag 81) */
  message?: string
  crc: CrcCheck
  tags: TlvTag[]
  raw: string
}

export type ParsePromptPayResult =
  | { ok: true; qr: PromptPayQr }
  | {
      ok: false
      code: 'EMPTY' | 'MALFORMED' | 'NOT_PROMPTPAY' | 'CRC_MISMATCH'
      message: string
      qr?: PromptPayQr
    }

const RECIPIENT_SUBTAGS: Record<string, RecipientType> = {
  '01': 'mobile',
  '02': 'national-id',
  '03': 'e-wallet',
  '04': 'bank-account',
  '05': 'ota',
}

/** Parse a PromptPay / Thai QR Payment code (the QR a customer scans to pay). */
export function parsePromptPay(text: string): ParsePromptPayResult {
  const raw = text.trim()
  if (!raw) return { ok: false, code: 'EMPTY', message: 'The QR text is empty' }

  let tags: TlvTag[]
  try {
    tags = decodeTlv(raw)
  } catch (err) {
    if (err instanceof TlvError) {
      return { ok: false, code: 'MALFORMED', message: `Not a TLV payload: ${err.message}` }
    }
    throw err
  }

  const crc = checkCrc(raw, '63')
  const merchant = decodeTemplate(tagValue(tags, '29'))
  const bill = decodeTemplate(tagValue(tags, '30'))
  if (tagValue(tags, '00') !== '01' || !crc || (!merchant && !bill)) {
    return {
      ok: false,
      code: 'NOT_PROMPTPAY',
      message: 'Not a PromptPay QR (needs tag 00 = "01", tag 29 or 30, and a CRC in tag 63)',
    }
  }

  const qr: PromptPayQr = {
    kind: merchant ? 'promptpay' : 'bill-payment',
    dynamic: tagValue(tags, '01') === '12',
    currency: tagValue(tags, '53'),
    country: tagValue(tags, '58'),
    merchantName: tagValue(tags, '59'),
    merchantCity: tagValue(tags, '60'),
    crc,
    tags,
    raw,
  }

  if (merchant) {
    const aid = tagValue(merchant, '00')
    if (aid !== AID.promptpay && aid !== AID.promptpayOta) {
      return { ok: false, code: 'NOT_PROMPTPAY', message: `Unknown PromptPay AID "${aid ?? ''}"` }
    }
    const sub = merchant.find((t) => RECIPIENT_SUBTAGS[t.id])
    if (sub) qr.recipient = toRecipient(RECIPIENT_SUBTAGS[sub.id]!, sub.value)
  } else if (bill) {
    const aid = tagValue(bill, '00')
    if (aid !== AID.billPayment && aid !== AID.billPaymentCrossBorder) {
      return {
        ok: false,
        code: 'NOT_PROMPTPAY',
        message: `Unknown bill payment AID "${aid ?? ''}"`,
      }
    }
    qr.biller = {
      billerId: tagValue(bill, '01') ?? '',
      ref1: tagValue(bill, '02'),
      ref2: tagValue(bill, '03'),
      ref3: tagValue(decodeTemplate(tagValue(tags, '62')) ?? [], '07'),
      crossBorder: aid === AID.billPaymentCrossBorder,
    }
  }

  const amount = tagValue(tags, '54')
  if (amount !== undefined) qr.amount = Number(amount)
  const message = tagValue(tags, '81')
  if (message) qr.message = decodeUtf16Hex(message)

  if (!crc.valid) {
    return {
      ok: false,
      code: 'CRC_MISMATCH',
      message: `CRC mismatch: payload says ${crc.actual}, content gives ${crc.expected}`,
      qr,
    }
  }
  return { ok: true, qr }
}

export interface CreatePromptPayOptions {
  /** Mobile number, 13-digit national/tax ID, or 15-digit e-wallet id */
  target: string
  /** Amount in baht. Omit to let the payer type it in. */
  amount?: number
  /** Force the recipient type instead of guessing it from the length */
  type?: 'mobile' | 'national-id' | 'e-wallet'
}

/** Build a PromptPay QR payload for receiving money. Render it with any QR library. */
export function createPromptPay({ target, amount, type }: CreatePromptPayOptions): string {
  const digits = target.replace(/[\s-]/g, '').replace(/^\+/, '')
  if (!/^\d+$/.test(digits)) throw new TypeError(`PromptPay target must be digits, got "${target}"`)

  const kind = type ?? guessType(digits)
  let tag: TlvTag
  if (kind === 'mobile') {
    const local = digits.replace(/^(66|0)/, '')
    if (local.length !== 9) throw new RangeError(`"${target}" is not a Thai mobile number`)
    tag = { id: '01', value: `0066${local}` }
  } else if (kind === 'national-id') {
    if (digits.length !== 13) throw new RangeError('National ID / tax ID must be 13 digits')
    tag = { id: '02', value: digits }
  } else {
    if (digits.length !== 15) throw new RangeError('E-wallet ID must be 15 digits')
    tag = { id: '03', value: digits }
  }

  return finish(encodeTlv([{ id: '00', value: AID.promptpay }, tag]), '29', amount)
}

export interface CreateBillPaymentOptions {
  /** Tax ID + 2-digit suffix, 15 digits (some billers use 13) */
  billerId: string
  ref1: string
  ref2?: string
  /** Sent in tag 62.07; some banks show it as a terminal label */
  ref3?: string
  amount?: number
}

/** Build a PromptPay bill payment (tag 30) payload. */
export function createBillPayment({
  billerId,
  ref1,
  ref2,
  ref3,
  amount,
}: CreateBillPaymentOptions): string {
  const tags: TlvTag[] = [
    { id: '00', value: AID.billPayment },
    { id: '01', value: billerId },
    { id: '02', value: ref1 },
  ]
  if (ref2) tags.push({ id: '03', value: ref2 })
  const extra = ref3 ? [{ id: '62', value: encodeTlv([{ id: '07', value: ref3 }]) }] : []
  return finish(encodeTlv(tags), '30', amount, extra)
}

function finish(template: string, templateId: string, amount?: number, extra: TlvTag[] = []) {
  const tags: TlvTag[] = [
    { id: '00', value: '01' },
    { id: '01', value: amount === undefined ? '11' : '12' },
    { id: templateId, value: template },
    { id: '53', value: '764' },
    { id: '58', value: 'TH' },
  ]
  if (amount !== undefined) tags.push({ id: '54', value: formatAmount(amount) })
  return withCrc(encodeTlv([...tags, ...extra]), '63')
}

function formatAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9_999_999_999.99) {
    throw new RangeError(`Amount must be between 0.01 and 9,999,999,999.99, got ${amount}`)
  }
  const satang = Math.round(amount * 100)
  if (Math.abs(satang - amount * 100) > 1e-6) {
    throw new RangeError(`Amount has more than 2 decimal places: ${amount}`)
  }
  return (satang / 100).toFixed(2)
}

function guessType(digits: string): 'mobile' | 'national-id' | 'e-wallet' {
  if (digits.length === 13) return 'national-id'
  if (digits.length === 15) return 'e-wallet'
  if (/^(0\d{9}|66\d{9})$/.test(digits)) return 'mobile'
  throw new RangeError(
    `Cannot tell what "${digits}" is. Use a 10-digit mobile, 13-digit ID or 15-digit e-wallet id.`,
  )
}

function toRecipient(type: RecipientType, value: string): Recipient {
  if (type === 'mobile') return { type, value, mobile: `0${value.slice(-9)}` }
  if (type === 'e-wallet' && value.startsWith('14')) {
    return { type, value, wallet: 'truemoney', mobile: `0${value.slice(-9)}` }
  }
  return { type, value }
}

function decodeUtf16Hex(hex: string): string {
  let out = ''
  for (let i = 0; i + 4 <= hex.length; i += 4) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16))
  }
  return out
}
