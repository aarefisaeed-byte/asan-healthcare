import { useEffect, useState } from 'react'
import { ArrowLeft, Info, RotateCw } from 'lucide-react'
import { Button, Modal } from './ui'
import { OtpInput } from './OtpInput'
import { ApiError, OTP_LENGTH, OTP_TTL_SECONDS, sendLoginOtp, verifyLoginOtp, type User } from '../lib/api'
import { formatTimer, maskMobile } from '../lib/format'

type Props = {
  open: boolean
  nationalCode: string
  mobile: string
  onClose: () => void
  onVerified: (user: User) => void
  onMismatch: () => void
}

const messages: Record<string, string> = {
  otp_invalid: 'کد واردشده درست نیست. کد پیامک‌شده را دوباره بررسی کنید.',
  otp_expired: 'اعتبار این کد تمام شده است. کد جدید دریافت کنید.',
  service_unavailable: 'ارتباط با سامانه استعلام برقرار نشد. چند لحظه بعد دوباره تلاش کنید.',
}

export function LoginOtpModal({ open, nationalCode, mobile, onClose, onVerified, onMismatch }: Props) {
  const [code, setCode] = useState('')
  const [left, setLeft] = useState(OTP_TTL_SECONDS)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!open) return
    setCode('')
    setError(null)
    setLeft(OTP_TTL_SECONDS)
  }, [open])

  useEffect(() => {
    if (!open || left <= 0) return
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [open, left])

  const expired = left <= 0

  const verify = async () => {
    if (expired) {
      setError(messages.otp_expired)
      return
    }
    setVerifying(true)
    setError(null)
    try {
      onVerified(await verifyLoginOtp(nationalCode, mobile, code))
    } catch (e) {
      const c = e instanceof ApiError ? e.code : 'service_unavailable'
      if (c === 'shahkar_mismatch') onMismatch()
      else setError(messages[c])
      if (c === 'otp_invalid') setCode('')
    } finally {
      setVerifying(false)
    }
  }

  const resend = async () => {
    setResending(true)
    setError(null)
    try {
      await sendLoginOtp(nationalCode, mobile)
      setCode('')
      setLeft(OTP_TTL_SECONDS)
    } catch {
      setError(messages.service_unavailable)
    } finally {
      setResending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تأیید شماره موبایل"
      subtitle="کد تأیید پیامک‌شده را وارد کنید."
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="w-[38%]">
            برگشت
          </Button>
          <Button
            className="flex-1"
            disabled={code.length !== OTP_LENGTH}
            loading={verifying}
            onClick={verify}
            icon={<ArrowLeft className="size-5" aria-hidden />}
          >
            ورود به انتخاب پرونده
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-2 rounded-lg bg-surface px-4 py-3 text-[14px] text-muted">
        <Info className="size-5 shrink-0" aria-hidden />
        <span>
          کد تأیید به شماره <b className="font-bold text-ink" dir="ltr">{maskMobile(mobile)}</b> ارسال شد.
        </span>
      </div>

      <div className="mt-6">
        <OtpInput length={OTP_LENGTH} value={code} onChange={(v) => { setCode(v); setError(null) }} invalid={!!error} autoFocus />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-center text-[14px] font-medium text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between text-[14px]">
        <span className="text-muted">
          زمان باقی‌مانده: <b className={`font-bold ${expired ? 'text-danger' : 'text-[#0a8ad6]'}`}>{formatTimer(Math.max(left, 0))}</b>
        </span>
        <button
          onClick={resend}
          disabled={!expired || resending}
          className="inline-flex items-center gap-1 font-medium text-navy-600 disabled:text-[#a9adb8]"
        >
          <RotateCw className={`size-4 ${resending ? 'animate-spin' : ''}`} aria-hidden />
          ارسال مجدد کد
        </button>
      </div>
    </Modal>
  )
}
