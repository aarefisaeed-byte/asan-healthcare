import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'

type Variant = 'primary' | 'outline' | 'danger' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-navy text-white hover:bg-navy-700 disabled:bg-[#a9adb8] disabled:text-white',
  outline: 'bg-white text-ink border border-[#8a8f9c] hover:bg-surface disabled:text-[#a9adb8] disabled:border-line',
  danger: 'bg-danger text-white hover:brightness-95',
  ghost: 'text-navy-600 hover:bg-navy-50',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  loading?: boolean
  icon?: ReactNode
  block?: boolean
}

export function Button({ variant = 'primary', loading, icon, block, className = '', children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-bold transition-colors disabled:cursor-not-allowed ${variants[variant]} ${block ? 'w-full' : ''} ${className}`}
    >
      {children}
      {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : icon}
    </button>
  )
}

type ModalProps = {
  open: boolean
  onClose?: () => void
  title?: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  labelledBy?: string
}

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Modal({ open, onClose, title, subtitle, icon, children, footer }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    panel.current?.focus()
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="anim-fade fixed inset-0 z-50 flex items-end justify-center bg-[#0b1230]/55 sm:items-center sm:p-6" onClick={onClose}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="anim-sheet w-full max-w-[560px] rounded-t-2xl bg-white px-5 pt-5 shadow-2xl outline-none sm:rounded-xl sm:px-6"
        style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        {(title || onClose) && (
          <div className="flex items-start gap-3">
            {icon}
            <div className="min-w-0 flex-1">
              {title && <h2 className="text-lg font-bold text-ink">{title}</h2>}
              {subtitle && <p className="mt-1 text-[14px] leading-6 text-muted">{subtitle}</p>}
            </div>
            {onClose && (
              <button onClick={onClose} className="-m-2 rounded-lg p-2 text-ink hover:bg-surface" aria-label="بستن">
                <X className="size-5" />
              </button>
            )}
          </div>
        )}
        {children && <div className="mt-5">{children}</div>}
        {footer && <div className="mt-6 flex gap-3">{footer}</div>}
      </div>
    </div>
  )
}
