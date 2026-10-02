import { parsePromptPay, parseSlip, readSlip, setWasmUrl } from './vendor/promptpay-slip-parser.js'

setWasmUrl(new URL('./vendor/zxing_reader.wasm', import.meta.url).href)

const text = {
  th: {
    title: 'อ่าน QR บนสลิปโอนเงิน',
    lede: 'เช็กธนาคาร เลขอ้างอิง และ CRC จาก QR บนสลิป ประมวลผลในเบราว์เซอร์ทั้งหมด รูปไม่ถูกอัปโหลดไปไหน',
    drop: 'ลากรูปสลิปมาวาง หรือคลิกเพื่อเลือกไฟล์',
    dropHint: 'วางจากคลิปบอร์ดได้ด้วย Ctrl+V / ⌘V · PNG, JPEG, WebP',
    sampleSlip: 'ลองสลิปตัวอย่าง',
    sampleChat: 'แคปจากแชต',
    sampleTwo: 'มี QR 2 อัน',
    sampleEdited: 'สลิปที่ถูกแก้',
    pasteToggle: 'มีข้อความจาก QR อยู่แล้ว? วางตรงนี้',
    note: 'QR ถูกต้องและ CRC ผ่าน แปลว่าข้อมูลใน QR ไม่ถูกแก้ ไม่ได้แปลว่าเงินเข้าจริง ใครก็สร้าง QR หน้าตาแบบนี้ได้ ถ้าเป็นเรื่องเงิน ให้เอาเลขอ้างอิงไปเช็กกับธนาคารหรือบริการตรวจสลิป และกันสลิปซ้ำด้วยทุกครั้ง',
    footer: 'สร้างด้วย',
    reading: 'กำลังอ่าน...',
    ok: 'รูปแบบสลิปถูกต้อง',
    okHint: 'ขั้นต่อไป: เอาเลขอ้างอิงไปเช็กกับธนาคาร',
    CRC_MISMATCH: 'CRC ไม่ตรง',
    CRC_MISMATCHHint: 'ข้อมูลใน QR ถูกแก้ หรืออ่านไม่ครบ อย่ารับสลิปนี้',
    PROMPTPAY_QR: 'นี่คือ QR รับเงิน ไม่ใช่สลิป',
    PROMPTPAY_QRHint: 'QR แบบนี้ใช้สแกนเพื่อจ่าย ลูกค้าอาจส่งผิดรูป',
    NO_QR_FOUND: 'ไม่พบ QR ในรูป',
    NO_QR_FOUNDHint: 'ลองครอปให้เห็น QR ชัดขึ้น หรือใช้ไฟล์ต้นฉบับแทนรูปที่ถูกบีบอัด',
    other: 'ไม่ใช่ QR ของสลิป',
    bank: 'ธนาคารผู้โอน',
    transRef: 'เลขอ้างอิง',
    wallet: 'วอลเล็ต',
    event: 'ประเภท',
    transactionId: 'รหัสรายการ',
    date: 'วันที่',
    country: 'ประเทศ',
    crc: 'CRC',
    warnings: 'ข้อสังเกต',
    codes: 'QR ในรูป',
    payTo: 'โอนไปที่',
    amount: 'จำนวนเงิน',
    anyAmount: 'ผู้จ่ายกรอกเอง',
    unknown: 'ไม่รู้จักรหัสนี้',
    copy: 'คัดลอก',
    copied: 'คัดลอกแล้ว',
    json: 'ดูผลลัพธ์แบบ JSON',
    failed: 'อ่านรูปไม่ได้',
  },
  en: {
    title: 'Read the QR on a Thai transfer slip',
    lede: 'Get the bank, transaction reference and CRC status from the slip QR. Everything runs in your browser; the image never leaves your device.',
    drop: 'Drop a slip image here, or click to choose a file',
    dropHint: 'You can also paste with Ctrl+V / ⌘V · PNG, JPEG, WebP',
    sampleSlip: 'Sample slip',
    sampleChat: 'Chat screenshot',
    sampleTwo: 'Two QR codes',
    sampleEdited: 'Edited slip',
    pasteToggle: 'Already have the QR text? Paste it here',
    note: 'A valid QR with a matching CRC means the payload was not edited. It does not mean the money arrived; anyone can make a QR like this. When money is involved, check the reference with your bank or a slip verification service, and block reused slips.',
    footer: 'Built with',
    reading: 'Reading...',
    ok: 'Well-formed slip',
    okHint: 'Next step: confirm the reference with your bank',
    CRC_MISMATCH: 'CRC mismatch',
    CRC_MISMATCHHint: 'The QR content was edited or misread. Do not accept this slip.',
    PROMPTPAY_QR: 'This is a payment QR, not a slip',
    PROMPTPAY_QRHint:
      'This kind of QR is scanned to pay. The customer may have sent the wrong image.',
    NO_QR_FOUND: 'No QR code found',
    NO_QR_FOUNDHint:
      'Try cropping closer to the QR, or use the original file instead of a compressed copy.',
    other: 'Not a slip QR',
    bank: 'Sending bank',
    transRef: 'Trans ref',
    wallet: 'Wallet',
    event: 'Event',
    transactionId: 'Transaction',
    date: 'Date',
    country: 'Country',
    crc: 'CRC',
    warnings: 'Notes',
    codes: 'QR codes',
    payTo: 'Pay to',
    amount: 'Amount',
    anyAmount: 'payer enters it',
    unknown: 'unknown code',
    copy: 'Copy',
    copied: 'Copied',
    json: 'Show JSON result',
    failed: 'Could not read the image',
  },
}

let lang = 'th'
try {
  lang = localStorage.getItem('lang') ?? (navigator.language.startsWith('th') ? 'th' : 'en')
} catch {
  lang = navigator.language.startsWith('th') ? 'th' : 'en'
}
const t = (key) => text[lang][key] ?? text.en[key] ?? key

let last = null

function applyLang() {
  document.documentElement.lang = lang
  for (const node of document.querySelectorAll('[data-i18n]'))
    node.textContent = t(node.dataset.i18n)
  for (const b of document.querySelectorAll('[data-lang]')) {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang))
  }
  if (last) render(last.result, last.image)
}

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props)
  node.append(...children.filter((c) => c !== null && c !== undefined))
  return node
}

const $result = document.getElementById('result')
const $card = document.getElementById('card')
const $canvas = document.getElementById('canvas')
const $preview = $canvas.parentElement

function status(result) {
  if (result.ok) return ['ok', t('ok'), t('okHint')]
  if (result.code === 'CRC_MISMATCH') return ['bad', t('CRC_MISMATCH'), t('CRC_MISMATCHHint')]
  if (result.code === 'PROMPTPAY_QR') return ['warn', t('PROMPTPAY_QR'), t('PROMPTPAY_QRHint')]
  if (result.code === 'NO_QR_FOUND') return ['warn', t('NO_QR_FOUND'), t('NO_QR_FOUNDHint')]
  return ['warn', t('other'), result.message]
}

function copyButton(value) {
  const b = el('button', { className: 'btn copy', type: 'button', textContent: t('copy') })
  b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(value)
      b.textContent = t('copied')
    } catch {
      b.textContent = value
    }
  })
  return b
}

function slipRows(slip) {
  const rows = []
  if (slip.kind === 'bank') {
    const bank = slip.bank
      ? `${slip.sendingBank} · ${slip.bank.abbr} · ${lang === 'th' ? slip.bank.nameTh : slip.bank.nameEn}`
      : `${slip.sendingBank} (${t('unknown')})`
    rows.push([t('bank'), bank])
    rows.push([
      t('transRef'),
      el(
        'span',
        {},
        el('span', { className: 'mono', textContent: slip.transRef }),
        copyButton(slip.transRef),
      ),
    ])
    if (slip.country) rows.push([t('country'), slip.country])
  } else {
    rows.push([t('wallet'), 'TrueMoney Wallet'])
    rows.push([t('event'), slip.eventType])
    rows.push([
      t('transactionId'),
      el(
        'span',
        {},
        el('span', { className: 'mono', textContent: slip.transactionId }),
        copyButton(slip.transactionId),
      ),
    ])
    rows.push([t('date'), slip.date.replace(/^(\d\d)(\d\d)(\d{4})$/, '$1/$2/$3')])
  }
  const crc = slip.crc.valid
    ? `✓ ${slip.crc.actual}`
    : `✗ ${slip.crc.actual} → ${slip.crc.expected}`
  rows.push([t('crc'), el('span', { className: 'mono', textContent: crc })])
  if (slip.warnings.length) rows.push([t('warnings'), slip.warnings.join('; ')])
  return rows
}

function promptPayRows(result) {
  const payload = result.codes?.map((c) => c.text).find((s) => parsePromptPay(s).ok)
  const pp = payload ? parsePromptPay(payload) : null
  if (!pp?.ok) return []
  const { recipient, biller, amount } = pp.qr
  const rows = []
  if (recipient)
    rows.push([t('payTo'), `${recipient.mobile ?? recipient.value} (${recipient.type})`])
  if (biller) rows.push([t('payTo'), `${biller.billerId} / ${biller.ref1 ?? ''}`])
  rows.push([t('amount'), amount === undefined ? t('anyAmount') : amount.toFixed(2)])
  return rows
}

function render(result, image) {
  last = { result, image }
  const [kind, title, hint] = status(result)
  const slip = result.slip
  const rows = slip ? slipRows(slip) : result.code === 'PROMPTPAY_QR' ? promptPayRows(result) : []
  if (result.codes && result.codes.length > 1) rows.push([t('codes'), String(result.codes.length)])

  $card.replaceChildren(
    el('span', { className: `status ${kind}`, textContent: title }),
    el('p', { className: 'message', textContent: hint }),
    rows.length
      ? el('dl', {}, ...rows.flatMap(([k, v]) => [el('dt', { textContent: k }), el('dd', {}, v)]))
      : null,
    el(
      'details',
      { className: 'json' },
      el('summary', { textContent: t('json') }),
      el('pre', { textContent: JSON.stringify(result, null, 2) }),
    ),
  )

  $preview.hidden = !image
  if (image) draw(image, result.codes ?? [])
  $result.hidden = false
  $result.dataset.state = result.ok ? 'ok' : result.code
}

function draw(image, codes) {
  const scale = Math.min(1, 1400 / Math.max(image.width, image.height))
  $canvas.width = Math.round(image.width * scale)
  $canvas.height = Math.round(image.height * scale)
  const ctx = $canvas.getContext('2d')
  ctx.drawImage(image, 0, 0, $canvas.width, $canvas.height)
  for (const code of codes) {
    const { topLeft, topRight, bottomRight, bottomLeft } = code.position
    ctx.beginPath()
    for (const p of [topLeft, topRight, bottomRight, bottomLeft])
      ctx.lineTo(p.x * scale, p.y * scale)
    ctx.closePath()
    ctx.lineWidth = Math.max(3, $canvas.width / 160)
    ctx.strokeStyle = code.result.ok
      ? '#0f9d7a'
      : code.result.code === 'CRC_MISMATCH'
        ? '#d92d20'
        : '#e59a00'
    ctx.stroke()
  }
}

async function handleBlob(blob) {
  $card.replaceChildren(el('p', { className: 'message', textContent: t('reading') }))
  $result.hidden = false
  try {
    const [image, result] = await Promise.all([createImageBitmap(blob), readSlip(blob)])
    render(result, image)
  } catch (err) {
    render({ ok: false, code: 'NO_QR_FOUND', message: `${t('failed')}: ${err.message}` }, null)
  }
}

function handleText(value) {
  if (value.trim()) render(parseSlip(value), null)
}

const $drop = document.getElementById('drop')
const $file = document.getElementById('file')
$file.addEventListener('change', () => $file.files?.[0] && handleBlob($file.files[0]))
$drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    $file.click()
  }
})
for (const type of ['dragenter', 'dragover']) {
  $drop.addEventListener(type, (e) => {
    e.preventDefault()
    $drop.classList.add('over')
  })
}
for (const type of ['dragleave', 'drop']) {
  $drop.addEventListener(type, () => $drop.classList.remove('over'))
}
$drop.addEventListener('drop', (e) => {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) handleBlob(file)
})

document.addEventListener('paste', (e) => {
  const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
  if (file) {
    e.preventDefault()
    handleBlob(file)
  }
})

const $payload = document.getElementById('payload')
$payload.addEventListener('input', () => handleText($payload.value))

async function loadSample(name) {
  const res = await fetch(`./samples/${encodeURIComponent(name)}`)
  if (res.ok) await handleBlob(await res.blob())
}
for (const b of document.querySelectorAll('[data-sample]')) {
  b.addEventListener('click', () => loadSample(b.dataset.sample))
}

for (const b of document.querySelectorAll('[data-lang]')) {
  b.addEventListener('click', () => {
    lang = b.dataset.lang
    try {
      localStorage.setItem('lang', lang)
    } catch {}
    applyLang()
  })
}

applyLang()
const sample = new URLSearchParams(location.hash.slice(1)).get('sample')
if (sample) loadSample(sample)
