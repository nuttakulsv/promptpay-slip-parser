import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { parseArgs } from 'node:util'
import { readSlip } from './image.js'
import { createPromptPay, parsePromptPay, type PromptPayQr } from './promptpay.js'
import { parseSlip, type ParseSlipResult, type Slip } from './slip.js'

const EXIT = { ok: 0, notFound: 1, usage: 2, crc: 3 } as const

const HELP = `Usage:
  promptpay-slip-parser <image | payload | -> [--json]
  promptpay-slip-parser qr <mobile | id> [--amount <baht>] [-o file.png|file.svg]

Read a slip:
  promptpay-slip-parser slip.jpg
  promptpay-slip-parser 004100060000010103014022000111222233344ABCD125102TH910417DF
  cat slip.png | promptpay-slip-parser -

Make a PromptPay QR to receive money:
  promptpay-slip-parser qr 0812345678 --amount 150 -o qr.png

Options:
  --json         Print the result as JSON (same shape as readSlip / parseSlip)
  -a, --amount   Amount in baht for "qr"
  -o, --out      Write the QR image to a .png or .svg file
  -h, --help     Show this help
  -v, --version  Show the version

Exit codes: 0 slip OK, 1 no slip found, 2 usage or file error, 3 CRC mismatch`

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      json: { type: 'boolean' },
      amount: { type: 'string', short: 'a' },
      out: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  })

  if (values.version) {
    const pkg = createRequire(import.meta.url)('../package.json') as { version: string }
    console.log(pkg.version)
    return EXIT.ok
  }
  if (values.help) {
    console.log(HELP)
    return EXIT.ok
  }

  if (positionals[0] === 'qr') {
    return makeQr(positionals[1], values.amount, values.out, values.json)
  }

  const input = positionals[0] ?? (process.stdin.isTTY ? undefined : '-')
  if (!input) {
    console.log(HELP)
    return EXIT.usage
  }
  return read(input, values.json)
}

async function read(input: string, json = false): Promise<number> {
  let bytes: Uint8Array | undefined
  let text: string | undefined

  if (input === '-') {
    bytes = await readStdin()
  } else if (existsSync(input)) {
    bytes = await readFile(input)
  } else if (/^\d{4}/.test(input)) {
    text = input
  } else {
    console.error(`No such file: ${input}`)
    return EXIT.usage
  }

  if (bytes && !looksLikeImage(bytes)) {
    text = new TextDecoder().decode(bytes)
  }

  const result: ParseSlipResult & { codes?: unknown[] } =
    text !== undefined ? parseSlip(text) : await readSlip(bytes!)

  if (json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printHuman(result, text)
  }

  if (result.ok) return EXIT.ok
  return result.code === 'CRC_MISMATCH' ? EXIT.crc : EXIT.notFound
}

function printHuman(result: ParseSlipResult & { codes?: unknown[] }, text?: string) {
  const count = result.codes?.length ?? 0
  if (count > 1) console.log(`${count} QR codes found in the image.`)

  if (result.ok) {
    console.log(describeSlip(result.slip))
    console.log(
      '\nA valid QR only means the payload is well-formed, not that the money arrived.' +
        '\nCheck the reference with your bank or a slip verification service before you ship.',
    )
    return
  }

  console.error(result.message)
  if (result.slip) console.error(describeSlip(result.slip))

  if (result.code === 'PROMPTPAY_QR') {
    const codes = (result.codes ?? []) as { text: string }[]
    const payload = text ?? codes.map((c) => c.text).find((t) => parsePromptPay(t).ok)
    const pp = payload ? parsePromptPay(payload) : undefined
    if (pp?.ok) console.error(describePromptPay(pp.qr))
  }
}

function describeSlip(slip: Slip): string {
  const rows: [string, string][] =
    slip.kind === 'bank'
      ? [
          [
            'Bank',
            slip.bank
              ? `${slip.sendingBank} ${slip.bank.abbr}  ${slip.bank.nameTh} / ${slip.bank.nameEn}`
              : `${slip.sendingBank} (unknown)`,
          ],
          ['Trans ref', slip.transRef],
        ]
      : [
          ['Wallet', 'TrueMoney'],
          ['Event', slip.eventType],
          ['Transaction', slip.transactionId],
          ['Date', slip.date.replace(/^(\d\d)(\d\d)(\d{4})$/, '$1/$2/$3')],
        ]
  rows.push(['CRC', slip.crc.valid ? `OK (${slip.crc.actual})` : `MISMATCH (${slip.crc.actual})`])
  for (const w of slip.warnings) rows.push(['Warning', w])
  const title = slip.kind === 'bank' ? 'Bank transfer slip' : 'TrueMoney Wallet slip'
  return [title, ...rows.map(([k, v]) => `  ${k.padEnd(12)}${v}`)].join('\n')
}

function describePromptPay(qr: PromptPayQr): string {
  const rows: [string, string][] = []
  if (qr.recipient) {
    rows.push(['Pay to', `${qr.recipient.mobile ?? qr.recipient.value} (${qr.recipient.type})`])
  }
  if (qr.biller) rows.push(['Biller', `${qr.biller.billerId} ref1 ${qr.biller.ref1 ?? '-'}`])
  rows.push(['Amount', qr.amount === undefined ? 'payer enters it' : qr.amount.toFixed(2)])
  return ['PromptPay QR', ...rows.map(([k, v]) => `  ${k.padEnd(12)}${v}`)].join('\n')
}

async function makeQr(target?: string, amountText?: string, out?: string, json = false) {
  if (!target) {
    console.error('Usage: promptpay-slip-parser qr <mobile | id> [--amount <baht>] [-o file.png]')
    return EXIT.usage
  }
  const amount = amountText === undefined ? undefined : Number(amountText.replace(/,/g, ''))

  let payload: string
  try {
    payload = createPromptPay({ target, amount })
  } catch (err) {
    console.error((err as Error).message)
    return EXIT.usage
  }

  if (json) {
    console.log(
      JSON.stringify({ payload, ...(parsePromptPay(payload) as { qr: object }).qr }, null, 2),
    )
    return EXIT.ok
  }

  const { writeBarcode } = await import('zxing-wasm/writer')
  if (out) {
    const svg = out.toLowerCase().endsWith('.svg')
    const qr = await writeBarcode(payload, { format: 'QRCode', scale: 10, options: 'ecLevel=M' })
    if (qr.error) throw new Error(qr.error)
    await writeFile(out, svg ? qr.svg : new Uint8Array(await qr.image!.arrayBuffer()))
    console.log(`${payload}\nSaved ${out}`)
  } else {
    const qr = await writeBarcode(payload, { format: 'QRCode', invert: true, options: 'ecLevel=M' })
    console.log(`${qr.utf8}\n${payload}`)
  }
  return EXIT.ok
}

function looksLikeImage(b: Uint8Array): boolean {
  const ascii = (start: number, s: string) =>
    [...s].every((ch, i) => b[start + i] === ch.charCodeAt(0))
  return (
    (b[0] === 0x89 && ascii(1, 'PNG')) ||
    (b[0] === 0xff && b[1] === 0xd8) ||
    ascii(0, 'GIF8') ||
    ascii(0, 'BM') ||
    (ascii(0, 'RIFF') && ascii(8, 'WEBP'))
  )
}

async function readStdin(): Promise<Uint8Array> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code
  },
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = EXIT.usage
  },
)
