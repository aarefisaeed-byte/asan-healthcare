import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, FolderSearch, KeyRound, Lock, RotateCw } from 'lucide-react'
import { Button, Modal } from '../components/ui'
import { Badge, BottomBar, PageTitle, Stepper } from '../components/flow'
import { FILE_STATUS, fetchTaxFiles, type TaxFile, type User } from '../lib/api'
import { toFa } from '../lib/format'

type Props = {
  user: User
  files: TaxFile[] | null
  setFiles: (f: TaxFile[]) => void
  completed: string[]
  onCancel: () => void
  /** `hasKeysunMemory` → skip the permission step. */
  onNext: (file: TaxFile, hasKeysunMemory: boolean) => void
}

export function FilesStep({ user, files, setFiles, completed, onCancel, onNext }: Props) {
  const [loading, setLoading] = useState(files === null)
  const [selected, setSelected] = useState<string | null>(null)
  const [keysunNotice, setKeysunNotice] = useState<TaxFile | null>(null)

  const load = async () => {
    setLoading(true)
    setSelected(null)
    try {
      setFiles(await fetchTaxFiles(user))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (files === null) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const file = files?.find((f) => f.id === selected) ?? null

  const next = () => {
    if (!file) return
    if (file.keysunMemoryId) setKeysunNotice(file)
    else onNext(file, false)
  }

  return (
    <>
      <Stepper current={0} />
      <PageTitle title="پرونده‌های مالیاتی شما" subtitle="پرونده‌ای را که می‌خواهید برایش صورتحساب وکالتی فعال شود انتخاب کنید. در هر نوبت یک پرونده انتخاب می‌شود." />

      {loading && (
        <div className="mt-5 flex flex-col gap-3" aria-busy="true" aria-label="در حال دریافت پرونده‌ها">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[132px] animate-pulse rounded-xl bg-surface" />
          ))}
          <p className="text-center text-[13.5px] text-muted">در حال استعلام پرونده‌ها از سازمان امور مالیاتی…</p>
        </div>
      )}

      {!loading && files?.length === 0 && (
        <div className="mt-5 flex flex-col gap-4">
          <div role="alert" className="flex flex-col gap-3 rounded-xl border-r-4 border-danger bg-danger-50 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
              <p className="text-[14.5px] leading-7 text-ink">
                با کد ملی شما هیچ پرونده اقتصادی‌ای در سازمان امور مالیاتی یافت نشد. برای راهنمایی بیشتر با شماره{' '}
                <b className="font-bold" dir="ltr">
                  {toFa('021-91009610')}
                </b>{' '}
                تماس بگیرید.
              </p>
            </div>
            <Button variant="danger" className="w-fit self-end" onClick={load} icon={<RotateCw className="size-4" aria-hidden />}>
              تلاش مجدد
            </Button>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-line px-6 py-12 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-surface">
              <FolderSearch className="size-8 text-[#8a8f9c]" aria-hidden />
            </span>
            <p className="max-w-xs text-[14.5px] leading-7 text-muted">
              اگر پرونده مالیاتی شما به‌تازگی تشکیل شده، ممکن است تا چند روز در استعلام دیده نشود. پس از آن دوباره تلاش کنید.
            </p>
          </div>
        </div>
      )}

      {!loading && files && files.length > 0 && (
        <ul className="mt-5 grid gap-3 lg:grid-cols-2">
          {files.map((f, i) => {
            const st = FILE_STATUS[f.status]
            const isSel = selected === f.id
            const done = completed.includes(f.id)
            const memory = f.keysunMemoryId ?? f.memoryId
            return (
              <li
                key={f.id}
                className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors ${
                  isSel ? 'border-[#7fb49a] bg-ok-50' : st.selectable ? 'border-line bg-white' : 'border-line bg-surface'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className={`text-[16px] font-bold leading-7 ${st.selectable ? 'text-ink' : 'text-muted'}`}>
                    <span className="ml-1 font-medium text-muted">{toFa(i + 1)}.</span>
                    {f.title}
                  </h3>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                <dl className="grid gap-1.5 text-[14px]">
                  <div className="flex gap-1.5">
                    <dt className="text-muted">شماره اقتصادی:</dt>
                    <dd className="font-medium tabular-nums">{toFa(f.economicNumber)}</dd>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <dt className="text-muted">شناسه یکتای حافظه مالیاتی:</dt>
                    <dd className="font-medium tabular-nums" dir="ltr">
                      {memory ?? '—'}
                    </dd>
                    {f.keysunMemoryId && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-navy-50 px-1.5 py-0.5 text-[12px] font-medium text-navy">
                        <KeyRound className="size-3" aria-hidden />
                        معتمد کیسان
                      </span>
                    )}
                  </div>
                </dl>

                {done ? (
                  <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-ok">
                    <CheckCircle2 className="size-4" aria-hidden />
                    صورتحساب وکالتی این پرونده فعال شد.
                  </p>
                ) : st.selectable ? (
                  <Button
                    variant={isSel ? 'outline' : 'primary'}
                    className={`h-10 w-fit px-4 text-[14px] ${isSel ? 'border-[#7fb49a] !bg-white text-ok' : ''}`}
                    onClick={() => setSelected(isSel ? null : f.id)}
                    aria-pressed={isSel}
                    icon={isSel ? <Check className="size-4" aria-hidden /> : undefined}
                  >
                    {isSel ? 'انتخاب شد' : 'انتخاب پرونده'}
                  </Button>
                ) : (
                  <p className="flex items-center gap-1.5 text-[13.5px] text-muted">
                    <Lock className="size-4 shrink-0" aria-hidden />
                    {st.reason}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <BottomBar>
        <Button variant="outline" className="w-[36%] sm:w-40" onClick={onCancel}>
          انصراف
        </Button>
        <Button className="flex-1 sm:max-w-72" disabled={!file} onClick={next} icon={<ArrowLeft className="size-5" aria-hidden />}>
          ثبت و ادامه
        </Button>
      </BottomBar>

      <Modal
        open={!!keysunNotice}
        onClose={() => setKeysunNotice(null)}
        icon={
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-warn-50 text-warn">
            <KeyRound className="size-5" aria-hidden />
          </span>
        }
        title="شناسه حافظه فعال در کیسان دارید"
        subtitle={
          <>
            این پرونده شناسه یکتای حافظه مالیاتی فعال{' '}
            <b className="font-bold text-ink" dir="ltr">
              {keysunNotice?.keysunMemoryId}
            </b>{' '}
            در معتمد مالیاتی کیسان دارد و نیازی به اعطای دوباره مجوز نیست. مستقیم به انتخاب نماینده می‌روید.
          </>
        }
        footer={
          <Button
            block
            onClick={() => {
              const f = keysunNotice!
              setKeysunNotice(null)
              onNext(f, true)
            }}
            icon={<ArrowLeft className="size-5" aria-hidden />}
          >
            ادامه به انتخاب نماینده
          </Button>
        }
      />
    </>
  )
}
