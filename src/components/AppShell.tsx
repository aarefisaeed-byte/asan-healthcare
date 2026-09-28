import type { ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { Logo } from './Logo'
import type { User } from '../lib/api'

type Props = { user: User; onLogout: () => void; children: ReactNode }

/** Header + welcome line shared by every signed-in step. */
export function AppShell({ user, onLogout, children }: Props) {
  return (
    <div className="min-h-dvh bg-white">
      <header
        className="sticky z-30 border-b border-line bg-white/95 backdrop-blur"
        style={{ top: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="hidden border-r border-line pr-3 text-[12.5px] leading-5 text-muted sm:block">
              ارسال از طریق
              <br />
              معتمد مالیاتی کیسان
            </span>
          </div>
          <button onClick={onLogout} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[14px] font-medium text-danger hover:bg-danger-50">
            <LogOut className="size-4 -scale-x-100" aria-hidden />
            خروج
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-5 sm:px-6">
        <p className="text-[14.5px] text-muted">
          {user.fullName ? (
            <>
              <b className="font-bold text-navy">{user.fullName}</b>، به آسان خوش آمدید.
            </>
          ) : (
            'به آسان خوش آمدید.'
          )}
        </p>
        {children}
      </div>
    </div>
  )
}
