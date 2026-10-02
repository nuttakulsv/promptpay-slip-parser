import { afterEach, describe, expect, it, vi } from 'vitest'
// @ts-expect-error plain JS example without types
import { kbankVerifier, scbVerifier } from '../examples/verifiers.js'
import { parseSlip, verifySlip, type Slip } from '../src/index.js'
import { bankSlipPayload } from './helpers/payloads.js'

const slip = (parseSlip(bankSlipPayload('004', 'REF123')) as { ok: true; slip: Slip }).slip
const data = {
  sendingBank: '004',
  receivingBank: '014',
  transRef: 'REF123',
  transDate: '20261002',
  transTime: '10:42:00',
  amount: 1250,
  sender: { displayName: 'SAMPLE SENDER', account: { type: 'BANKAC', value: 'xxx-x-x1234-x' } },
  receiver: { displayName: 'SAMPLE SHOP', account: { type: 'BANKAC', value: 'xxx-x-x5678-x' } },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('examples/verifiers.js', () => {
  it('maps an SCB response and checks it', async () => {
    const fetchMock = vi.fn(async () => Response.json({ status: { code: 1000 }, data }))
    vi.stubGlobal('fetch', fetchMock)
    const verifier = scbVerifier({ apiKey: 'key', getToken: async () => 'token' })
    const result = await verifySlip(slip, verifier, {
      amount: 1250,
      receiverAccount: '123-4-55678-9',
      maxAgeMinutes: 30,
      now: new Date('2026-10-02T10:50:00+07:00'),
    })
    expect(result.ok).toBe(true)
    const [url] = fetchMock.mock.calls[0] as unknown as [URL]
    expect(String(url)).toBe(
      'https://api.partners.scb/partners/v1/payment/billpayment/transactions/REF123?sendingBank=004',
    )
  })

  it('maps a KBank response', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ statusCode: '0000', data }))
    const verifier = kbankVerifier({ getToken: async () => 'token', fetchImpl })
    const transfer = await verifier(slip)
    expect(transfer.paidAt.toISOString()).toBe('2026-10-02T03:42:00.000Z')
    expect(transfer.receiver.account).toBe('xxx-x-x5678-x')
  })
})
