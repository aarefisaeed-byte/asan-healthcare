import type { ReactNode } from 'react'
import { Check, LogOut } from 'lucide-react'
import { Button, Modal } from './ui'
import { toFa } from '../lib/format'

export const STEPS = ['پرونده‌های من', 'مجوز دسترسی کیسان', 'انتخاب نماینده']

/** Compact three-step progress that fits a phone width. */
export function Stepper({ current }: { current: number }) {
  return (
    <nav aria-label="مراحل" className="mt-5">
      <ol className="flex items-start">
        {STEPS.map((label, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={label} className="relative flex flex-1 flex-col items-center gap-1.5 text-center">
              {i > 0 && (
                // connector from the previous step's circle to this one (previous sits on the inline-start side)
                <span className={`absolute top-4 h-0.5 -translate-y-1/2 ${i <= current ? 'bg-navy' : 'bg-line'}`} style={{ insetInlineStart: '-50%', width: '100%' }} aria-hidden />
              )}
              <span
                className={`relative z-10 grid size-8 place-items-center rounded-full text-[14px] font-bold ring-4 ring-white ${
                  done ? 'bg-navy text-white' : active ? 'bg-navy text-white shadow-[0_0_0_3px_rgba(29,60,143,0.2)]' : 'bg-mist text-muted'
                }`}
                aria-current={active ? 'step' : undefined}
              >
                {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : toFa(i + 1)}
              </span>
              <span className={`text-[12.5px] leading-5 ${active ? 'font-bold text-ink' : done ? 'text-navy' : 'text-muted'}`}>{label}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mt-7">
      <h1 className="text-[20px] font-black text-ink sm:text-2xl">{title}</h1>
      {subtitle && <p className="mt-1.5 max-w-prose text-[14.5px] leading-7 text-muted">{subtitle}</p>}
    </div>
  )
}

/** Primary actions pinned to the bottom of the screen (per PRD, on tablet and mobile). */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex max-w-6xl gap-3 px-4 py-3 sm:px-6">{children}</div>
    </div>
  )
}

export function Section({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-white p-4 sm:p-5 ${className}`}>
      <h2 className="text-[16px] font-bold">{title}</h2>
      {subtitle && <p className="mt-1 text-[13.5px] text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

const tones = {
  ok: 'bg-ok-50 text-ok',
  neutral: 'bg-mist text-[#454b5c]',
  warn: 'bg-warn-50 text-warn',
  danger: 'bg-danger-50 text-danger',
}

export function Badge({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[12.5px] font-medium ${tones[tone]}`}>{children}</span>
}

export function ExitConfirm({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      icon={
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-danger-50 text-danger">
          <LogOut className="size-5 -scale-x-100" aria-hidden />
        </span>
      }
      title="انصراف و خروج"
      subtitle="اطلاعاتی که در این مراحل وارد کرده‌اید ذخیره نمی‌شود. از خروج مطمئن هستید؟"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            ادامه فرایند
          </Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm}>
            خروج
          </Button>
        </>
      }
    />
  )
}

/** 1405/11/07 style Jalali date, in Persian digits. */
export function jalali(date: Date): string {
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
