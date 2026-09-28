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
 *  Permission to Keysun
 *  - organisation OTP 000000        → «کد نادرست است»
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

export type Permission = { id: string; title: string; description: string }

export const PERMISSIONS: Permission[] = [
  { id: 'token', title: 'تفویض توکن', description: 'مشاهده، ایجاد و مدیریت توکن‌های دسترسی' },
  { id: 'sale_search', title: 'جست‌وجوی صورتحساب فروش', description: 'مشاهده و جست‌وجوی صورتحساب‌های فروش ثبت‌شده' },
  { id: 'buy_search', title: 'جست‌وجوی صورتحساب خرید', description: 'مشاهده و جست‌وجوی صورتحساب‌های خرید ثبت‌شده' },
  { id: 'buy_approve', title: 'تأیید و رد صورتحساب خرید', description: 'بررسی و تغییر وضعیت صورتحساب‌های خرید با تأیید یا رد' },
  { id: 'vsale_search', title: 'جست‌وجوی صورتحساب فروش مجازی', description: 'مشاهده و جست‌وجوی صورتحساب‌های فروش مجازی ثبت‌شده' },
  { id: 'vbuy_search', title: 'جست‌وجوی صورتحساب خرید مجازی', description: 'مشاهده و جست‌وجوی صورتحساب‌های خرید مجازی ثبت‌شده' },
  { id: 'vsale_approve', title: 'تأیید و رد صورتحساب فروش مجازی', description: 'بررسی و تغییر وضعیت صورتحساب‌های فروش مجازی با تأیید یا رد' },
  { id: 'contract_search', title: 'جست‌وجوی قرارداد', description: 'مشاهده و جست‌وجوی قراردادهای ثبت‌شده و مرتبط' },
  { id: 'contract_approve', title: 'تأیید و رد قرارداد', description: 'بررسی و تغییر وضعیت قراردادها با تأیید یا رد آن‌ها' },
]

/** Always granted — Keysun needs it to receive the memory ID. */
export const REQUIRED_PERMISSION = 'token'

export type Duration = { id: string; label: string; days: number }

export const DURATIONS: Duration[] = [
  { id: '1w', label: '۱ هفته', days: 7 },
  { id: '1m', label: '۱ ماهه', days: 30 },
  { id: '3m', label: '۳ ماهه', days: 90 },
  { id: '6m', label: '۶ ماهه', days: 180 },
  { id: '12m', label: '۱۲ ماهه', days: 365 },
]

let orgOtpIssuedAt = 0

/** The tax organisation texts a code to the mobile registered on the tax file. */
export async function requestKeysunAccess(_file: TaxFile, _permissions: string[], _duration: Duration): Promise<{ maskedMobile: string }> {
  await wait(900)
  orgOtpIssuedAt = Date.now()
  return { maskedMobile: '۰۹۱۲***۴۵۶۷' }
}

export async function confirmKeysunAccess(file: TaxFile, code: string): Promise<{ memoryId: string }> {
  await wait(1100)
  if (Date.now() - orgOtpIssuedAt > OTP_TTL_SECONDS * 1000) throw new ApiError('otp_expired')
  if (code === '000000') throw new ApiError('otp_invalid')
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const memoryId = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  file.keysunMemoryId = memoryId
  return { memoryId }
}

/* ───────────────────────── Buyers (representatives) ───────────────────────── */

export type Buyer = { id: string; name: string; economicNumber: string; address: string; phone: string }

const BUYERS: Buyer[] = [
  { id: 'b1', name: 'بیمارستان شهدای تجریش', economicNumber: '10100452310', address: 'تهران، میدان تجریش، خیابان شهرداری', phone: '021-22718001' },
  { id: 'b2', name: 'بیمارستان آتیه', economicNumber: '10102784561', address: 'تهران، شهرک غرب، بلوار فرحزادی', phone: '021-82721000' },
  { id: 'b3', name: 'بیمارستان پارسیان', economicNumber: '10103345987', address: 'تهران، خیابان شهید بهشتی، خیابان پاکستان', phone: '021-88752020' },
  { id: 'b4', name: 'بیمارستان میلاد', economicNumber: '10100998712', address: 'تهران، بزرگراه همت، بیمارستان میلاد', phone: '021-82401000' },
  { id: 'b5', name: 'بیمارستان جم', economicNumber: '10101234876', address: 'تهران، خیابان طالقانی، خیابان فریمان', phone: '021-88829000' },
  { id: 'b6', name: 'کلینیک ویژه دی', economicNumber: '10105567234', address: 'تهران، خیابان ولیعصر، بالاتر از میدان ونک', phone: '021-88792022' },
  { id: 'b7', name: 'بیمارستان کسری', economicNumber: '10106678345', address: 'تهران، خیابان ولیعصر، خیابان کسری', phone: '021-89391000' },
]

export async function searchBuyers(economicNumber: string, name: string): Promise<Buyer[]> {
  await wait(600)
  const n = name.trim()
  return BUYERS.filter((b) => (!economicNumber || b.economicNumber.includes(economicNumber)) && (!n || b.name.includes(n)))
}

export async function grantPowerOfAttorney(_file: TaxFile, _buyers: Buyer[]): Promise<void> {
  await wait(1000)
}
