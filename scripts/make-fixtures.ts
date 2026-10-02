// Renders obviously fake slip images for tests and the demo page.
// Run with: npm run fixtures
import { mkdir, writeFile } from 'node:fs/promises'
import QRCode from 'qrcode'
import sharp from 'sharp'
import { createPromptPay } from '../src/promptpay.js'
import {
  bankSlipPayload,
  shortCrcPayload,
  tamper,
  trueMoneySlipPayload,
} from '../test/helpers/payloads.js'

const OUT = new URL('../test/fixtures/', import.meta.url)
const W = 720
const H = 1280
const FONT = "'Sukhumvit Set', Thonburi, Tahoma, 'Noto Sans Thai', sans-serif"

interface Expect {
  ok: boolean
  code?: string
  kind?: 'bank' | 'truemoney'
  sendingBank?: string
  transRef?: string
  transactionId?: string
  codes: number
}

const manifest: { file: string; note: string; expect: Expect }[] = []

function slipSvg(ref: string, opts: { title?: string } = {}) {
  const rows: [string, string][] = [
    ['วันที่ / Date', '2 ต.ค. 2569  10:42'],
    ['จาก / From', 'นาย ตัวอย่าง ทดสอบ'],
    ['', 'xxx-x-x1234-x'],
    ['ไปยัง / To', 'ร้าน ตัวอย่าง จำกัด'],
    ['', 'xxx-x-x5678-x'],
    ['จำนวนเงิน / Amount', '1,250.00 บาท'],
    ['เลขที่รายการ / Ref', ref],
  ]
  const text = rows
    .map(
      ([label, value], i) => `
      <text x="64" y="${300 + i * 62}" font-size="22" fill="#6b7280">${label}</text>
      <text x="656" y="${300 + i * 62}" font-size="26" fill="#111827" text-anchor="end">${value}</text>`,
    )
    .join('')
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <style>text { font-family: ${FONT}; }</style>
  <rect width="100%" height="100%" fill="#e5e7eb"/>
  <rect x="32" y="40" width="${W - 64}" height="${H - 80}" rx="28" fill="#ffffff"/>
  <text x="64" y="128" font-size="40" font-weight="bold" fill="#374151">${opts.title ?? 'SAMPLE SLIP'}</text>
  <text x="64" y="176" font-size="24" fill="#9ca3af">ภาพตัวอย่างสำหรับทดสอบ ไม่ใช่สลิปจริง</text>
  <line x1="64" y1="220" x2="656" y2="220" stroke="#e5e7eb" stroke-width="3"/>
  ${text}
  <g transform="translate(${W / 2} ${H / 2 + 40}) rotate(-32)" opacity="0.28">
    <text x="0" y="-30" font-size="110" font-weight="bold" fill="#dc2626" text-anchor="middle">SAMPLE</text>
    <text x="0" y="80" font-size="58" font-weight="bold" fill="#dc2626" text-anchor="middle">ตัวอย่าง ไม่ใช่สลิปจริง</text>
  </g>
</svg>`)
}

async function qr(payload: string, size: number) {
  return QRCode.toBuffer(payload, { width: size, margin: 2, errorCorrectionLevel: 'M' })
}

async function slip(
  ref: string,
  codes: { payload: string; size: number; left: number; top: number }[],
  title?: string,
) {
  const layers = await Promise.all(
    codes.map(async (c) => ({ input: await qr(c.payload, c.size), left: c.left, top: c.top })),
  )
  return sharp(slipSvg(ref, { title })).composite(layers).png().toBuffer()
}

async function save(file: string, data: Buffer, note: string, expect: Expect) {
  await writeFile(new URL(file, OUT), data)
  manifest.push({ file, note, expect })
}

await mkdir(OUT, { recursive: true })

const ref = '016275104552BTF04123'
const bank = bankSlipPayload('004', ref)
const bottom = { size: 220, left: W - 64 - 220, top: H - 80 - 260 }

await save(
  'bank-basic.png',
  await slip(ref, [{ payload: bank, ...bottom }]),
  'Plain slip, QR 220px',
  {
    ok: true,
    kind: 'bank',
    sendingBank: '004',
    transRef: ref,
    codes: 1,
  },
)

const smallRef = '202610021042AB12CD34EF56G'
{
  const base = await slip(smallRef, [
    { payload: bankSlipPayload('014', smallRef), size: 64, left: W - 64 - 90, top: H - 80 - 110 },
  ])
  const big = await sharp(base).resize(1080, 1920).jpeg({ quality: 72 }).toBuffer()
  await save('bank-small-qr.jpg', big, 'Large JPEG screenshot, QR about 96px', {
    ok: true,
    kind: 'bank',
    sendingBank: '014',
    transRef: smallRef,
    codes: 1,
  })
}

const rotRef = '0002123123121200011'
{
  const base = await slip(rotRef, [{ payload: bankSlipPayload('002', rotRef), ...bottom }])
  const rotated = await sharp(base)
    .rotate(8, { background: '#9ca3af' })
    .jpeg({ quality: 80 })
    .toBuffer()
  await save('bank-rotated.jpg', rotated, 'Rotated 8 degrees, JPEG q80', {
    ok: true,
    kind: 'bank',
    sendingBank: '002',
    transRef: rotRef,
    codes: 1,
  })
}

const chatRef = 'KTB2610021042000123'
{
  const base = await slip(chatRef, [{ payload: bankSlipPayload('006', chatRef), ...bottom }])
  const thumb = await sharp(base)
    .resize(Math.round(W * 0.62))
    .png()
    .toBuffer()
  const meta = await sharp(thumb).metadata()
  const cw = 1170
  const ch = 2532
  const bubbles = [
    [60, 260, 640, 120, '#ffffff', 'สวัสดีครับ โอนแล้วนะครับ'],
    [470, 2120, 640, 120, '#a7f3d0', 'ได้รับแล้วค่ะ ขอบคุณค่ะ'],
  ] as const
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}">
    <style>text { font-family: ${FONT}; }</style>
    <rect width="100%" height="100%" fill="#8fa8c8"/>
    <rect width="100%" height="180" fill="#1f2937"/>
    <text x="80" y="120" font-size="48" fill="#ffffff">ร้าน ตัวอย่าง (SAMPLE CHAT)</text>
    ${bubbles
      .map(
        ([x, y, w, h, fill, msg]) =>
          `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="40" fill="${fill}"/>
           <text x="${x + 40}" y="${y + 75}" font-size="40" fill="#111827">${msg}</text>`,
      )
      .join('')}
    <rect x="60" y="420" width="${(meta.width ?? 0) + 40}" height="${(meta.height ?? 0) + 40}" rx="36" fill="#ffffff"/>
  </svg>`)
  const chat = await sharp(svg)
    .composite([{ input: thumb, left: 80, top: 440 }])
    .png()
    .toBuffer()
  await save('chat-screenshot.png', chat, 'Slip forwarded inside a chat screenshot', {
    ok: true,
    kind: 'bank',
    sendingBank: '006',
    transRef: chatRef,
    codes: 1,
  })
}

const twoRef = '017999888777666ABC'
await save(
  'two-codes.png',
  await slip(
    twoRef,
    [
      {
        payload: createPromptPay({ target: '0812223333', amount: 1250 }),
        size: 170,
        left: W - 64 - 170,
        top: 60,
      },
      { payload: bankSlipPayload('025', twoRef), ...bottom },
    ],
    'TWO QR CODES',
  ),
  'Payment QR at the top, slip QR at the bottom',
  { ok: true, kind: 'bank', sendingBank: '025', transRef: twoRef, codes: 2 },
)

const tmId = '50001234567890'
await save(
  'truemoney.png',
  await slip(
    tmId,
    [{ payload: trueMoneySlipPayload('P2P', tmId, '02102026'), ...bottom }],
    'SAMPLE WALLET',
  ),
  'TrueMoney Wallet slip layout, lowercase CRC',
  { ok: true, kind: 'truemoney', transactionId: tmId, codes: 1 },
)

const editedRef = '016275104552BTF04999'
await save(
  'tampered.png',
  await slip(editedRef, [{ payload: tamper(bank, ref, editedRef), ...bottom }]),
  'transRef edited after the CRC was computed',
  { ok: false, code: 'CRC_MISMATCH', codes: 1 },
)

{
  const { payload, transRef } = shortCrcPayload('030')
  await save(
    'short-crc.png',
    await slip(transRef, [{ payload, ...bottom }]),
    'CRC printed without leading zeros',
    {
      ok: true,
      kind: 'bank',
      sendingBank: '030',
      transRef,
      codes: 1,
    },
  )
}

await save(
  'promptpay-only.png',
  await slip(
    '-',
    [{ payload: createPromptPay({ target: '0812223333' }), ...bottom }],
    'PAYMENT QR',
  ),
  'A PromptPay payment QR, not a slip',
  { ok: false, code: 'PROMPTPAY_QR', codes: 1 },
)

await save('no-qr.png', await slip('-', []), 'Slip without a QR code', {
  ok: false,
  code: 'NO_QR_FOUND',
  codes: 0,
})

{
  const dimRef = '011260210104200777'
  const base = await slip(dimRef, [{ payload: bankSlipPayload('011', dimRef), ...bottom }])
  const dim = await sharp(base)
    .blur(1.4)
    .modulate({ brightness: 0.62 })
    .linear(0.7, 20)
    .jpeg({ quality: 55 })
    .toBuffer()
  await save('photo-dim.jpg', dim, 'Blurred, dark, low contrast JPEG q55 (photo of a screen)', {
    ok: true,
    kind: 'bank',
    sendingBank: '011',
    transRef: dimRef,
    codes: 1,
  })
}

await writeFile(new URL('manifest.json', OUT), JSON.stringify(manifest, null, 2) + '\n')
console.log(`wrote ${manifest.length} fixtures to test/fixtures`)
