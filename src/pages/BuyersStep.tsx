import { useMemo, useState } from 'react'
import { ArrowLeft, Building2, Check, MapPin, Phone, Search, SearchX, X } from 'lucide-react'
import { Button, Modal } from '../components/ui'
import { BottomBar, PageTitle, Stepper } from '../components/flow'
import { ALL_BUYERS, grantPowerOfAttorney, searchBuyers, type Buyer, type TaxFile } from '../lib/api'
import { toFa } from '../lib/format'

type Props = {
  file: TaxFile
  onCancel: () => void
  onDone: (buyers: Buyer[]) => void
}

const PAGE = 20

export function BuyersStep({ file, onCancel, onDone }: Props) {
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [selected, setSelected] = useState<Buyer[]>([])
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)

  const results = useMemo(() => searchBuyers(query), [query])
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
      <PageTitle title="انتخاب بیمارستان" subtitle="بیمارستانی را که از طرف شما صورتحساب صادر می‌کند جست‌وجو و انتخاب کنید." />

      <div className="sticky z-20 -mx-4 mt-4 bg-white px-4 pb-3 pt-1 sm:-mx-6 sm:px-6" style={{ top: 'calc(64px + env(safe-area-inset-top, 0px))' }}>
        <label htmlFor="buyer-search" className="sr-only">
          جست‌وجوی بیمارستان
        </label>
        <div className="flex h-12 items-center gap-2 rounded-xl border border-[#b9bdc7] bg-white px-3 focus-within:border-navy-600">
          <Search className="size-5 text-[#8a8f9c]" aria-hidden />
          <input
            id="buyer-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShown(PAGE)
            }}
            placeholder="نام بیمارستان یا محله، مثلاً آتیه یا ونک"
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#a9adb8]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="-m-1 rounded-md p-1 text-muted hover:bg-surface" aria-label="پاک کردن جست‌وجو">
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>

        {selected.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="بیمارستان‌های انتخاب‌شده">
            {selected.map((b) => (
              <li key={b.id} className="flex items-center gap-1 rounded-full bg-navy py-1 pl-1 pr-3 text-[13px] font-medium text-white">
                {b.name.replace(/^بیمارستان\s+/, '')}
                <button onClick={() => toggle(b)} className="grid size-6 place-items-center rounded-full hover:bg-white/15" aria-label={`حذف ${b.name}`}>
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-1 text-[13px] text-muted">
        {query ? `${toFa(results.length)} نتیجه` : `${toFa(ALL_BUYERS.length)} بیمارستان و مرکز درمانی تهران`}
      </p>

      {results.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-line px-6 py-10 text-center">
          <SearchX className="size-8 text-[#8a8f9c]" aria-hidden />
          <p className="text-[14.5px] font-bold">بیمارستانی با این نام پیدا نشد</p>
          <p className="max-w-xs text-[13.5px] leading-6 text-muted">بخشی از نام را بنویسید، مثلاً «میلاد» به‌جای «بیمارستان میلاد».</p>
        </div>
      ) : (
        <ul className="mt-3 grid gap-2 lg:grid-cols-2">
          {results.slice(0, shown).map((b) => {
            const on = isSel(b)
            return (
              <li key={b.id}>
                <button
                  onClick={() => toggle(b)}
                  aria-pressed={on}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-right transition-colors ${on ? 'border-[#7fb49a] bg-ok-50' : 'border-line bg-white hover:border-[#b9bdc7]'}`}
                >
                  <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 ${on ? 'border-navy bg-navy text-white' : 'border-[#8a8f9c] bg-white'}`} aria-hidden>
                    {on && <Check className="size-4" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold leading-6">{b.name}</span>
                    <span className="mt-1 flex items-start gap-1 text-[13px] leading-6 text-muted">
                      <MapPin className="mt-1 size-3.5 shrink-0" aria-hidden />
                      <span className="line-clamp-2">{b.address}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
                      <Phone className="size-3.5 shrink-0" aria-hidden />
                      <span dir="ltr">{toFa(b.phone)}</span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {results.length > shown && (
        <button onClick={() => setShown((n) => n + PAGE)} className="mx-auto mt-4 block rounded-lg border border-navy px-5 py-2 text-[14px] font-bold text-navy hover:bg-navy-50">
          نمایش بیشتر ({toFa(results.length - shown)})
        </button>
      )}

      <BottomBar>
        <Button variant="outline" className="w-[36%] sm:w-40" onClick={onCancel}>
          انصراف
        </Button>
        <Button className="flex-1 sm:max-w-72" disabled={selected.length === 0} onClick={() => setConfirming(true)} icon={<ArrowLeft className="size-5" aria-hidden />}>
          {selected.length ? `ثبت ${toFa(selected.length)} بیمارستان` : 'یک بیمارستان انتخاب کنید'}
        </Button>
      </BottomBar>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        icon={<Check className="mt-0.5 size-6 shrink-0 text-navy" aria-hidden />}
        title="تأیید انتخاب"
        subtitle={`این بیمارستان‌ها اجازه صدور صورتحساب وکالتی برای «${file.title}» را می‌گیرند.`}
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
              <div className="min-w-0">
                <p className="text-[14.5px] font-bold">{b.name}</p>
                <p className="truncate text-[13px] text-muted">{b.address}</p>
              </div>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
