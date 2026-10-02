import { prepareZXingModule, readBarcodes, type Position } from 'zxing-wasm/reader'
import { parseSlip, type ParseSlipResult, type Slip, type SlipErrorCode } from './slip.js'

export { prepareZXingModule }
export type { Position }

/** Encoded image bytes (PNG, JPEG, WebP, GIF, BMP), a Blob/File, or raw RGBA pixels. */
export type ImageInput = Blob | ArrayBuffer | Uint8Array | ImageData

export interface QrCode {
  text: string
  position: Position
}

export interface FoundCode extends QrCode {
  result: ParseSlipResult
}

export type ReadSlipResult =
  | { ok: true; slip: Slip; codes: FoundCode[] }
  | { ok: false; code: SlipErrorCode; message: string; slip?: Slip; codes: FoundCode[] }

/** Find every QR code in an image. */
export async function readQrCodes(input: ImageInput): Promise<QrCode[]> {
  const results = await readBarcodes(input, {
    formats: ['QRCode'],
    tryHarder: true,
    maxNumberOfSymbols: 8,
  })
  return results
    .filter((r) => r.isValid && r.text)
    .map((r) => ({ text: r.text, position: r.position }))
}

// When nothing parses, report the failure that tells the user the most.
const ERROR_RANK: SlipErrorCode[] = [
  'CRC_MISMATCH',
  'PROMPTPAY_QR',
  'NOT_A_SLIP',
  'MALFORMED',
  'EMPTY',
]

/**
 * Find the slip QR in a slip image or screenshot. Every QR found is returned in
 * `codes`, so a payment QR printed next to the slip QR is not lost.
 */
export async function readSlip(input: ImageInput): Promise<ReadSlipResult> {
  const codes = (await readQrCodes(input)).map((c) => ({ ...c, result: parseSlip(c.text) }))

  for (const { result } of codes) {
    if (result.ok) return { ok: true, slip: result.slip, codes }
  }
  if (!codes.length) {
    return { ok: false, code: 'NO_QR_FOUND', message: 'No QR code found in the image', codes }
  }

  const failures = codes.map((c) => c.result).filter((r) => !r.ok)
  failures.sort((a, b) => ERROR_RANK.indexOf(a.code) - ERROR_RANK.indexOf(b.code))
  return { ...failures[0]!, codes }
}

/** Browsers load the .wasm from jsDelivr by default. Call this to serve it yourself. */
export function setWasmUrl(url: string): void {
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? url : prefix + path),
    },
  })
}
