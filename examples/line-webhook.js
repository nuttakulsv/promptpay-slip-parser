// LINE Official Account bot: the customer sends a slip image in chat, the bot
// reads the QR, blocks reused slips and replies. No dependencies besides this package.
//
//   LINE_CHANNEL_SECRET=... LINE_CHANNEL_ACCESS_TOKEN=... node examples/line-webhook.js
//
// Set the webhook URL in the LINE Developers console to https://your-host/webhook.

import { createHmac, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import { createSlipGuard } from 'promptpay-slip-parser'
import { readSlip } from 'promptpay-slip-parser/image'

const secret = process.env.LINE_CHANNEL_SECRET
const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
if (!secret || !token) throw new Error('Set LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN')

const guard = createSlipGuard()

createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') return res.writeHead(404).end()

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = Buffer.concat(chunks)

  if (!validSignature(body, req.headers['x-line-signature'])) return res.writeHead(401).end()
  res.writeHead(200).end()

  for (const event of JSON.parse(body.toString()).events ?? []) {
    if (event.type === 'message' && event.message.type === 'image') {
      handleImage(event).catch((err) => console.error(err))
    }
  }
}).listen(Number(process.env.PORT ?? 3000))

async function handleImage(event) {
  const image = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content`, {
    headers: { authorization: `Bearer ${token}` },
  })
  const result = await readSlip(new Uint8Array(await image.arrayBuffer()))

  let text
  if (!result.ok) {
    text =
      result.code === 'NO_QR_FOUND'
        ? 'ไม่พบ QR บนสลิป รบกวนส่งรูปสลิปเต็มใบอีกครั้งครับ'
        : 'สลิปนี้อ่านไม่ได้หรือข้อมูลไม่ถูกต้อง รบกวนตรวจสอบอีกครั้งครับ'
  } else if (!(await guard.claim(result.slip)).ok) {
    text = 'สลิปนี้เคยใช้แจ้งชำระแล้วครับ'
  } else {
    // Verify with your bank here before confirming the order (see verifiers.js).
    text = 'ได้รับสลิปแล้ว กำลังตรวจสอบยอดเงินครับ'
  }

  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ replyToken: event.replyToken, messages: [{ type: 'text', text }] }),
  })
}

function validSignature(body, signature) {
  if (typeof signature !== 'string') return false
  const expected = createHmac('sha256', secret).update(body).digest()
  const given = Buffer.from(signature, 'base64')
  return given.length === expected.length && timingSafeEqual(given, expected)
}
