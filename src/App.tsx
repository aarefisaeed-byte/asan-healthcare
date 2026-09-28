import { useEffect, useState } from 'react'
import { FolderSearch } from 'lucide-react'
import { Landing } from './pages/Landing'
import { AppShell } from './components/AppShell'
import type { User } from './lib/api'

export default function App() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [user])

  if (!user) return <Landing onLoggedIn={setUser} />

  return (
    <AppShell user={user} onLogout={() => setUser(null)}>
      {/* Step 2 (file selection) is built in the next stage. */}
      <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
        <FolderSearch className="size-10 text-navy-600" aria-hidden />
        <h1 className="text-xl font-bold">ورود با موفقیت انجام شد</h1>
        <p className="max-w-sm text-[14.5px] leading-7 text-muted">صفحه انتخاب پرونده مالیاتی در قدم بعدی ساخته می‌شود.</p>
      </div>
    </AppShell>
  )
}
