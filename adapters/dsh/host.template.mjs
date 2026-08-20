/** Host-side entry for the DeepSeek Time adapter. */
export const name = 'deepseek-time'
export const inject = ['webServer', 'credentials']

const BALANCE_URL = 'https://api.deepseek.com/user/balance'
const BALANCE_TTL_MS = 5 * 60 * 1000
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}

let cachedBalance = null
let balanceInFlight = null

async function requestBalance(ctx) {
  let credential
  try {
    credential = await ctx.credentials.resolve('DEEPSEEK_API_KEY')
  } catch {
    return { ok: false, code: 'credential-unavailable' }
  }
  if (!credential?.value) return { ok: false, code: 'credential-missing' }

  try {
    const response = await fetch(BALANCE_URL, {
      headers: { Authorization: `Bearer ${credential.value}` },
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) return { ok: false, code: 'upstream-unavailable' }
    const body = await response.json()
    const info = Array.isArray(body?.balance_infos) ? body.balance_infos[0] : undefined
    const totalBalance = Number(info?.total_balance)
    if (!info || !Number.isFinite(totalBalance)) return { ok: false, code: 'invalid-response' }
    return {
      ok: true,
      totalBalance,
      currency: typeof info.currency === 'string' ? info.currency : 'CNY',
      updatedAt: new Date().toISOString(),
    }
  } catch {
    return { ok: false, code: 'upstream-unavailable' }
  }
}

function getBalance(ctx) {
  const now = Date.now()
  if (cachedBalance && now - cachedBalance.at < BALANCE_TTL_MS) return Promise.resolve(cachedBalance.value)
  if (balanceInFlight) return balanceInFlight
  balanceInFlight = requestBalance(ctx)
    .then((value) => {
      if (value.ok) cachedBalance = { at: Date.now(), value }
      return value
    })
    .finally(() => { balanceInFlight = null })
  return balanceInFlight
}

function isSameOriginRequest(req) {
  const origin = req.headers?.origin
  const host = req.headers?.host
  if (origin) {
    try {
      const url = new URL(origin)
      if (url.host !== host) return false
    } catch {
      return false
    }
  }
  return true
}

export function apply(ctx) {
  const dispose = ctx.webServer.register({
    kind: 'exact',
    path: '/deepseek-time/balance.json',
    handler: async (req, res) => {
      if (req.method !== 'GET' || !isSameOriginRequest(req)) {
        res.writeHead(403, JSON_HEADERS)
        res.end(JSON.stringify({ ok: false, code: 'forbidden' }))
        return
      }
      const value = await getBalance(ctx)
      res.writeHead(200, JSON_HEADERS)
      res.end(JSON.stringify(value))
    },
  })
  ctx.effect(() => dispose)
}
