import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function cli(args: string[], input?: string | Buffer) {
  const r = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', ...args], {
    input,
    encoding: 'utf8',
  })
  return { code: r.status, out: r.stdout, err: r.stderr }
}

describe('cli', () => {
  it('reads a slip image', () => {
    const r = cli(['test/fixtures/bank-basic.png'])
    expect(r.code).toBe(0)
    expect(r.out).toContain('016275104552BTF04123')
    expect(r.out).toContain('KBANK')
  })

  it('reads a payload from an argument and prints JSON', () => {
    const r = cli(['004100060000010103014022000111222233344ABCD125102TH910417DF', '--json'])
    expect(r.code).toBe(0)
    expect(JSON.parse(r.out).slip.transRef).toBe('00111222233344ABCD12')
  })

  it('reads an image from stdin', () => {
    const r = cli(['-'], readFileSync('test/fixtures/chat-screenshot.png'))
    expect(r.code).toBe(0)
    expect(r.out).toContain('KTB2610021042000123')
  })

  it('reads a text payload from stdin', () => {
    const r = cli([], '004000060000010103002021900021231231212000115102TH91049C30\n')
    expect(r.code).toBe(0)
    expect(r.out).toContain('BBL')
  })

  it('uses exit code 3 for an edited slip and 1 when there is no slip', () => {
    expect(cli(['test/fixtures/tampered.png']).code).toBe(3)
    expect(cli(['test/fixtures/no-qr.png']).code).toBe(1)
    const pp = cli(['test/fixtures/promptpay-only.png'])
    expect(pp.code).toBe(1)
    expect(pp.err).toContain('0812223333')
  })

  it('uses exit code 2 for usage errors', () => {
    expect(cli(['missing.png']).code).toBe(2)
    expect(cli(['--nope']).code).toBe(2)
    expect(cli(['qr']).code).toBe(2)
    expect(cli(['qr', '123']).code).toBe(2)
  })

  it('makes a PromptPay QR that it can read back', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'pps-')), 'qr.png')
    const made = cli(['qr', '0812223333', '--amount', '30', '-o', out])
    expect(made.code).toBe(0)
    expect(made.out).toContain(
      '00020101021229370016A0000006770101110113006681222333353037645802TH540530.0063043CAD',
    )
    const back = cli([out])
    expect(back.err).toContain('Amount      30.00')
  })
})
