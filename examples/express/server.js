import express from 'express'
import multer from 'multer'
import { createSlipGuard, verifySlip } from 'promptpay-slip-parser'
import { readSlip } from 'promptpay-slip-parser/image'

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// One instance only. With several instances, pass a Redis store (see ../redis-store.js).
const guard = createSlipGuard()

// Plug in your bank or provider here (see ../verifiers.js). Without one, slips are
// accepted as "pending" and someone still has to check the bank statement.
const verifier = null

app.post('/orders/:id/slip', upload.single('slip'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Send the slip image in the "slip" field' })

  const read = await readSlip(req.file.buffer)
  if (!read.ok) return res.status(422).json({ error: read.code, message: read.message })

  const claim = await guard.claim(read.slip)
  if (!claim.ok)
    return res.status(409).json({ error: 'DUPLICATE_SLIP', message: 'This slip was already used' })

  if (!verifier) {
    return res.status(202).json({ status: 'pending', slip: summary(read.slip) })
  }

  const expectedAmount = 1250 // load from your order
  try {
    const result = await verifySlip(read.slip, verifier, {
      amount: expectedAmount,
      maxAgeMinutes: 60,
    })
    if (!result.ok) {
      if (result.reason === 'NOT_FOUND') await guard.release(read.slip)
      return res.status(422).json({ error: result.reason, problems: result.problems })
    }
    return res.json({ status: 'paid', slip: summary(read.slip), amount: result.transfer.amount })
  } catch (err) {
    // The provider failed, not the customer: let them try again later.
    await guard.release(read.slip)
    return res.status(503).json({ error: 'VERIFY_UNAVAILABLE', message: err.message })
  }
})

function summary(slip) {
  return slip.kind === 'bank'
    ? { bank: slip.bank?.abbr ?? slip.sendingBank, transRef: slip.transRef }
    : { wallet: 'truemoney', transactionId: slip.transactionId }
}

const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => console.log(`listening on http://localhost:${port}`))
