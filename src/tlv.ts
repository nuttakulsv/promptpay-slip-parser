export interface TlvTag {
  id: string
  value: string
}

export class TlvError extends Error {
  override name = 'TlvError'
}

/**
 * Decode an EMVCo-style TLV string: 2-digit id, 2-digit length, value.
 * Throws `TlvError` when a header is not numeric or a value runs past the end.
 */
export function decodeTlv(payload: string): TlvTag[] {
  const tags: TlvTag[] = []
  let i = 0
  while (i < payload.length) {
    const id = payload.slice(i, i + 2)
    const len = payload.slice(i + 2, i + 4)
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(len)) {
      throw new TlvError(`Invalid tag header "${payload.slice(i, i + 4)}" at position ${i}`)
    }
    const value = payload.slice(i + 4, i + 4 + Number(len))
    if (value.length !== Number(len)) {
      throw new TlvError(`Tag ${id} declares ${len} characters but only ${value.length} remain`)
    }
    tags.push({ id, value })
    i += 4 + value.length
  }
  return tags
}

export function encodeTlv(tags: TlvTag[]): string {
  return tags
    .map(({ id, value }) => {
      if (value.length > 99) throw new TlvError(`Tag ${id} is longer than 99 characters`)
      return id + String(value.length).padStart(2, '0') + value
    })
    .join('')
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) over UTF-8 bytes, as 4 uppercase hex digits. */
export function crc16(input: string): string {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(input)) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
    }
    crc &= 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export interface CrcCheck {
  /** CRC calculated from the payload */
  expected: string
  /** CRC found in the payload */
  actual: string
  valid: boolean
}

/** Append a CRC tag (`6304....` or `9104....`) to a payload. */
export function withCrc(payload: string, tagId: string): string {
  const head = `${payload}${tagId}04`
  return head + crc16(head)
}

/** Check the CRC of a payload whose last tag is `tagId` with a 4-character value. */
export function checkCrc(payload: string, tagId: string): CrcCheck | null {
  const header = `${tagId}04`
  if (payload.slice(-8, -4) !== header) return null
  const actual = payload.slice(-4)
  const expected = crc16(payload.slice(0, -4))
  return { expected, actual, valid: expected === actual.toUpperCase() }
}

export function tagValue(tags: TlvTag[], id: string): string | undefined {
  return tags.find((t) => t.id === id)?.value
}

/** Decode a nested template, returning `undefined` instead of throwing. */
export function decodeTemplate(value: string | undefined): TlvTag[] | undefined {
  if (value === undefined) return undefined
  try {
    return decodeTlv(value)
  } catch {
    return undefined
  }
}
