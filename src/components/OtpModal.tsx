import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, Info, RotateCw } from 'lucide-react'
import { Button, Modal } from './ui'
import { OtpInput } from './OtpInput'
import { ApiError, OTP_LENGTH, OTP_TTL_SECONDS } from '../lib/api'
import { formatTimer } from '../lib/format'

export const otpMessages: Record<string, string> = {
  otp_invalid: 'کد واردشده درست نیست. کد پیامک‌شده را دوباره بررسی کنید.',
  otp_expired: 'اعتبار این کد تمام شده است. کد جدید دریافت کنید.',
  service_unavailable: 'ارتباط با سامانه برقرار نشد. چند لحظه بعد دوباره تلاش کنید.',
  too_many_attempts: 'تعداد تلاش‌ها بیش از حد مجاز شد. کد جدید دریافت کنید.',
  rate_limited: 'درخواست‌های ارسال کد بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
}

type Props = {
  open: boolean
  title: string
  subtitle: string
  info: ReactNode
  submitLabel: string
  onClose: () => void
  /** Throw ApiError to show an inline error. Return normally on success. */
  onSubmit: (code: string) => Promise<void>
  /** May resolve with the new code lifetime in seconds. */
  onResend: () => Promise<number | void>
  /** Seconds left on the code when the sheet opens. */
  seconds?: number
  /** Called for error codes the caller wants to handle itself (e.g. Shahkar mismatch). */
  onOtherError?: (code: string) => void
}

/** Six-digit code sheet with countdown and resend — used for login and for the tax organisation's code. */
export function OtpModal({ open, title, subtitle, info, submitLabel, onClose, onSubmit, onResend, onOtherError, seconds = OTP_TTL_SECONDS }: Props) {
  const [code, setCode] = useState('')
  const [left, setLeft] = useState(OTP_TTL_SECONDS)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    if (!open) return
    setCode('')
    setError(null)
    setLocked(false)
    setLeft(seconds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open || left <= 0) return
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [open, left])

  const expired = left <= 0

  const submit = async () => {
    if (expired) return setError(otpMessages.otp_expired)
    setBusy(true)
    setError(null)
    try {
      await onSubmit(code)
    } catch (e) {
      const c = e instanceof ApiError ? e.code : 'service_unavailable'
      if (otpMessages[c]) setError(otpMessages[c])
      else onOtherError?.(c)
      if (c === 'otp_invalid' || c === 'too_many_attempts') setCode('')
      if (c === 'too_many_attempts') setLocked(true)
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setResending(true)
    setError(null)
    try {
      const ttl = await onResend()
      setCode('')
      setLocked(false)
      setLeft(typeof ttl === 'number' ? ttl : OTP_TTL_SECONDS)
    } catch (e) {
      setError(otpMessages[e instanceof ApiError ? e.code : 'service_unavailable'] ?? otpMessages.service_unavailable)
    } finally {
      setResending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="w-[36%]">
            برگشت
          </Button>
          <Button className="flex-1" disabled={code.length !== OTP_LENGTH || locked} loading={busy} onClick={submit} icon={<ArrowLeft className="size-5" aria-hidden />}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-2 rounded-lg bg-surface px-4 py-3 text-[14px] leading-6 text-muted">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
        <span>{info}</span>
      </div>

      <div className="mt-6">
        <OtpInput
          length={OTP_LENGTH}
          value={code}
          onChange={(v) => {
            setCode(v)
            setError(null)
          }}
          invalid={!!error}
          autoFocus
        />
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
        <button onClick={resend} disabled={!(expired || locked) || resending} className="inline-flex items-center gap-1 font-medium text-navy-600 disabled:text-[#a9adb8]">
          <RotateCw className={`size-4 ${resending ? 'animate-spin' : ''}`} aria-hidden />
          ارسال مجدد کد
        </button>
      </div>
    </Modal>
  )
}
