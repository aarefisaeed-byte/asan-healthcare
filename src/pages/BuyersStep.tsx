import { useEffect, useState } from 'react'
import { ArrowLeft, Building2, Check, ChevronDown, Hash, Search, SearchX, Type, X } from 'lucide-react'
import { Button, Modal } from '../components/ui'
import { BottomBar, PageTitle, Stepper } from '../components/flow'
import { grantPowerOfAttorney, searchBuyers, type Buyer, type TaxFile } from '../lib/api'
import { digitsOnly, toFa } from '../lib/format'

type Props = {
  file: TaxFile
  onCancel: () => void
  onDone: (buyers: Buyer[]) => void
}

export function BuyersStep({ file, onCancel, onDone }: Props) {
  const [econ, setEcon] = useState('')
  const [name, setName] = useState('')
  const [results, setResults] = useState<Buyer[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Buyer[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setSearching(true)
    try {
      setResults(await searchBuyers(econ, name))
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isSel = (b: Buyer) => selected.some((s) => s.id === b.id)
  const toggle = (b: Buyer) => setSelected((s) => (isSel(b) ? s.filter((x) => x.id !== b.id) : [...s, b]))

  const save = async () => {
    setSaving(true)
    try {
      await grantPowerOfAttorney(file, selected)
      onDone(selected)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Stepper current={2} />
      <PageTitle
        title="انتخاب نماینده صدور صورتحساب"
        subtitle={
          <>
            بیمارستان یا مرکز درمانی‌ای را که از طرف <b className="font-bold text-ink">{file.title}</b> صورتحساب صادر می‌کند، با شماره اقتصادی یا نام جست‌وجو و انتخاب کنید.
          </>
        }
      />

      <form onSubmit={run} className="mt-5 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="buyer-econ" className="text-[14px] font-bold">
            شماره اقتصادی نماینده
          </label>
          <div className="flex h-12 items-center gap-2 rounded-lg border border-[#b9bdc7] px-3 focus-within:border-navy-600">
            <Hash className="size-4 text-[#8a8f9c]" aria-hidden />
            <input
              id="buyer-econ"
              inputMode="numeric"
              dir="ltr"
              value={toFa(econ)}
              onChange={(e) => setEcon(digitsOnly(e.target.value).slice(0, 14))}
              placeholder="مثلاً ۱۰۱۰۰۴۵۲۳۱۰"
              className="h-full min-w-0 flex-1 bg-transparent text-right text-[16px] outline-none placeholder:text-[#a9adb8]"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="buyer-name" className="text-[14px] font-bold">
            نام نماینده
          </label>
          <div className="flex h-12 items-center gap-2 rounded-lg border border-[#b9bdc7] px-3 focus-within:border-navy-600">
            <Type className="size-4 text-[#8a8f9c]" aria-hidden />
            <input
              id="buyer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً بیمارستان آتیه"
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#a9adb8]"
            />
          </div>
        </div>
        <Button type="submit" loading={searching} className="sm:w-36" icon={<Search className="size-5" aria-hidden />}>
          جست‌وجو
        </Button>
      </form>

      {selected.length > 0 && (
        <div className="mt-4">
          <p className="text-[13.5px] font-bold text-muted">نمایندگان انتخاب‌شده ({toFa(selected.length)})</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {selected.map((b) => (
              <li key={b.id} className="flex items-center gap-1 rounded-full bg-navy py-1 pl-1 pr-3 text-[13.5px] font-medium text-white">
                {b.name}
                <button onClick={() => toggle(b)} className="grid size-6 place-items-center rounded-full hover:bg-white/15" aria-label={`حذف ${b.name}`}>
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[16px] font-bold">نمایندگان ثبت‌شده در کیسان</h2>
          {results && <span className="text-[13px] text-muted">{toFa(results.length)} مورد</span>}
        </div>

        {results && results.length === 0 && !searching && (
          <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-line px-6 py-10 text-center">
            <SearchX className="size-8 text-[#8a8f9c]" aria-hidden />
            <p className="text-[14.5px] font-bold">نماینده‌ای با این مشخصات پیدا نشد</p>
            <p className="max-w-xs text-[13.5px] leading-6 text-muted">شماره اقتصادی را دوباره بررسی کنید یا بخشی از نام را جست‌وجو کنید.</p>
          </div>
        )}

        <ul className={`mt-3 grid gap-3 lg:grid-cols-2 ${searching ? 'opacity-50' : ''}`}>
          {results?.map((b) => {
            const on = isSel(b)
            const expanded = open === b.id
            return (
              <li key={b.id} className={`rounded-xl border transition-colors ${on ? 'border-[#7fb49a] bg-ok-50' : 'border-line bg-white'}`}>
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => toggle(b)}
                    aria-pressed={on}
                    aria-label={`${on ? 'لغو انتخاب' : 'انتخاب'} ${b.name}`}
                    className={`grid size-6 shrink-0 place-items-center rounded-md border-2 ${on ? 'border-navy bg-navy text-white' : 'border-[#8a8f9c] bg-white'}`}
                  >
                    {on && <Check className="size-4" strokeWidth={3} aria-hidden />}
                  </button>
                  <button onClick={() => toggle(b)} className="min-w-0 flex-1 text-right">
                    <span className="block text-[15.5px] font-bold">{b.name}</span>
                    <span className="mt-0.5 block text-[13px] text-muted tabular-nums">شماره اقتصادی: {toFa(b.economicNumber)}</span>
                  </button>
                  <button
                    onClick={() => setOpen(expanded ? null : b.id)}
                    aria-expanded={expanded}
                    aria-label="جزئیات"
                    className="-m-2 rounded-lg p-2 text-muted hover:bg-surface"
                  >
                    <ChevronDown className={`size-5 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
                  </button>
                </div>
                {expanded && (
                  <dl className="anim-fade grid gap-1.5 border-t border-black/5 px-4 pb-4 pt-3 text-[13.5px]">
                    <div className="flex gap-1.5">
                      <dt className="shrink-0 text-muted">آدرس:</dt>
                      <dd>{b.address}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-muted">شماره تماس:</dt>
                      <dd dir="ltr" className="tabular-nums">
                        {toFa(b.phone)}
                      </dd>
                    </div>
                  </dl>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <BottomBar>
        <Button variant="outline" className="w-[36%] sm:w-40" onClick={onCancel}>
          انصراف
        </Button>
        <Button className="flex-1 sm:max-w-72" disabled={selected.length === 0} onClick={() => setConfirming(true)} icon={<ArrowLeft className="size-5" aria-hidden />}>
          {selected.length ? `ثبت ${toFa(selected.length)} نماینده` : 'ثبت و ادامه'}
        </Button>
      </BottomBar>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        icon={<Check className="mt-0.5 size-6 shrink-0 text-navy" aria-hidden />}
        title="تأیید نمایندگان"
        subtitle={`این نمایندگان اجازه صدور صورتحساب وکالتی برای «${file.title}» را می‌گیرند.`}
        footer={
          <>
            <Button variant="outline" className="w-[36%]" onClick={() => setConfirming(false)}>
              بازبینی
            </Button>
            <Button className="flex-1" loading={saving} onClick={save}>
              ثبت نهایی
            </Button>
          </>
        }
      >
        <ul className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto">
          {selected.map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-lg border border-line p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy-50 text-navy-600">
                <Building2 className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-[14.5px] font-bold">{b.name}</p>
                <p className="text-[13px] text-muted tabular-nums">شماره اقتصادی: {toFa(b.economicNumber)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
