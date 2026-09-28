/**
 * SMS providers. Each one exposes `sendOtp(mobile, code)` (panel's own OTP template)
 * and `sendText(mobile, text)` (free text), and throws on failure.
 *
 *  - parsgreen: https://sms.parsgreen.ir  (Apiv2/Message/SendOtp)
 *  - console:   prints the code to the server log — for local development only
 */

const TIMEOUT_MS = 10_000

async function postJson(url, headers, body) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const text = await res.text()
    let data = null
    try {
      data = JSON.parse(text)
    } catch {
      /* non-JSON error page */
    }
    return { status: res.status, data, text }
  } finally {
    clearTimeout(timer)
  }
}

function parsgreen(env) {
  const apiKey = env.PARSGREEN_API_KEY
  if (!apiKey) throw new Error('PARSGREEN_API_KEY is not set in .env')
  const baseUrl = (env.PARSGREEN_BASE_URL || 'https://sms.parsgreen.ir').replace(/\/$/, '')
  const addName = env.PARSGREEN_ADD_NAME !== 'false'

  return {
    name: 'parsgreen',
    async sendOtp(mobile, code) {
      const { status, data, text } = await postJson(
        `${baseUrl}/Apiv2/Message/SendOtp`,
        { Authorization: `basic apikey:${apiKey}` },
        { Mobile: mobile, SmsCode: code, AddName: addName },
      )
      if (status !== 200 || !data || data.R_Success !== true) {
        const reason = data ? `R_Code=${data.R_Code} ${data.R_Message ?? ''}` : text.slice(0, 200)
        throw new Error(`Parsgreen SendOtp failed (HTTP ${status}): ${reason}`)
      }
    },
    async sendText(mobile, text) {
      const { status, data, text: raw } = await postJson(
        `${baseUrl}/Apiv2/Message/SendSms`,
        { Authorization: `basic apikey:${apiKey}` },
        { SmsBody: text, Mobiles: [mobile], SmsNumber: env.PARSGREEN_SMS_NUMBER || '' },
      )
      const ok = status === 200 && data && (data.R_Success === true || Number(data.SuccessCount) > 0)
      if (!ok) {
        const reason = data ? `R_Code=${data.R_Code} ${data.R_Message ?? ''} SuccessCount=${data.SuccessCount}` : raw.slice(0, 200)
        throw new Error(`Parsgreen SendSms failed (HTTP ${status}): ${reason}`)
      }
    },
  }
}

function consoleProvider() {
  return {
    name: 'console',
    async sendOtp(mobile, code) {
      console.log(`[sms:console] OTP for ${mobile}: ${code}`)
    },
    async sendText(mobile, text) {
      console.log(`[sms:console] text for ${mobile}:\n${text}`)
    },
  }
}

export function createSmsProvider(env) {
  const kind = (env.SMS_PROVIDER || 'console').toLowerCase()
  if (kind === 'parsgreen') return parsgreen(env)
  if (kind === 'console') return consoleProvider()
  throw new Error(`Unknown SMS_PROVIDER "${kind}". Use "parsgreen" or "console".`)
}
