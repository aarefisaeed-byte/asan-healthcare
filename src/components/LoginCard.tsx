import { forwardRef, useState } from 'react'
import { AlertCircle, ArrowLeft, Lock, Smartphone, IdCard } from 'lucide-react'
import { Button, Modal } from './ui'
import { LoginOtpModal } from './LoginOtpModal'
import { ApiError, sendLoginOtp, type User } from '../lib/api'
import { digitsOnly, isValidMobile, isValidNationalCode, toFa } from '../lib/format'

type Props = { onLoggedIn: (user: User) => void }

type Field = { id: string; label: string; placeholder: string; max: number; icon: React.ReactNode }

export const LoginCard = forwardRef<HTMLDivElement, Props>(function LoginCard({ onLoggedIn }, ref) {
  const [nationalCode, setNationalCode] = useState('')
  const [mobile, setMobile] = useState('')
  const [touched, setTouched] = useState({ nc: false, mobile: false })
  const [sending, setSending] = useState(false)
  const [otpOpen, setOtpOpen] = useState(false)
  const [ttl, setTtl] = useState(120)
  const [dialog, setDialog] = useState<null | 'mismatch' | 'service' | 'limited'>(null)

  const ncValid = isValidNationalCode(nationalCode)
  const mobileValid = isValidMobile(mobile)
  const ncError = touched.nc && nationalCode && !ncValid ? 'کد ملی واردشده معتبر نیست.' : touched.nc && !nationalCode ? 'کد ملی را وارد کنید.' : ''
  const mobileError =
    touched.mobile && mobile && !mobileValid ? 'شماره موبایل باید ۱۱ رقم باشد و با ۰۹ شروع شود.' : touched.mobile && !mobile ? 'شماره موبایل را وارد کنید.' : ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ nc: true, mobile: true })
    if (!ncValid || !mobileValid) return
    setSending(true)
    try {
      setTtl(await sendLoginOtp(nationalCode, mobile))
      setOtpOpen(true)
    } catch (err) {
      setDialog(err instanceof ApiError && err.code === 'rate_limited' ? 'limited' : 'service')
    } finally {
      setSending(false)
    }
  }

  const fields: Array<Field & { value: string; set: (v: string) => void; error: string; key: 'nc' | 'mobile' }> = [
    { id: 'national-code', key: 'nc', label: 'کد ملی', placeholder: 'کد ملی ۱۰ رقمی', max: 10, icon: <IdCard className="size-5" />, value: nationalCode, set: setNationalCode, error: ncError },
    { id: 'mobile', key: 'mobile', label: 'شماره موبایل', placeholder: '۰۹۱۲۳۴۵۶۷۸۹', max: 11, icon: <Smartphone className="size-5" />, value: mobile, set: setMobile, error: mobileError },
  ]

  return (
    <div ref={ref} id="login" className="scroll-mt-6">
      <form onSubmit={submit} noValidate className="overflow-hidden rounded-2xl bg-white text-ink shadow-[0_24px_60px_-20px_rgba(4,12,40,0.55)]">
        <div className="border-b border-mist px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
          <h2 className="text-[17px] font-bold">ورود به آسان</h2>
          <p className="mt-0.5 text-[13.5px] text-muted [@media(max-height:620px)]:hidden">با کد ملی و شماره موبایل خود وارد شوید.</p>
        </div>

        <div className="flex flex-col gap-3 px-4 pb-4 pt-3 sm:gap-4 sm:px-5 sm:pb-5 sm:pt-4">
          {fields.map((f) => (
            <div key={f.id} className="flex flex-col gap-1.5">
              <label htmlFor={f.id} className="text-[14px] font-bold">
                {f.label}
                <span className="text-danger">*</span>
              </label>
              <div
                className={`flex h-12 items-center gap-2 rounded-lg border bg-surface px-3 transition-colors focus-within:border-navy-600 focus-within:bg-white ${
                  f.error ? 'border-danger' : 'border-transparent'
                }`}
              >
                <span className="text-[#8a8f9c]" aria-hidden>
                  {f.icon}
                </span>
                <input
                  id={f.id}
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete={f.key === 'mobile' ? 'tel' : 'off'}
                  placeholder={f.placeholder}
                  value={toFa(f.value)}
                  maxLength={f.max}
                  onChange={(e) => f.set(digitsOnly(e.target.value).slice(0, f.max))}
                  onBlur={() => setTouched((t) => ({ ...t, [f.key]: true }))}
                  aria-invalid={!!f.error}
                  aria-describedby={f.error ? `${f.id}-err` : undefined}
                  className="h-full min-w-0 flex-1 bg-transparent text-right text-[16px] font-medium tracking-wide outline-none placeholder:text-[#a9adb8]"
                />
              </div>
              {f.error && (
                <p id={`${f.id}-err`} className="text-[13px] text-danger">
                  {f.error}
                </p>
              )}
            </div>
          ))}

          <p className="flex items-start gap-1.5 text-[12.5px] leading-5 text-muted">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            شماره موبایل واردشده باید متعلق به صاحب کد ملی باشد.
          </p>

          <Button type="submit" block loading={sending} disabled={!ncValid || !mobileValid} icon={<ArrowLeft className="size-5" aria-hidden />}>
            دریافت کد تأیید
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1.5 bg-surface px-4 py-2.5 text-[12px] text-muted">
          <Lock className="size-3.5" aria-hidden />
          تمامی صورتحساب‌ها از طریق معتمد مالیاتی کیسان ارسال می‌شوند.
        </div>
      </form>

      <LoginOtpModal
        open={otpOpen}
        seconds={ttl}
        nationalCode={nationalCode}
        mobile={mobile}
        onClose={() => setOtpOpen(false)}
        onVerified={(u) => {
          setOtpOpen(false)
          onLoggedIn(u)
        }}
        onMismatch={() => {
          setOtpOpen(false)
          setDialog('mismatch')
        }}
      />

      <Modal
        open={dialog === 'mismatch'}
        onClose={() => setDialog(null)}
        icon={<AlertCircle className="mt-0.5 size-6 shrink-0 text-danger" aria-hidden />}
        title="خطای عدم تطابق"
        subtitle="شماره موبایل واردشده متعلق به کد ملی ثبت‌شده نیست. لطفاً شماره موبایلی را وارد کنید که به نام صاحب کد ملی باشد."
        footer={
          <Button
            variant="outline"
            block
            onClick={() => {
              setDialog(null)
              setTimeout(() => document.getElementById('mobile')?.focus(), 50)
            }}
          >
            اصلاح شماره موبایل
          </Button>
        }
      />

      <Modal
        open={dialog === 'service'}
        onClose={() => setDialog(null)}
        icon={<AlertCircle className="mt-0.5 size-6 shrink-0 text-warn" aria-hidden />}
        title="اختلال موقت در سرویس"
        subtitle="ارتباط با سامانه استعلام برقرار نشد. اطلاعات شما حفظ شده است؛ چند لحظه بعد دوباره تلاش کنید."
        footer={
          <>
            <Button variant="outline" className="w-[38%]" onClick={() => setDialog(null)}>
              بستن
            </Button>
            <Button className="flex-1" onClick={(e) => { setDialog(null); submit(e as unknown as React.FormEvent) }}>
              تلاش مجدد
            </Button>
          </>
        }
      />

      <Modal
        open={dialog === 'limited'}
        onClose={() => setDialog(null)}
        icon={<AlertCircle className="mt-0.5 size-6 shrink-0 text-warn" aria-hidden />}
        title="تعداد درخواست‌ها زیاد است"
        subtitle="برای امنیت حساب شما، ارسال کد برای این شماره موقتاً محدود شده است. کمی بعد دوباره تلاش کنید."
        footer={
          <Button variant="outline" block onClick={() => setDialog(null)}>
            متوجه شدم
          </Button>
        }
      />
    </div>
  )
})
