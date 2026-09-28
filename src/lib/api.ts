/**
 * Service layer. Everything the UI needs from the outside world goes through here,
 * so the mock implementations can later be swapped for real services
 * (Asan OTP, Shahkar, tax organisation) without touching the screens.
 *
 * Demo scenarios (mock mode):
 *  - OTP code 000000                → «کد نادرست است»
 *  - mobile ending in 0000          → Shahkar mismatch (mobile not owned by national code)
 *  - mobile 09129999999             → service outage while sending the code
 *  - any other valid 6-digit code   → success
 */

export type ApiErrorCode = 'otp_invalid' | 'otp_expired' | 'shahkar_mismatch' | 'service_unavailable'

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

let otpIssuedAt = 0

export async function sendLoginOtp(_nationalCode: string, mobile: string): Promise<void> {
  await wait(700)
  if (mobile === '09129999999') throw new ApiError('service_unavailable')
  otpIssuedAt = Date.now()
}

export async function verifyLoginOtp(nationalCode: string, mobile: string, code: string): Promise<User> {
  await wait(900)
  if (Date.now() - otpIssuedAt > OTP_TTL_SECONDS * 1000) throw new ApiError('otp_expired')
  if (code === '000000') throw new ApiError('otp_invalid')
  if (mobile.endsWith('0000')) throw new ApiError('shahkar_mismatch')
  return { fullName: 'دکتر پرهام جلالی', nationalCode, mobile }
}
