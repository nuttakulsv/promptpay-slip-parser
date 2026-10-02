import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { readQrCodes, readSlip } from '../src/image.js'

interface Fixture {
  file: string
  note: string
  expect: {
    ok: boolean
    code?: string
    kind?: string
    sendingBank?: string
    transRef?: string
    transactionId?: string
    codes: number
  }
}

const dir = new URL('./fixtures/', import.meta.url)
const manifest: Fixture[] = JSON.parse(await readFile(new URL('manifest.json', dir), 'utf8'))

describe('readSlip on fixture images', () => {
  it.each(manifest.map((f) => [f.file, f] as const))('%s', async (_name, f) => {
    const result = await readSlip(await readFile(new URL(f.file, dir)))
    expect(result.codes).toHaveLength(f.expect.codes)
    if (!f.expect.ok) {
      expect(result).toMatchObject({ ok: false, code: f.expect.code })
      return
    }
    expect(result.ok, result.ok ? '' : result.message).toBe(true)
    if (!result.ok) return
    expect(result.slip.kind).toBe(f.expect.kind)
    if (result.slip.kind === 'bank') {
      expect(result.slip.sendingBank).toBe(f.expect.sendingBank)
      expect(result.slip.transRef).toBe(f.expect.transRef)
    } else {
      expect(result.slip.transactionId).toBe(f.expect.transactionId)
    }
  })
})

describe('input types', () => {
  const file = new URL('bank-basic.png', dir)

  it('accepts ArrayBuffer, Uint8Array views and Blob', async () => {
    const buf = await readFile(file)
    const copy = new Uint8Array(buf.byteLength + 16)
    copy.set(buf, 8)
    const view = copy.subarray(8, 8 + buf.byteLength)

    const inputs = [
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      view,
      new Blob([buf]),
    ]
    for (const input of inputs) {
      expect((await readSlip(input)).ok).toBe(true)
    }
  })

  it('returns positions for every code', async () => {
    const codes = await readQrCodes(await readFile(new URL('two-codes.png', dir)))
    expect(codes).toHaveLength(2)
    for (const c of codes) {
      expect(c.position.topLeft.x).toBeGreaterThan(0)
      expect(c.position.bottomRight.y).toBeGreaterThan(c.position.topLeft.y)
    }
  })

  it('reports NO_QR_FOUND for something that is not an image', async () => {
    const result = await readSlip(new TextEncoder().encode('definitely not an image'))
    expect(result).toMatchObject({ ok: false, code: 'NO_QR_FOUND' })
  })
})
