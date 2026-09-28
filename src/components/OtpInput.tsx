import { useRef } from 'react'
import { digitsOnly, toFa } from '../lib/format'

type Props = {
  length: number
  value: string
  onChange: (v: string) => void
  invalid?: boolean
  disabled?: boolean
  autoFocus?: boolean
}

/** Separate digit boxes, typed left-to-right like the SMS code. Supports paste and SMS autofill. */
export function OtpInput({ length, value, onChange, invalid, disabled, autoFocus }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  const setAt = (index: number, raw: string) => {
    const incoming = digitsOnly(raw)
    if (!incoming) return
    const chars = value.padEnd(length, ' ').split('')
    let i = index
    for (const d of incoming) {
      if (i >= length) break
      chars[i++] = d
    }
    onChange(chars.join('').replace(/\s/g, '').slice(0, length))
    refs.current[Math.min(i, length - 1)]?.focus()
  }

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (value[index]) onChange(value.slice(0, index) + value.slice(index + 1))
      else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index))
        refs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft') refs.current[Math.min(index + 1, length - 1)]?.focus()
    else if (e.key === 'ArrowRight') refs.current[Math.max(index - 1, 0)]?.focus()
  }

  return (
    <div dir="ltr" className="flex justify-center gap-2 sm:gap-3">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          ref={(el) => {
            refs.current[i] = el
          }}
          value={value[i] ? toFa(value[i]) : ''}
          onChange={(e) => setAt(i, e.target.value.slice(-1))}
          onPaste={(e) => {
            e.preventDefault()
            setAt(0, e.clipboardData.getData('text'))
          }}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          aria-label={`رقم ${toFa(i + 1)} کد تأیید`}
          className={`aspect-square w-full max-w-14 rounded-lg border-2 bg-white text-center text-2xl font-bold text-ink outline-none transition-colors focus:border-navy-600 disabled:bg-surface ${
            invalid ? 'border-danger' : value[i] ? 'border-navy' : 'border-[#b9bdc7]'
          }`}
        />
      ))}
    </div>
  )
}
