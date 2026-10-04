/**
 * SMS providers. Each one exposes `sendOtp(mobile, code)` (panel's own OTP template)
 * and `sendText(mobile, text)` (free text), and throws on failure.
 *
 *  - parsgreen: https://sms.parsgreen.ir  (Apiv2/Message/SendOtp)
 *  - console:   prints the code to the server log — for local development only
 */

import http from 'node:http'
import https from 'node:https'

const TIMEOUT_MS = 10_000

/**
 * POST JSON. With `tunnel` ("127.0.0.1:9102") the connection goes into an SSH reverse
 * tunnel opened from a machine in Iran, while the Host header and TLS name stay those
 * of the real URL — the panel only answers Iranian IPs (see docs/relay-fa.md).
 */
function postJson(url, headers, body, tunnel = '') {
  const u = new URL(url)
  const secure = u.protocol === 'https:'
  const [tHost, tPort] = tunnel ? tunnel.split(':') : []
  const data = Buffer.from(JSON.stringify(body))
  return new Promise((resolve, reject) => {
    const req = (secure ? https : http).request(
      {
        host: tHost || u.hostname,
        port: Number(tPort) || Number(u.port) || (secure ? 443 : 80),
        path: u.pathname + u.search,
        method: 'POST',
        servername: secure ? u.hostname : undefined,
        headers: { Host: u.host, 'Content-Type': 'application/json', 'Content-Length': data.length, ...headers },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          let json = null
          try {
            json = JSON.parse(text)
          } catch {
            /* non-JSON error page */
          }
          resolve({ status: res.statusCode, data: json, text })
        })
      },
    )
    req.on('timeout', () => req.destroy(new Error(`no answer from the SMS panel in ${TIMEOUT_MS / 1000}s${tunnel ? ' (via tunnel)' : ''}`)))
    req.on('error', (e) => reject(e.code === 'ECONNREFUSED' && tunnel ? new Error('SMS tunnel is not connected (ECONNREFUSED)') : e))
    req.end(data)
  })
}

function parsgreen(env) {
  const apiKey = env.PARSGREEN_API_KEY
  if (!apiKey) throw new Error('PARSGREEN_API_KEY is not set in .env')
  const baseUrl = (env.PARSGREEN_BASE_URL || 'https://sms.parsgreen.ir').replace(/\/$/, '')
  const addName = env.PARSGREEN_ADD_NAME !== 'false'
  const tunnel = (env.PARSGREEN_TUNNEL || '').trim()

  return {
    name: tunnel ? 'parsgreen via tunnel' : 'parsgreen',
    async sendOtp(mobile, code) {
      const { status, data, text } = await postJson(
        `${baseUrl}/Apiv2/Message/SendOtp`,
        { Authorization: `basic apikey:${apiKey}` },
        { Mobile: mobile, SmsCode: code, AddName: addName },
        tunnel,
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
        tunnel,
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
