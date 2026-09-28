import { useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, ChevronUp, Info, KeyRound, ShieldCheck } from 'lucide-react'
import { Button, Modal } from '../components/ui'
import { BottomBar, PageTitle, Section, Stepper, jalali } from '../components/flow'
import { OtpModal } from '../components/OtpModal'
import {
  DURATIONS,
  PERMISSIONS,
  REQUIRED_PERMISSION,
  confirmKeysunAccess,
  requestKeysunAccess,
  type TaxFile,
} from '../lib/api'
import { toFa } from '../lib/format'

type Props = {
  file: TaxFile
  onCancel: () => void
  onBack: () => void
  onNext: (memoryId: string) => void
}

const COLLAPSED_COUNT = 2

function Checkbox({ checked, locked }: { checked: boolean; locked?: boolean }) {
  return (
    <span
      className={`grid size-5 shrink-0 place-items-center rounded border-2 transition-colors ${
        checked ? (locked ? 'border-[#7d8394] bg-[#7d8394] text-white' : 'border-navy bg-navy text-white') : 'border-[#8a8f9c] bg-white'
      }`}
      aria-hidden
    >
      {checked && <Check className="size-3.5" strokeWidth={3} />}
    </span>
  )
}

export function PermissionStep({ file, onCancel, onBack, onNext }: Props) {
  const [chosen, setChosen] = useState<string[]>([REQUIRED_PERMISSION])
  const [expanded, setExpanded] = useState(false)
  const [durationId, setDurationId] = useState('12m')
  const [sending, setSending] = useState(false)
  const [otpInfo, setOtpInfo] = useState<string | null>(null)
  const [memoryId, setMemoryId] = useState<string | null>(null)

  const all = chosen.length === PERMISSIONS.length
  const duration = DURATIONS.find((d) => d.id === durationId)!
  const endDate = useMemo(() => jalali(new Date(Date.now() + duration.days * 86400000)), [duration])

  const toggle = (id: string) => {
    if (id === REQUIRED_PERMISSION) return
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  }
  const toggleAll = () => setChosen(all ? [REQUIRED_PERMISSION] : PERMISSIONS.map((p) => p.id))

  const visible = expanded ? PERMISSIONS : PERMISSIONS.slice(0, COLLAPSED_COUNT)
  const chosenTitles = PERMISSIONS.filter((p) => chosen.includes(p.id)).map((p) => p.title)

  const submit = async () => {
    setSending(true)
    try {
      const { maskedMobile } = await requestKeysunAccess(file, chosen, duration)
      setOtpInfo(maskedMobile)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Stepper current={1} />
      <PageTitle
        title="اعطای مجوز به معتمد کیسان"
        subtitle="مجوزها و مدت اعتبار را مشخص کنید. با تأیید شما، معتمد مالیاتی کیسان شناسه یکتای حافظه مالیاتی این پرونده را از سازمان دریافت و ثبت می‌کند."
      />

      <div className="mt-5 flex flex-col gap-3">
        <Section title="پرونده انتخاب‌شده">
          <div className="flex flex-col gap-1.5">
            <p className="text-[15px] font-bold">{file.title}</p>
            <label htmlFor="economic-number" className="mt-2 text-[13.5px] text-muted">
              شماره اقتصادی
            </label>
            <input
              id="economic-number"
              readOnly
              value={toFa(file.economicNumber)}
              dir="ltr"
              className="h-11 rounded-lg border border-line bg-surface px-3 text-right text-[15px] tabular-nums text-muted outline-none"
            />
            <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
              <Info className="size-3.5 shrink-0" aria-hidden />
              شماره اقتصادی از پرونده انتخابی شما به‌صورت خودکار نمایش داده می‌شود.
            </p>
          </div>
        </Section>

        <Section title="مجوزهای درخواستی" subtitle="حداقل یک مجوز لازم است. «تفویض توکن» برای دریافت شناسه حافظه همیشه فعال است.">
          <button
            onClick={toggleAll}
            aria-pressed={all}
            className={`flex w-full items-start gap-3 rounded-lg border-2 p-3.5 text-right transition-colors ${all ? 'border-navy bg-navy-50' : 'border-line bg-white'}`}
          >
            <Checkbox checked={all} />
            <ShieldCheck className={`mt-px size-5 shrink-0 ${all ? 'text-navy' : 'text-muted'}`} aria-hidden />
            <span className="flex-1">
              <span className={`block text-[15px] font-bold ${all ? 'text-navy' : 'text-ink'}`}>دسترسی کامل</span>
              <span className="mt-0.5 block text-[13.5px] leading-6 text-muted">همه مجوزهای زیر یکجا انتخاب می‌شوند.</span>
            </span>
          </button>

          <div className="relative mt-2">
            <ul className="flex flex-col gap-2">
              {visible.map((p) => {
                const on = chosen.includes(p.id)
                const locked = p.id === REQUIRED_PERMISSION
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => toggle(p.id)}
                      aria-pressed={on}
                      aria-disabled={locked}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3.5 text-right transition-colors ${
                        locked ? 'cursor-default border-line bg-surface' : on ? 'border-navy-600 bg-navy-50/60' : 'border-line bg-white'
                      }`}
                    >
                      <Checkbox checked={on} locked={locked} />
                      <span className="flex-1">
                        <span className={`block text-[14.5px] font-bold ${locked ? 'text-muted' : 'text-ink'}`}>
                          {p.title}
                          {locked && <span className="mr-1.5 text-[12px] font-medium">(الزامی)</span>}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-6 text-muted">{p.description}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {!expanded && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white" aria-hidden />}
          </div>

          <button
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="mx-auto mt-3 flex items-center gap-1.5 rounded-lg border border-navy px-4 py-2 text-[14px] font-bold text-navy hover:bg-navy-50"
          >
            {expanded ? 'نمایش کمتر' : `مشاهده همه مجوزها (${toFa(PERMISSIONS.length)})`}
            {expanded ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
          </button>
        </Section>

        <Section title="مدت اعتبار مجوز" subtitle="پس از این مدت، مجوز معتمد کیسان خودکار منقضی می‌شود.">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="مدت اعتبار">
            {DURATIONS.map((d) => {
              const on = d.id === durationId
              return (
                <button
                  key={d.id}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setDurationId(d.id)}
                  className={`h-11 rounded-lg border text-[14px] font-bold transition-colors ${on ? 'border-navy bg-navy text-white' : 'border-line bg-white text-muted hover:border-[#8a8f9c]'}`}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
          <div className="mt-3 rounded-lg border border-[#c9d3ea] bg-navy-50 p-3.5 text-[13.5px] leading-7">
            <p className="flex flex-wrap gap-x-4 text-muted">
              <span>
                مدت: <b className="font-bold text-navy">{duration.label}</b>
              </span>
              <span>
                معادل: <b className="font-bold text-ink">{toFa(duration.days)} روز</b>
              </span>
              <span>
                پایان اعتبار: <b className="font-bold text-ink">{endDate}</b>
              </span>
            </p>
          </div>
        </Section>

        <Section title="خلاصه درخواست">
          <dl className="grid gap-2.5 text-[14px]">
            {[
              ['پرونده', file.title],
              ['شماره اقتصادی', toFa(file.economicNumber)],
              ['مجوزها', all ? 'دسترسی کامل' : chosenTitles.join('، ')],
              ['مدت اعتبار', `${duration.label} (${toFa(duration.days)} روز)`],
              ['تاریخ پایان اعتبار', endDate],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-mist pb-2.5 last:border-0 last:pb-0">
                <dt className="shrink-0 text-muted">{k}</dt>
                <dd className="text-left font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>

      <BottomBar>
        <Button variant="outline" className="w-[36%] sm:w-40" onClick={onCancel}>
          انصراف
        </Button>
        <Button className="flex-1 sm:max-w-72" loading={sending} onClick={submit} icon={<ArrowLeft className="size-5" aria-hidden />}>
          ثبت درخواست و ادامه
        </Button>
      </BottomBar>
      <button onClick={onBack} className="mt-4 text-[14px] font-medium text-navy-600 underline-offset-4 hover:underline">
        بازگشت به پرونده‌ها
      </button>

      <OtpModal
        open={otpInfo !== null && memoryId === null}
        title="تأیید درخواست"
        subtitle="برای ثبت نهایی، کد تأیید سامانه مؤدیان را وارد کنید."
        info={
          <>
            سازمان امور مالیاتی کد تأیید را به شماره ثبت‌شده در پرونده مالیاتی شما{' '}
            <b className="font-bold text-ink" dir="ltr">
              {otpInfo}
            </b>{' '}
            پیامک کرده است.
          </>
        }
        submitLabel="ثبت و ادامه"
        onClose={() => setOtpInfo(null)}
        onSubmit={async (code) => {
          const r = await confirmKeysunAccess(file, code)
          setMemoryId(r.memoryId)
        }}
        onResend={async () => {
          const r = await requestKeysunAccess(file, chosen, duration)
          setOtpInfo(r.maskedMobile)
        }}
      />

      <Modal
        open={memoryId !== null}
        icon={
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ok-50 text-ok">
            <KeyRound className="size-5" aria-hidden />
          </span>
        }
        title="شناسه حافظه دریافت شد"
        subtitle="مجوز با موفقیت ایجاد شد و معتمد کیسان شناسه یکتای حافظه مالیاتی این پرونده را دریافت و ثبت کرد."
        footer={
          <Button block onClick={() => onNext(memoryId!)} icon={<ArrowLeft className="size-5" aria-hidden />}>
            ادامه به انتخاب نماینده
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
