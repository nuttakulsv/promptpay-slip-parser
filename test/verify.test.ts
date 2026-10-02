import { describe, expect, it } from 'vitest'
import {
  checkTransfer,
  matchesAccount,
  parseSlip,
  verifySlip,
  type Slip,
  type Verifier,
} from '../src/index.js'
import { bankSlipPayload } from './helpers/payloads.js'

const now = new Date('2026-10-02T10:00:00+07:00')
const notFound: Verifier = async () => null
const slip = (parseSlip(bankSlipPayload('014', 'SCB000111')) as { ok: true; slip: Slip }).slip

describe('matchesAccount', () => {
  it('compares visible digits of a masked account', () => {
    expect(matchesAccount('xxx-x-x5678-x', '123-4-55678-9')).toBe(true)
    expect(matchesAccount('xxx-x-x5678-x', '123-4-55679-9')).toBe(false)
    expect(matchesAccount('XXX-XXX-3333', '081-222-3333')).toBe(true)
    expect(matchesAccount('xxx-xxx-3333', '3333')).toBe(false)
    expect(matchesAccount('xxxxxx', '1234567890')).toBe(false)
    expect(matchesAccount('1234567890', '123-456-7890')).toBe(true)
  })
})

describe('checkTransfer', () => {
  const transfer = {
    amount: 150,
    paidAt: new Date('2026-10-02T09:50:00+07:00'),
    receiver: { account: 'xxx-x-x5678-x' },
  }

  it('passes when everything matches', () => {
    expect(
      checkTransfer(transfer, {
        amount: 150.0,
        receiverAccount: '1234556789',
        maxAgeMinutes: 30,
        now,
      }),
    ).toEqual([])
  })

  it('lists every problem', () => {
    const problems = checkTransfer(transfer, {
      amount: 1500,
      receiverAccount: '9999999999',
      maxAgeMinutes: 5,
      now,
    })
    expect(problems).toHaveLength(3)
    expect(problems[0]).toBe('Amount is 150.00, expected 1500.00')
  })

  it('compares amounts in satang', () => {
    expect(checkTransfer({ amount: 0.1 + 0.2 }, { amount: 0.3 })).toEqual([])
  })

  it('complains when the provider leaves out fields you asked to check', () => {
    expect(checkTransfer({ amount: 1 }, { receiverAccount: '1', maxAgeMinutes: 1 })).toHaveLength(2)
  })

  it('rejects transfers dated in the future', () => {
    const future = { amount: 1, paidAt: new Date(now.getTime() + 60 * 60_000) }
    expect(checkTransfer(future, { maxAgeMinutes: 10, now })).toEqual([
      'Transfer time is in the future',
    ])
  })
})

describe('verifySlip', () => {
  it('returns NOT_FOUND when the verifier finds nothing', async () => {
    expect(await verifySlip(slip, notFound)).toEqual({ ok: false, reason: 'NOT_FOUND' })
  })

  it('passes the slip to the verifier and checks the result', async () => {
    const seen: string[] = []
    const verifier: Verifier = async (s) => {
      if (s.kind === 'bank') seen.push(s.transRef)
      return { amount: 99, paidAt: now }
    }
    expect((await verifySlip(slip, verifier, { amount: 99, now })).ok).toBe(true)
    expect(await verifySlip(slip, verifier, { amount: 100, now })).toMatchObject({
      ok: false,
      reason: 'MISMATCH',
    })
    expect(seen).toEqual(['SCB000111', 'SCB000111'])
  })
})
