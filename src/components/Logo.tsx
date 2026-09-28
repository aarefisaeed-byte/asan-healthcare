type MarkProps = { className?: string; title?: string; tone?: 'dark' | 'light' }

/** The Asan triangle mark with yellow circuit traces. */
export function LogoMark({ className, title = 'آسان', tone = 'dark' }: MarkProps) {
  // On navy backgrounds the triangle turns white and the traces navy, as on the brand's dark mockups.
  const body = tone === 'light' ? '#FFFFFF' : '#0E225B'
  const trace = tone === 'light' ? '#0E225B' : '#FFC34A'
  return (
    <svg viewBox="0 0 675 702" className={className} role="img" aria-label={title}>
      <defs>
        <clipPath id={`asan-clip-${tone}`}>
          <polygon points="268,0 408,0 675,702 0,702" />
        </clipPath>
      </defs>
      <polygon points="268,0 408,0 675,702 0,702" fill={body} />
      <g clipPath={`url(#asan-clip-${tone})`} fill="none" stroke={trace} strokeWidth="28">
        <path d="M370 200 H700" />
        <path d="M417 330 V480 L355 556 V702" />
        <path d="M492 398 V540 L418 612 V702" />
        <path d="M568 607 H700" />
      </g>
      <g fill={trace}>
        <circle cx="370" cy="200" r="32" />
        <circle cx="417" cy="330" r="32" />
        <circle cx="492" cy="398" r="32" />
        <circle cx="568" cy="607" r="32" />
      </g>
    </svg>
  )
}

type LogoProps = { tone?: 'dark' | 'light'; size?: 'sm' | 'md' | 'lg'; className?: string }

/** Mark + «آسان» wordmark. `tone="light"` is for navy backgrounds. */
export function Logo({ tone = 'dark', size = 'md', className = '' }: LogoProps) {
  const mark = { sm: 'h-7', md: 'h-9', lg: 'h-12' }[size]
  const word = { sm: 'text-2xl', md: 'text-3xl', lg: 'text-4xl' }[size]
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark tone={tone} className={`${mark} w-auto`} />
      <span className={`${word} font-black leading-none ${tone === 'light' ? 'text-white' : 'text-navy'}`}>آسان</span>
    </span>
  )
}
