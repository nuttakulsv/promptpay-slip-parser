import type { Slip } from './slip.js'

/** What a bank API or slip checking service tells you about a transfer. */
export interface Transfer {
  transRef?: string
  /** Amount in baht */
  amount: number
  paidAt?: Date
  sender?: { name?: string; account?: string }
  /** `account` may be masked, e.g. "xxx-x-x1234-x" or "xxx-xxx-3333" */
  receiver?: { name?: string; account?: string }
  /** The provider's original response, kept for logging */
  raw?: unknown
}

/** Look a slip up with your bank or provider. Return `null` when the transfer does not exist. */
export type Verifier = (slip: Slip) => Promise<Transfer | null>

export interface Expectations {
  /** Exact amount in baht */
  amount?: number
  /** Your receiving account or PromptPay id; compared against the masked value from the provider */
  receiverAccount?: string
  /** Reject transfers older than this */
  maxAgeMinutes?: number
  now?: Date
}

export type VerifyResult =
  | { ok: true; transfer: Transfer }
  | { ok: false; reason: 'NOT_FOUND' }
  | { ok: false; reason: 'MISMATCH'; problems: string[]; transfer: Transfer }

export async function verifySlip(
  slip: Slip,
  verifier: Verifier,
  expect: Expectations = {},
): Promise<VerifyResult> {
  const transfer = await verifier(slip)
  if (!transfer) return { ok: false, reason: 'NOT_FOUND' }
  const problems = checkTransfer(transfer, expect)
  return problems.length
    ? { ok: false, reason: 'MISMATCH', problems, transfer }
    : { ok: true, transfer }
}

/** Returns a list of human-readable problems, empty when everything matches. */
export function checkTransfer(transfer: Transfer, expect: Expectations): string[] {
  const problems: string[] = []

  if (
    expect.amount !== undefined &&
    Math.round(transfer.amount * 100) !== Math.round(expect.amount * 100)
  ) {
    problems.push(`Amount is ${transfer.amount.toFixed(2)}, expected ${expect.amount.toFixed(2)}`)
  }

  if (expect.receiverAccount !== undefined) {
    const masked = transfer.receiver?.account
    if (!masked) problems.push('Provider did not return the receiver account')
    else if (!matchesAccount(masked, expect.receiverAccount)) {
      problems.push(`Receiver account ${masked} does not match ${expect.receiverAccount}`)
    }
  }

  if (expect.maxAgeMinutes !== undefined) {
    if (!transfer.paidAt) problems.push('Provider did not return the transfer time')
    else {
      const ageMinutes = ((expect.now ?? new Date()).getTime() - transfer.paidAt.getTime()) / 60_000
      if (ageMinutes > expect.maxAgeMinutes) {
        problems.push(
          `Transfer is ${Math.floor(ageMinutes)} minutes old, limit is ${expect.maxAgeMinutes}`,
        )
      } else if (ageMinutes < -5) {
        problems.push('Transfer time is in the future')
      }
    }
  }

  return problems
}

/**
 * Compare a masked account ("xxx-x-x1234-x") with a full one ("123-4-51234-6").
 * Separators are ignored, values are right-aligned, and every visible digit must match.
 */
export function matchesAccount(masked: string, account: string): boolean {
  const m = masked.toLowerCase().replace(/[^0-9x*•]/g, '')
  const a = account.replace(/\D/g, '')
  if (!/\d/.test(m) || m.length > a.length) return false
  const offset = a.length - m.length
  return [...m].every((ch, i) => !/\d/.test(ch) || ch === a[offset + i])
}
