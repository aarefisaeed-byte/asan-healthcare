import { useRef, useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  Clock3,
  FileCheck2,
  Link2,
  KeyRound,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Workflow,
} from 'lucide-react'
import { EnamadSeal } from '../components/EnamadSeal'
import { Logo } from '../components/Logo'
import { LoginCard } from '../components/LoginCard'
import type { User } from '../lib/api'

type Props = { onLoggedIn: (user: User) => void }

/** Decorative circuit traces echoing the logo, drawn faintly behind the hero. */
function Circuits({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 520" className={className} aria-hidden fill="none">
      <g stroke="currentColor" strokeWidth="14">
        <path d="M-20 60 H150" />
        <path d="M90 170 V300 L40 360 V540" />
        <path d="M160 230 V340 L110 390 V540" />
        <path d="M230 430 H420" />
      </g>
      <g fill="currentColor">
        <circle cx="150" cy="60" r="24" />
        <circle cx="90" cy="170" r="24" />
        <circle cx="160" cy="230" r="24" />
        <circle cx="230" cy="430" r="24" />
      </g>
    </svg>
  )
}

function SectionHead({ kicker, title, accent }: { kicker: string; title: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-bold text-sun-600">{kicker}</span>
      <h2 className="text-[26px] font-black leading-tight text-ink sm:text-3xl">
        {title} {accent && <span className="text-sun-600">{accent}</span>}
      </h2>
    </div>
  )
}

const audiences = [
  { icon: Stethoscope, title: 'پزشکان', text: 'صورتحساب خدمات شما را بیمارستان، کلینیک یا مرکز درمانی طرف قرارداد صادر می‌کند.' },
  { icon: Building2, title: 'مطب‌ها و کلینیک‌ها', text: 'صورتحساب‌هایتان را حسابدار یا نماینده مجموعه ثبت می‌کند و شما فقط نظارت می‌کنید.' },
  { icon: ShieldCheck, title: 'نمایندگان بیمه', text: 'ثبت و مدیریت صورتحساب‌ها را نماینده یا مجموعه دیگری از طرف شما انجام می‌دهد.' },
  { icon: UserRound, title: 'سایر کادر درمان', text: 'هر فعالی در حوزه درمان که صورتحساب الکترونیکی‌اش را شخص دیگری صادر می‌کند.' },
]

const benefits = [
  { icon: KeyRound, title: 'ثبت خودکار شناسه حافظه', text: 'شناسه یکتای حافظه مالیاتی را معتمد کیسان از طرف شما دریافت و ثبت می‌کند.' },
  { icon: Workflow, title: 'فرایند ساده', text: 'ثبت و مدیریت صورتحساب را نماینده انجام می‌دهد و درگیری شما به حداقل می‌رسد.' },
  { icon: Clock3, title: 'صرفه‌جویی در زمان', text: 'وقت خود را صرف بیماران کنید، نه فرم‌های مالیاتی.' },
  { icon: Link2, title: 'مطابق الزامات سازمان', text: 'ارسال صورتحساب از طریق معتمد مالیاتی کیسان و مطابق الزامات سازمان امور مالیاتی انجام می‌شود.' },
]

const steps = [
  { title: 'ورود با کد ملی', text: 'با کد ملی و شماره موبایل خود وارد شوید و کد تأیید را بزنید.' },
  { title: 'انتخاب پرونده', text: 'پرونده مالیاتی مطب یا فعالیت خود را از فهرست انتخاب کنید.' },
  { title: 'اعطای مجوز', text: 'با کد پیامکی سازمان، به معتمد کیسان اجازه دریافت شناسه یکتای حافظه مالیاتی را بدهید.' },
  { title: 'انتخاب نماینده', text: 'بیمارستان یا مرکز درمانی که صورتحساب شما را صادر می‌کند، انتخاب کنید.' },
]

const faqs = [
  {
    q: 'آیا برای تعداد یا مبلغ صورتحساب وکالتی محدودیتی وجود دارد؟',
    a: 'خیر. تا زمانی که نماینده (خریدار) مجاز به صدور صورتحساب برای شما باشد، هر تعداد صورتحساب با هر مبلغی صادر می‌شود.',
  },
  {
    q: 'اگر صورتحساب وکالتی اشتباه صادر شود، چطور اصلاح یا ابطال می‌شود؟',
    a: 'اصلاح یا ابطال فقط از سمت صادرکننده یعنی نماینده (خریدار) امکان‌پذیر است. کافی است به مجموعه صادرکننده اطلاع دهید.',
  },
  {
    q: 'از کجا ببینم چه صورتحساب‌هایی برای من صادر شده است؟',
    a: 'صورتحساب‌های صادرشده برای شما در کارپوشه سامانه مؤدیان و در بخش «صورتحساب‌های ثبت‌شده برای من» قابل مشاهده است.',
  },
  {
    q: 'اگر دسترسی را دیرتر به نماینده بدهم، صورتحساب‌های قبلی هم صادر می‌شود؟',
    a: 'خیر. صورتحساب فقط از زمانی صادر می‌شود که شما دسترسی را به نماینده داده باشید.',
  },
]

const stats = [
  { value: '+۵۵٬۰۰۰', label: 'کسب‌وکار فعال' },
  { value: '+۲۰۰K', label: 'صورتحساب ثبت‌شده' },
  { value: '۹۹٪', label: 'رضایت کاربران' },
]

export function Landing({ onLoggedIn }: Props) {
  const loginRef = useRef<HTMLDivElement>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const goToLogin = () => {
    loginRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => document.getElementById('national-code')?.focus({ preventScroll: true }), 450)
  }

  return (
    <div className="min-h-dvh bg-white">
      {/* HERO */}
      <header className="relative overflow-hidden bg-[linear-gradient(160deg,#0e225b_0%,#12296b_55%,#1a3a8c_100%)] text-white">
        <Circuits className="pointer-events-none absolute -left-24 top-24 w-[340px] text-white/[0.05] sm:w-[440px]" />
        <Circuits className="pointer-events-none absolute -right-40 -top-10 hidden w-[380px] rotate-180 text-white/[0.04] lg:block" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6" style={{ paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))' }}>
          <nav className="flex items-center py-2">
            <Logo tone="light" size="sm" />
          </nav>

          <div className="grid items-center gap-5 pb-6 pt-3 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-20 lg:pt-14">
            <div className="flex flex-col gap-2 lg:gap-5">
              <span className="hidden w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[13px] font-medium text-white/90 lg:inline-flex">
                <Stethoscope className="size-4 text-sun" aria-hidden />
                ویژه پزشکان و مراکز درمانی
              </span>
              <h1 className="text-[28px] font-black leading-[1.35] sm:text-5xl lg:text-6xl">
                صدور صورتحساب
                <br />
                <span className="text-sun">ویژه حوزه درمان</span>
              </h1>
              <p className="max-w-md text-[14.5px] leading-7 text-white/80 lg:text-[16px] lg:leading-8 [@media(max-height:620px)]:hidden">
                صورتحساب خدمات شما را بیمارستان طرف قرارداد ثبت می‌کند؛ ساده و بدون دردسر.
              </p>
              <ul className="hidden flex-col gap-2.5 text-[15px] text-white/90 lg:flex">
                {['دریافت خودکار شناسه یکتای حافظه مالیاتی', 'ثبت توسط بیمارستان یا مرکز درمانی طرف قرارداد', 'مطابق الزامات سازمان امور مالیاتی'].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-sun text-navy">
                      <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <LoginCard ref={loginRef} onLoggedIn={onLoggedIn} />
          </div>

          <dl className="hidden grid-cols-3 gap-2 border-t border-white/10 py-8 text-center lg:grid">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-1">
                <dt className="order-2 text-[12.5px] text-sun/90 sm:text-sm">{s.label}</dt>
                <dd className="order-1 text-xl font-black sm:text-2xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <main>
        {/* CONCEPT */}
        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-20">
          <div className="flex flex-col gap-4">
            <SectionHead kicker="مفهوم" title="صورتحساب وکالتی" accent="چیست؟" />
            <p className="max-w-prose text-[15.5px] leading-8 text-muted">
              اگر با بیمارستان، کلینیک یا مرکز درمانی‌ای کار می‌کنید که طبق توافق، ثبت صورتحساب را بر عهده می‌گیرد، این مسیر برای شماست. در این حالت
              مرکز درمانی به‌عنوان خریدار، صورتحساب را از طرف شما ثبت می‌کند و شما آن را در کارپوشه خود در سامانه مؤدیان می‌بینید.
            </p>
          </div>
          <ol className="relative flex flex-col gap-6 border-r-2 border-navy-50 pr-8">
            {[
              { t: 'مناسب برای', d: 'پزشکان و کادر درمانی که مرکز درمانی طرف قراردادشان مسئولیت ثبت صورتحساب را می‌پذیرد.' },
              { t: 'نیازمندی', d: 'داشتن پرونده مالیاتی و اعطای مجوز به معتمد مالیاتی کیسان و نماینده.' },
              { t: 'مزیت', d: 'حذف دغدغه فنی برای شما و کاهش خطای مغایرت در صورتحساب‌ها.' },
            ].map((x, i) => (
              <li key={x.t} className="relative">
                <span className="absolute -right-[49px] top-0 grid size-8 place-items-center rounded-full bg-navy text-[14px] font-bold text-white ring-4 ring-white">
                  {['۱', '۲', '۳'][i]}
                </span>
                <h3 className="text-[16px] font-bold">{x.t}</h3>
                <p className="mt-1 text-[14.5px] leading-7 text-muted">{x.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* AUDIENCE */}
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:pb-20">
          <SectionHead kicker="مخاطبان" title="برای چه کسانی مناسب است؟" />
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {audiences.map(({ icon: Icon, title, text }) => (
              <article key={title} className="flex gap-4 rounded-xl border border-line p-4 sm:flex-col sm:p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-navy text-white">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-[16px] font-bold">{title}</h3>
                  <p className="mt-1 text-[14px] leading-7 text-muted">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* BENEFITS */}
        <section className="bg-navy-50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            <SectionHead kicker="مزایا" title="چرا آسان؟" />
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
              {benefits.map(({ icon: Icon, title, text }) => (
                <article key={title} className="flex gap-4 rounded-xl bg-white p-4 sm:flex-col sm:p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-sun/25 text-navy">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-[16px] font-bold">{title}</h3>
                    <p className="mt-1 text-[14px] leading-7 text-muted">{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* STEPS */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <SectionHead kicker="فرایند" title="چهار مرحله تا شروع" />
          <ol className="mt-8 grid gap-6 lg:grid-cols-4 lg:gap-4">
            {steps.map((s, i) => (
              <li key={s.title} className="relative flex gap-4 lg:flex-col lg:items-center lg:text-center">
                {i < steps.length - 1 && (
                  <span className="absolute right-[21px] top-12 h-[calc(100%-12px)] w-0.5 bg-navy-50 lg:right-auto lg:left-[-50%] lg:top-[21px] lg:h-0.5 lg:w-full" aria-hidden />
                )}
                <span
                  className={`relative z-10 grid size-11 shrink-0 place-items-center rounded-full text-[16px] font-black ${
                    i === 0 ? 'bg-navy text-white' : 'border-2 border-navy-50 bg-white text-navy'
                  }`}
                >
                  {['۱', '۲', '۳', '۴'][i]}
                </span>
                <div>
                  <h3 className="text-[16px] font-bold">{s.title}</h3>
                  <p className="mt-1 text-[14px] leading-7 text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="bg-navy text-white">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
            <h2 className="text-center text-[26px] font-black sm:text-3xl">سؤالات متداول</h2>
            <p className="mt-2 text-center text-[14.5px] text-white/70">پاسخ پرسش‌های رایج درباره صورتحساب وکالتی</p>
            <div className="mt-8 flex flex-col">
              {faqs.map((f, i) => {
                const open = openFaq === i
                return (
                  <div key={f.q} className="border-b border-white/15">
                    <button
                      id={`faq-${i}`}
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-4 py-5 text-right text-[15.5px] font-bold"
                    >
                      {f.q}
                      <ChevronDown className={`size-5 shrink-0 text-sun transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                    </button>
                    {open && <p className="anim-fade pb-5 text-[14.5px] leading-8 text-white/75">{f.a}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0e225b,#1d3c8f)] px-6 py-10 text-center text-white sm:px-10">
            <Circuits className="pointer-events-none absolute -bottom-24 -left-16 w-[260px] text-white/[0.06]" />
            <h2 className="relative text-[24px] font-black leading-snug sm:text-3xl">آماده شروع با آسان هستید؟</h2>
            <p className="relative mx-auto mt-3 max-w-md text-[14.5px] leading-7 text-white/80">
              اگر صورتحساب‌های شما را مرکز درمانی یا نماینده دیگری صادر می‌کند، همین حالا در چند دقیقه فعالش کنید.
            </p>
            <button
              onClick={goToLogin}
              className="relative mt-6 inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-[15px] font-bold text-navy hover:bg-mist"
            >
              شروع درخواست
              <ArrowLeft className="size-5" aria-hidden />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-right">
          <Logo size="sm" />
          <p className="flex items-center gap-1.5 text-[13px] text-muted">
            <FileCheck2 className="size-4" aria-hidden />
            ارسال صورتحساب از طریق معتمد مالیاتی کیسان
            <BadgeCheck className="size-4 text-navy-600" aria-hidden />
          </p>
          <EnamadSeal />
        </div>
      </footer>
    </div>
  )
}
