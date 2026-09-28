/**
 * Asan server — serves the built site (dist/) and the login OTP API.
 * No dependencies beyond Node.js 20+.
 *
 *   POST /api/otp/send    { nationalCode, mobile }  → { ttl }
 *   POST /api/otp/verify  { nationalCode, mobile, code } → { user }
 *   POST /api/access/send   { economicNumber }        → { ttl }        (needs login session)
 *   POST /api/access/verify { economicNumber, code }  → { memoryId }   (needs login session)
 *   GET  /api/files       → { files } | 501 not_configured   (needs login session)
 *   GET  /api/health      → { ok, sms, inquiry }
 *
 * Configuration comes from `.env` next to package.json (see .env.example).
 */
import http from 'node:http'
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSmsProvider } from './sms.mjs'
import { createInquiry } from './inquiry.mjs'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
try {
  process.loadEnvFile(join(ROOT, '.env'))
} catch {
  /* no .env — rely on real environment variables */
}
const env = process.env

const PORT = Number(env.PORT || 3000)
const HOST = env.HOST || '127.0.0.1'
const OTP_TTL = Number(env.OTP_TTL_SECONDS || 120)
const MAX_ATTEMPTS = Number(env.OTP_MAX_ATTEMPTS || 5)
const IP_SENDS_PER_HOUR = Number(env.OTP_IP_SENDS_PER_HOUR || 10)
const MOBILE_SENDS_PER_DAY = Number(env.OTP_MOBILE_SENDS_PER_DAY || 8)
const TRUST_PROXY = env.TRUST_PROXY === 'true'
const SECRET = env.OTP_SECRET || randomInt(1e9).toString(36) + Date.now().toString(36)
const DIST = join(ROOT, 'dist')

const sms = createSmsProvider(env)
const inquiry = createInquiry(env)
const SESSION_MINUTES = Number(env.SESSION_MINUTES || 60)

/* ───────────── validation ───────────── */

const isMobile = (m) => typeof m === 'string' && /^09\d{9}$/.test(m)
function isNationalCode(c) {
  if (typeof c !== 'string' || !/^\d{10}$/.test(c) || /^(\d)\1{9}$/.test(c)) return false
  const sum = [...c.slice(0, 9)].reduce((a, d, i) => a + Number(d) * (10 - i), 0)
  const r = sum % 11
  return Number(c[9]) === (r < 2 ? r : 11 - r)
}

/* ───────────── in-memory stores ───────────── */

/** mobile → { hash, nationalCode, expiresAt, sentAt, attempts } */
const otps = new Map()
/** key → timestamps[] (sliding windows) */
const hits = new Map()

const hashCode = (mobile, code) => createHash('sha256').update(`${SECRET}:${mobile}:${code}`).digest()

function countRecent(key, windowMs) {
  const now = Date.now()
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs)
  hits.set(key, list)
  return list.length
}
const record = (key) => hits.get(key)?.push(Date.now()) ?? hits.set(key, [Date.now()])

setInterval(() => {
  const now = Date.now()
  for (const [m, o] of otps) if (o.expiresAt < now - 60_000) otps.delete(m)
  for (const [m, o] of accessCodes) if (o.expiresAt < now - 60_000) accessCodes.delete(m)
  for (const [k, list] of hits) if (!list.some((t) => now - t < 86_400_000)) hits.delete(k)
}, 60_000).unref()

/* ───────────── login sessions (cookie → national code) ───────────── */

/** token → { nationalCode, mobile, expiresAt } */
const sessions = new Map()

function createSession(nationalCode, mobile) {
  const token = randomBytes(24).toString('base64url')
  sessions.set(token, { nationalCode, mobile, expiresAt: Date.now() + SESSION_MINUTES * 60_000 })
  return token
}

function getSession(req) {
  const m = /(?:^|;\s*)asan_sid=([\w-]+)/.exec(req.headers.cookie || '')
  const s = m && sessions.get(m[1])
  if (!s || s.expiresAt < Date.now()) return null
  s.expiresAt = Date.now() + SESSION_MINUTES * 60_000 // sliding expiry
  return s
}

function sessionCookie(req, token) {
  const secure = req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted
  return `asan_sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MINUTES * 60}${secure ? '; Secure' : ''}`
}

setInterval(() => {
  const now = Date.now()
  for (const [t, s] of sessions) if (s.expiresAt < now) sessions.delete(t)
}, 60_000).unref()

/* ───────────── Shahkar (mock until the real service is connected) ───────────── */

async function shahkarMatches(_nationalCode, mobile) {
  // Demo rule: a mobile ending in 0000 does not belong to the national code.
  return !mobile.endsWith('0000')
}

/* ───────────── handlers ───────────── */

async function sendOtp(body, ip) {
  const { nationalCode, mobile } = body
  if (!isNationalCode(nationalCode) || !isMobile(mobile)) return [400, { error: 'invalid_input' }]

  const existing = otps.get(mobile)
  const now = Date.now()
  if (existing && existing.expiresAt > now && existing.nationalCode === nationalCode) {
    // A live code was already sent — tell the client how long it has left instead of re-sending.
    return [200, { ttl: Math.ceil((existing.expiresAt - now) / 1000), reused: true }]
  }
  if (countRecent(`ip:${ip}`, 3_600_000) >= IP_SENDS_PER_HOUR || countRecent(`m:${mobile}`, 86_400_000) >= MOBILE_SENDS_PER_DAY) {
    return [429, { error: 'rate_limited' }]
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  try {
    await sms.sendOtp(mobile, code)
  } catch (e) {
    console.error(`[otp] send failed for ${mobile.slice(0, 4)}***${mobile.slice(-4)}:`, e.message)
    return [502, { error: 'service_unavailable' }]
  }
  record(`ip:${ip}`)
  record(`m:${mobile}`)
  otps.set(mobile, { hash: hashCode(mobile, code), nationalCode, expiresAt: now + OTP_TTL * 1000, sentAt: now, attempts: 0 })
  return [200, { ttl: OTP_TTL }]
}

async function verifyOtp(body) {
  const { nationalCode, mobile, code } = body
  if (!isNationalCode(nationalCode) || !isMobile(mobile) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return [400, { error: 'otp_invalid' }]
  }
  const o = otps.get(mobile)
  if (!o || o.nationalCode !== nationalCode || o.expiresAt < Date.now()) return [400, { error: 'otp_expired' }]
  if (o.attempts >= MAX_ATTEMPTS) return [429, { error: 'too_many_attempts' }]
  o.attempts++
  if (!timingSafeEqual(o.hash, hashCode(mobile, code))) {
    return [400, { error: o.attempts >= MAX_ATTEMPTS ? 'too_many_attempts' : 'otp_invalid' }]
  }
  otps.delete(mobile)

  if (!(await shahkarMatches(nationalCode, mobile))) return [400, { error: 'shahkar_mismatch' }]
  return [200, { user: { fullName: env.DEMO_USER_NAME || '', nationalCode, mobile } }]
}

async function listFiles(req) {
  const session = getSession(req)
  if (!session) return [401, { error: 'unauthorized' }]
  if (!inquiry.configured) return [501, { error: 'not_configured' }]
  try {
    return [200, { files: await inquiry.listFiles(session.nationalCode) }]
  } catch {
    return [502, { error: 'service_unavailable' }]
  }
}

/* ───────────── access code for Keysun (second SMS) ───────────── */

/** One Jalali year from today, e.g. "1406/07/06" (Latin digits). */
function accessExpiry(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Tehran' }).formatToParts(now)
  const get = (t) => Number(parts.find((p) => p.type === t)?.value)
  const m = get('month')
  const d = Math.min(get('day'), m === 12 ? 29 : 31)
  return `${get('year') + 1}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`
}

function accessSmsText(economicNumber, expiry, code) {
  return [
    `مؤدی گرامی با شماره اقتصادی «${economicNumber}»، با دراختیار قرار دادن رمز زیر به «شرکت داده پردازی کیسان»، دسترسی های زیر تا تاریخ «${expiry}»، به این شرکت اعطا خواهد شد.`,
    'لیست دسترسی های درخواستی شما:',
    'دریافت شناسه یکتا حافظه مالیاتی',
    'مراقب سوءاستفاده سودجویان برای دسترسی به کارپوشه مالیاتی خود باشید.',
    `رمز: ${code}`,
  ].join('\n')
}

/** mobile → { hash, economicNumber, expiresAt, attempts } */
const accessCodes = new Map()

function sessionOwnsFile(session, economicNumber) {
  return typeof economicNumber === 'string' && /^\d{14}$/.test(economicNumber) && economicNumber.startsWith(session.nationalCode)
}

async function sendAccessCode(req, body) {
  const session = getSession(req)
  if (!session) return [401, { error: 'unauthorized' }]
  const { economicNumber } = body
  if (!sessionOwnsFile(session, economicNumber)) return [400, { error: 'invalid_input' }]
  const { mobile } = session
  const now = Date.now()
  const live = accessCodes.get(mobile)
  if (live && live.expiresAt > now && live.economicNumber === economicNumber) {
    return [200, { ttl: Math.ceil((live.expiresAt - now) / 1000), reused: true }]
  }
  if (countRecent(`acc:${mobile}`, 86_400_000) >= MOBILE_SENDS_PER_DAY) return [429, { error: 'rate_limited' }]
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  try {
    await sms.sendText(mobile, accessSmsText(economicNumber, accessExpiry(), code))
  } catch (e) {
    console.error(`[access] send failed for ${mobile.slice(0, 4)}***${mobile.slice(-4)}:`, e.message)
    return [502, { error: 'service_unavailable' }]
  }
  record(`acc:${mobile}`)
  accessCodes.set(mobile, { hash: hashCode(`acc:${mobile}`, code), economicNumber, expiresAt: now + OTP_TTL * 1000, attempts: 0 })
  return [200, { ttl: OTP_TTL }]
}

async function verifyAccessCode(req, body) {
  const session = getSession(req)
  if (!session) return [401, { error: 'unauthorized' }]
  const { economicNumber, code } = body
  if (!sessionOwnsFile(session, economicNumber) || typeof code !== 'string' || !/^\d{6}$/.test(code)) return [400, { error: 'otp_invalid' }]
  const a = accessCodes.get(session.mobile)
  if (!a || a.economicNumber !== economicNumber || a.expiresAt < Date.now()) return [400, { error: 'otp_expired' }]
  if (a.attempts >= MAX_ATTEMPTS) return [429, { error: 'too_many_attempts' }]
  a.attempts++
  if (!timingSafeEqual(a.hash, hashCode(`acc:${session.mobile}`, code))) {
    return [400, { error: a.attempts >= MAX_ATTEMPTS ? 'too_many_attempts' : 'otp_invalid' }]
  }
  accessCodes.delete(session.mobile)
  // Demo: the memory ID would come from the tax organisation once the real service exists.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const memoryId = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('')
  return [200, { memoryId }]
}

/* ───────────── http plumbing ───────────── */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
}

function send(res, status, payload, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers })
  res.end(JSON.stringify(payload))
}

async function readJson(req) {
  let size = 0
  const chunks = []
  for await (const c of req) {
    size += c.length
    if (size > 10_000) throw new Error('too large')
    chunks.push(c)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x')
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '')
  let file = join(DIST, path)
  if (!file.startsWith(DIST)) return send(res, 403, { error: 'forbidden' })
  try {
    if (!(await stat(file)).isFile()) throw new Error()
  } catch {
    file = join(DIST, 'index.html') // single-page app fallback
    path = 'index.html'
  }
  try {
    const data = await readFile(file)
    const immutable = path.startsWith('assets/')
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    })
    res.end(data)
  } catch {
    send(res, 404, { error: 'not_found', hint: 'Run `npm run build` first.' })
  }
}

const server = http.createServer(async (req, res) => {
  const ip = (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?'
  try {
    if (req.url?.startsWith('/api/')) {
      if (req.method === 'GET' && req.url === '/api/health') return send(res, 200, { ok: true, sms: sms.name, inquiry: inquiry.configured, tunnel: inquiry.viaTunnel })
      if (req.method === 'GET' && req.url === '/api/files') return send(res, ...(await listFiles(req)))
      if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' })
      const body = await readJson(req)
      if (req.url === '/api/otp/send') return send(res, ...(await sendOtp(body, ip)))
      if (req.url === '/api/access/send') return send(res, ...(await sendAccessCode(req, body)))
      if (req.url === '/api/access/verify') return send(res, ...(await verifyAccessCode(req, body)))
      if (req.url === '/api/otp/verify') {
        const [status, payload] = await verifyOtp(body)
        if (status !== 200) return send(res, status, payload)
        const token = createSession(payload.user.nationalCode, payload.user.mobile)
        return send(res, 200, payload, { 'Set-Cookie': sessionCookie(req, token) })
      }
      return send(res, 404, { error: 'not_found' })
    }
    return serveStatic(req, res)
  } catch (e) {
    console.error('[server]', e)
    return send(res, 400, { error: 'bad_request' })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Asan server on http://${HOST}:${PORT}  (sms: ${sms.name}, inquiry: ${inquiry.configured ? (inquiry.viaTunnel ? 'on via tunnel' : 'on') : 'off → demo files'})`)
})
