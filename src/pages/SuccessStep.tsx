import { Check, FolderOpen, Home } from 'lucide-react'
import { Button } from '../components/ui'
import type { Buyer, TaxFile } from '../lib/api'
import { toFa } from '../lib/format'

type Props = {
  file: TaxFile
  memoryId: string | null
  buyers: Buyer[]
  /** Other files the user can still set up. */
  remaining: number
  onAnother: () => void
  onFinish: () => void
}

export function SuccessStep({ file, memoryId, buyers, remaining, onAnother, onFinish }: Props) {
  return (
    <div className="mx-auto mt-8 max-w-lg">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-white px-5 pb-6 pt-8 text-center">
        <div className="pointer-events-none absolute -left-6 -top-6 grid grid-cols-2 gap-2 opacity-60" aria-hidden>
          <span className="size-14 rounded-lg bg-navy-50" />
          <span className="size-14 rounded-lg bg-sun/20" />
          <span className="size-14 rounded-lg bg-sun/10" />
          <span className="size-14 rounded-lg bg-navy-50/70" />
        </div>
        <span className="relative mx-auto grid size-16 place-items-center rounded-full bg-ok-50 text-ok">
          <Check className="size-8" strokeWidth={2.5} aria-hidden />
        </span>
        <h1 className="relative mt-4 text-[21px] font-black">صورتحساب وکالتی فعال شد</h1>
        <p className="relative mt-2 text-[14.5px] leading-7 text-muted">
          از این پس بیمارستان‌های انتخاب‌شده می‌توانند برای «{file.title}» صورتحساب صادر کنند و صورتحساب‌ها از طریق معتمد مالیاتی کیسان ارسال می‌شوند.
        </p>

        <dl className="relative mt-5 grid gap-2.5 rounded-xl bg-surface p-4 text-right text-[14px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">شماره اقتصادی</dt>
            <dd className="font-medium tabular-nums">{toFa(file.economicNumber)}</dd>
          </div>
          {memoryId && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">شناسه حافظه (کیسان)</dt>
              <dd className="font-bold tracking-widest text-navy" dir="ltr">
                {memoryId}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted">بیمارستان‌ها</dt>
            <dd className="text-left font-medium">{buyers.map((b) => b.name).join('، ')}</dd>
          </div>
        </dl>

        {remaining > 0 ? (
          <>
            <p className="relative mt-6 text-[15px] font-bold">
              {toFa(remaining)} پرونده دیگر دارید. می‌خواهید برای آن‌ها هم این فرایند را انجام دهید؟
            </p>
            <div className="relative mt-4 flex gap-3">
              <Button variant="outline" className="w-[36%]" onClick={onFinish}>
                خروج
              </Button>
              <Button className="flex-1" onClick={onAnother} icon={<FolderOpen className="size-5" aria-hidden />}>
                مدیریت پرونده دیگر
              </Button>
            </div>
          </>
        ) : (
          <Button block className="relative mt-6" onClick={onFinish} icon={<Home className="size-5" aria-hidden />}>
            بازگشت به صفحه اصلی
          </Button>
        )}
      </div>
    </div>
  )
}
