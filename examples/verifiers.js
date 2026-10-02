// Verifier examples for bank Open APIs. Field names follow the slip verification
// response that SCB and KBank share (sendingBank, transRef, transDate, amount,
// sender/receiver.account.value). Check your bank's current docs before going live:
// these APIs need a merchant account, OAuth credentials and, for KBank, mutual TLS.

/**
 * SCB Open API: GET /v1/payment/billpayment/transactions/{transRef}?sendingBank=xxx
 * @param {{ baseUrl?: string, apiKey: string, getToken: () => Promise<string> }} opts
 * @returns {import('promptpay-slip-parser').Verifier}
 */
export function scbVerifier({ baseUrl = 'https://api.partners.scb/partners/', apiKey, getToken }) {
  return async (slip) => {
    if (slip.kind !== 'bank') return null
    const url = new URL(
      `v1/payment/billpayment/transactions/${encodeURIComponent(slip.transRef)}`,
      baseUrl,
    )
    url.searchParams.set('sendingBank', slip.sendingBank)
    const res = await fetch(url, {
      headers: {
        authorization: `Bearer ${await getToken()}`,
        resourceOwnerId: apiKey,
        requestUId: crypto.randomUUID(),
        'accept-language': 'EN',
      },
    })
    const body = await res.json()
    if (body.status?.code !== 1000) {
      if (res.status === 404 || res.status === 400) return null
      throw new Error(`SCB ${body.status?.code}: ${body.status?.description}`)
    }
    return toTransfer(body.data)
  }
}

/**
 * KBank Open API: POST /v1/verslip/kbank/verify
 * Requires the client certificate configured on your HTTP agent (mutual TLS).
 * @param {{ baseUrl?: string, getToken: () => Promise<string>, fetchImpl?: typeof fetch }} opts
 * @returns {import('promptpay-slip-parser').Verifier}
 */
export function kbankVerifier({
  baseUrl = 'https://openapi.kasikornbank.com/',
  getToken,
  fetchImpl = fetch,
}) {
  return async (slip) => {
    if (slip.kind !== 'bank') return null
    const res = await fetchImpl(new URL('v1/verslip/kbank/verify', baseUrl), {
      method: 'POST',
      headers: { authorization: `Bearer ${await getToken()}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        rqUID: crypto.randomUUID(),
        rqDt: new Date().toISOString(),
        data: { sendingBank: slip.sendingBank, transRef: slip.transRef },
      }),
    })
    const body = await res.json()
    if (body.statusCode !== '0000') {
      if (res.ok) return null
      throw new Error(`KBank ${body.statusCode}: ${body.statusMessage}`)
    }
    return toTransfer(body.data)
  }
}

/** transDate is yyyyMMdd and transTime is HH:mm:ss, both Bangkok time. */
function toTransfer(data) {
  const d = data.transDate
  const paidAt = new Date(
    `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${data.transTime}+07:00`,
  )
  return {
    transRef: data.transRef,
    amount: Number(data.amount),
    paidAt,
    sender: { name: data.sender?.displayName, account: data.sender?.account?.value },
    receiver: {
      name: data.receiver?.displayName,
      account: data.receiver?.account?.value || data.receiver?.proxy?.value,
    },
    raw: data,
  }
}

// Paid slip checking services work the same way: send `slip.raw` (the QR text)
// or the transRef, map their response into { amount, paidAt, receiver }.
export function genericVerifier({ url, apiKey }) {
  return async (slip) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ payload: slip.raw }),
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Verifier responded ${res.status}`)
    const body = await res.json()
    return {
      amount: Number(body.amount),
      paidAt: new Date(body.date),
      receiver: { account: body.receiver?.account },
      raw: body,
    }
  }
}
