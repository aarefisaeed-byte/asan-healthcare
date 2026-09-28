import HOSPITALS from '../data/hospitals.json'

/**
 * Service layer. Everything the UI needs from the outside world goes through here,
 * so the mock implementations can later be swapped for real services
 * (Asan OTP, Shahkar, tax organisation, Keysun) without touching the screens.
 *
 * Login OTP goes through the real server in production builds (see server/).
 * Demo scenarios (mock mode — preview build, and still mocked parts in production):
 *  Login
 *  - OTP code 000000                → «کد نادرست است»
 *  - mobile ending in 0000          → Shahkar mismatch (mobile not owned by national code)
 *  - mobile 09129999999             → service outage while sending the code
 *  - mobile ending in 1111          → no tax files found (empty state)
 *  Permission to Keysun (preview only; production sends a real SMS)
 *  - access code 000000             → «کد نادرست است»
 *  Anything else succeeds.
 */

export type ApiErrorCode = 'otp_invalid' | 'otp_expired' | 'shahkar_mismatch' | 'service_unavailable' | 'rate_limited' | 'too_many_attempts'

export class ApiError extends Error {
  code: ApiErrorCode
  constructor(code: ApiErrorCode) {
    super(code)
    this.code = code
  }
}

export type User = { fullName: string; nationalCode: string; mobile: string }

export const OTP_LENGTH = 6
export const OTP_TTL_SECONDS = 120

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* ───────────────────────── Login ───────────────────────── */

/**
 * The production build talks to our server (/api), which sends a real SMS.
 * The single-file preview (`npm run build:single`) has no server, so it uses the mock.
 */
export const USE_SERVER = import.meta.env.MODE !== 'single'

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new ApiError('service_unavailable')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const known: ApiErrorCode[] = ['otp_invalid', 'otp_expired', 'shahkar_mismatch', 'service_unavailable', 'rate_limited', 'too_many_attempts']
    throw new ApiError(known.includes(data.error) ? data.error : 'service_unavailable')
  }
  return data as T
}

let otpIssuedAt = 0

/** Sends the login code. Resolves with the seconds the code stays valid. */
export async function sendLoginOtp(nationalCode: string, mobile: string): Promise<number> {
  if (USE_SERVER) return (await post<{ ttl: number }>('/api/otp/send', { nationalCode, mobile })).ttl
  await wait(700)
  if (mobile === '09129999999') throw new ApiError('service_unavailable')
  otpIssuedAt = Date.now()
  return OTP_TTL_SECONDS
}

export async function verifyLoginOtp(nationalCode: string, mobile: string, code: string): Promise<User> {
  if (USE_SERVER) return (await post<{ user: User }>('/api/otp/verify', { nationalCode, mobile, code })).user
  await wait(900)
  if (Date.now() - otpIssuedAt > OTP_TTL_SECONDS * 1000) throw new ApiError('otp_expired')
  if (code === '000000') throw new ApiError('otp_invalid')
  if (mobile.endsWith('0000')) throw new ApiError('shahkar_mismatch')
  return { fullName: 'دکتر پرهام جلالی', nationalCode, mobile }
}

/* ───────────────────────── Tax files ───────────────────────── */

export type FileStatus = 'active' | 'unassigned' | 'note2' | 'over_limit' | 'no_file' | 'banned_temp' | 'banned_perm' | 'inactive'

export const FILE_STATUS: Record<FileStatus, { label: string; tone: 'ok' | 'neutral' | 'warn' | 'danger'; selectable: boolean; reason?: string }> = {
  active: { label: 'فعال', tone: 'ok', selectable: true },
  unassigned: { label: 'تخصیص نیافته', tone: 'neutral', selectable: true },
  note2: { label: 'مشمول تبصره ۲ ماده ۶', tone: 'warn', selectable: true },
  over_limit: { label: 'عبور از حد مجاز ماده ۶', tone: 'warn', selectable: true },
  no_file: { label: 'بدون پرونده مالیاتی', tone: 'neutral', selectable: false, reason: 'برای این کسب‌وکار پرونده مالیاتی تشکیل نشده است.' },
  banned_temp: { label: 'غیرمجاز موقت', tone: 'danger', selectable: false, reason: 'این پرونده موقتاً امکان صدور صورتحساب ندارد.' },
  banned_perm: { label: 'غیرمجاز دائم', tone: 'danger', selectable: false, reason: 'این پرونده امکان صدور صورتحساب ندارد.' },
  inactive: { label: 'غیرفعال', tone: 'danger', selectable: false, reason: 'این پرونده در سازمان امور مالیاتی فعال نیست.' },
}

export type TaxFile = {
  id: string
  title: string
  economicNumber: string
  status: FileStatus
  /** Status wording from the tax organisation, when it differs from the generic label. */
  statusText?: string
  /** Memory ID already registered with Keysun as trusted company, if any. */
  keysunMemoryId?: string
  /** Memory ID registered elsewhere (another trusted company or self). */
  memoryId?: string
}

const FILES: TaxFile[] = [
  { id: 'f1', title: 'مطب دکتر پرهام جلالی', economicNumber: '14004567891', status: 'active', memoryId: 'A3F29K' },
  { id: 'f2', title: 'کلینیک تخصصی قلب نیایش', economicNumber: '14009876543', status: 'active', keysunMemoryId: 'K7Q2M9' },
  { id: 'f3', title: 'آزمایشگاه تشخیص طبی جلالی', economicNumber: '10862233445', status: 'unassigned' },
  { id: 'f4', title: 'مرکز فیزیوتراپی آرامش', economicNumber: '10865566778', status: 'note2', memoryId: 'B8D14X' },
  { id: 'f5', title: 'داروخانه دکتر جلالی', economicNumber: '10861122334', status: 'banned_temp', memoryId: 'C2H77P' },
  { id: 'f6', title: 'مرکز تصویربرداری سپید', economicNumber: '10869988776', status: 'banned_perm' },
]

/** Tax organisation status codes (taxpayerStatus) → our statuses. */
const TAXPAYER_STATUS: Record<string, { status: FileStatus; text?: string }> = {
  ACTIVE: { status: 'active' },
  INACTIVE: { status: 'inactive' },
  DEACTIVE: { status: 'inactive' },
  DEACTIVATED: { status: 'inactive' },
  SUSPENDED: { status: 'banned_temp', text: 'تعلیق‌شده' },
  CANCELED: { status: 'inactive', text: 'ابطال‌شده' },
  CANCELLED: { status: 'inactive', text: 'ابطال‌شده' },
}

type ServerFile = { id: string; economicNumber: string; title: string; taxpayerStatus: string }

function mockFiles(user: User): TaxFile[] {
  // Demo economic numbers follow the real rule: national code + 4-digit counter.
  return FILES.map((f, i) => ({ ...f, economicNumber: user.nationalCode + String(i + 1).padStart(4, '0') }))
}

export async function fetchTaxFiles(user: User): Promise<TaxFile[]> {
  if (USE_SERVER) {
    const res = await fetch('/api/files', { credentials: 'same-origin' }).catch(() => null)
    if (res?.status === 501) return mockFiles(user) // inquiry not configured on this server
    if (!res || !res.ok) throw new ApiError('service_unavailable')
    const { files } = (await res.json()) as { files: ServerFile[] }
    return files.map((f) => {
      const m = TAXPAYER_STATUS[f.taxpayerStatus] ?? { status: 'inactive' as FileStatus, text: f.taxpayerStatus || undefined }
      return { id: f.id, title: f.title, economicNumber: f.economicNumber, status: m.status, statusText: m.text }
    })
  }
  await wait(900)
  if (user.mobile.endsWith('1111')) return []
  return mockFiles(user)
}

/* ───────────────────────── Permission to Keysun ───────────────────────── */

/** The only access requested from the taxpayer. Fixed and always selected. */
export const ACCESS_LABEL = 'دریافت شناسه یکتای حافظه مالیاتی'

/** Access is always granted for one Jalali year from today. Returns "1406/07/06" (Latin digits). */
export function accessExpiry(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Tehran' }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const y = get('year') + 1
  const m = get('month')
  const d = Math.min(get('day'), m === 12 ? 29 : 31) // Esfand 30 may not exist next year
  return `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`
}

let orgOtpIssuedAt = 0

/** Sends the access code by SMS to the mobile used at login. Resolves with the code lifetime in seconds. */
export async function requestKeysunAccess(file: TaxFile): Promise<number> {
  if (USE_SERVER) return (await post<{ ttl: number }>('/api/access/send', { economicNumber: file.economicNumber })).ttl
  await wait(900)
  orgOtpIssuedAt = Date.now()
  return OTP_TTL_SECONDS
}

export async function confirmKeysunAccess(file: TaxFile, code: string): Promise<{ memoryId: string }> {
  let memoryId: string
  if (USE_SERVER) {
    memoryId = (await post<{ memoryId: string }>('/api/access/verify', { economicNumber: file.economicNumber, code })).memoryId
  } else {
    await wait(1100)
    if (Date.now() - orgOtpIssuedAt > OTP_TTL_SECONDS * 1000) throw new ApiError('otp_expired')
    if (code === '000000') throw new ApiError('otp_invalid')
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    memoryId = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  }
  file.keysunMemoryId = memoryId
  return { memoryId }
}

/* ───────────────────────── Representatives (Tehran hospitals) ───────────────────────── */

export type Buyer = { id: string; name: string; kind: string; phone: string; address: string }

export const ALL_BUYERS = HOSPITALS as Buyer[]

/** Folds Persian spelling variants so «ولیعصر», «ولی‌عصر» and «ولي عصر» all match. */
export function normalizeFa(s: string): string {
  return s
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ۀة]/g, 'ه')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ً-ٟـ]/g, '') // harakat, tatweel
    .replace(/[‌\s()«»،,.-]+/g, '')
    .toLowerCase()
}

const INDEX = ALL_BUYERS.map((b) => ({ b, name: normalizeFa(b.name), all: normalizeFa(`${b.name} ${b.address}`) }))

/** Matches every word of the query against name + address; name matches come first. */
export function searchBuyers(query: string): Buyer[] {
  const words = query.split(/\s+/).map(normalizeFa).filter(Boolean)
  if (!words.length) return ALL_BUYERS
  return INDEX.filter((x) => words.every((w) => x.all.includes(w)))
    .sort((a, b) => Number(words.every((w) => b.name.includes(w))) - Number(words.every((w) => a.name.includes(w))))
    .map((x) => x.b)
}

export async function grantPowerOfAttorney(_file: TaxFile, _buyers: Buyer[]): Promise<void> {
  await wait(1000)
}
