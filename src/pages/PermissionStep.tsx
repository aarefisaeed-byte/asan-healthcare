import { useState } from 'react'
import { ArrowLeft, CalendarClock, Check, KeyRound, Lock } from 'lucide-react'
import { Button, Modal } from '../components/ui'
import { BottomBar, PageTitle, Stepper } from '../components/flow'
import { OtpModal } from '../components/OtpModal'
import { ACCESS_LABEL, accessExpiry, confirmKeysunAccess, requestKeysunAccess, type TaxFile, type User } from '../lib/api'
import { maskMobile, toFa } from '../lib/format'

type Props = {
  user: User
  file: TaxFile
  onCancel: () => void
  onBack: () => void
  onNext: (memoryId: string) => void
}

export function PermissionStep({ user, file, onCancel, onBack, onNext }: Props) {
  const [sending, setSending] = useState(false)
  const [otpOpen, setOtpOpen] = useState(false)
  const [ttl, setTtl] = useState(120)
  const [error, setError] = useState<string | null>(null)
  const [memoryId, setMemoryId] = useState<string | null>(null)
  const expiry = toFa(accessExpiry())

  const send = async () => {
    setSending(true)
    setError(null)
    try {
      setTtl(await requestKeysunAccess(file))
      setOtpOpen(true)
    } catch {
      setError('ارسال پیامک انجام نشد. چند لحظه بعد دوباره تلاش کنید.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Stepper current={1} />
      <PageTitle
        title="اعطای مجوز به کیسان"
        subtitle="با تأیید شما، شرکت داده‌پردازی کیسان شناسه یکتای حافظه مالیاتی این پرونده را از سازمان دریافت و ثبت می‌کند."
      />

      <section className="mt-5 divide-y divide-mist rounded-xl border border-line bg-white">
        <div className="p-4">
          <p className="text-[13px] text-muted">پرونده</p>
          <p className="mt-0.5 text-[15.5px] font-bold">{file.title}</p>
          <p className="mt-0.5 text-[13.5px] text-muted tabular-nums">
            شماره اقتصادی: <span dir="ltr">{toFa(file.economicNumber)}</span>
          </p>
        </div>

        <div className="p-4">
          <p className="text-[13px] text-muted">دسترسی درخواستی</p>
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-[#c9d3ea] bg-navy-50 p-3" role="checkbox" aria-checked="true" aria-disabled="true">
            <span className="grid size-5 shrink-0 place-items-center rounded border-2 border-navy bg-navy text-white" aria-hidden>
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <KeyRound className="size-4 shrink-0 text-navy" aria-hidden />
            <span className="flex-1 text-[14.5px] font-bold text-navy">{ACCESS_LABEL}</span>
            <Lock className="size-4 shrink-0 text-[#8a8f9c]" aria-label="غیرقابل تغییر" />
          </div>
        </div>

        <div className="flex items-center gap-3 p-4">
          <CalendarClock className="size-5 shrink-0 text-navy-600" aria-hidden />
          <div>
            <p className="text-[13px] text-muted">مدت اعتبار</p>
            <p className="mt-0.5 text-[14.5px] font-bold">
              یک سال، تا <span className="tabular-nums">{expiry}</span>
            </p>
          </div>
        </div>
      </section>

      <p className="mt-4 text-[13.5px] leading-7 text-muted">
        با زدن دکمه زیر، رمز تأیید به شماره <b className="font-bold text-ink" dir="ltr">{maskMobile(user.mobile)}</b> پیامک می‌شود.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-[14px] font-medium text-danger">
          {error}
        </p>
      )}
      <button onClick={onBack} className="mt-3 text-[14px] font-medium text-navy-600 underline-offset-4 hover:underline">
        بازگشت به پرونده‌ها
      </button>

      <BottomBar>
        <Button variant="outline" className="w-[36%] sm:w-40" onClick={onCancel}>
          انصراف
        </Button>
        <Button className="flex-1 sm:max-w-72" loading={sending} onClick={send} icon={<ArrowLeft className="size-5" aria-hidden />}>
          دریافت رمز تأیید
        </Button>
      </BottomBar>

      <OtpModal
        open={otpOpen && memoryId === null}
        seconds={ttl}
        title="تأیید اعطای مجوز"
        subtitle="رمز پیامک‌شده را وارد کنید."
        info={
          <>
            رمز تأیید به شماره{' '}
            <b className="font-bold text-ink" dir="ltr">
              {maskMobile(user.mobile)}
            </b>{' '}
            ارسال شد.
          </>
        }
        submitLabel="ثبت و ادامه"
        onClose={() => setOtpOpen(false)}
        onSubmit={async (code) => {
          const r = await confirmKeysunAccess(file, code)
          setMemoryId(r.memoryId)
        }}
        onResend={() => requestKeysunAccess(file)}
      />

      <Modal
        open={memoryId !== null}
        icon={
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ok-50 text-ok">
            <KeyRound className="size-5" aria-hidden />
          </span>
        }
        title="شناسه حافظه دریافت شد"
        subtitle="مجوز ثبت شد و کیسان شناسه یکتای حافظه مالیاتی این پرونده را دریافت کرد."
        footer={
          <Button block onClick={() => onNext(memoryId!)} icon={<ArrowLeft className="size-5" aria-hidden />}>
            ادامه به انتخاب بیمارستان
          </Button>
        }
      >
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-[#9bb0dd] bg-navy-50 py-5">
          <span className="text-[13px] text-muted">شناسه یکتای حافظه مالیاتی</span>
          <span className="text-3xl font-black tracking-[0.3em] text-navy" dir="ltr">
            {memoryId}
          </span>
        </div>
      </Modal>
    </>
  )
}
