import { useCallback, useEffect, useState } from 'react'
import { Landing } from './pages/Landing'
import { FilesStep } from './pages/FilesStep'
import { PermissionStep } from './pages/PermissionStep'
import { BuyersStep } from './pages/BuyersStep'
import { SuccessStep } from './pages/SuccessStep'
import { AppShell } from './components/AppShell'
import { ExitConfirm } from './components/flow'
import { FILE_STATUS, type Buyer, type TaxFile, type User } from './lib/api'

type Screen = 'files' | 'permission' | 'buyers' | 'success'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [screen, setScreen] = useState<Screen>('files')
  const [files, setFiles] = useState<TaxFile[] | null>(null)
  const [file, setFile] = useState<TaxFile | null>(null)
  const [memoryId, setMemoryId] = useState<string | null>(null)
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [completed, setCompleted] = useState<string[]>([])
  const [exitOpen, setExitOpen] = useState(false)

  const reset = useCallback(() => {
    setUser(null)
    setScreen('files')
    setFiles(null)
    setFile(null)
    setMemoryId(null)
    setBuyers([])
    setCompleted([])
    setExitOpen(false)
  }, [])

  /** Move forward and record it, so the phone's back button walks back through the steps. */
  const go = useCallback((s: Screen) => {
    setScreen(s)
    try {
      history.pushState({ screen: s }, '')
    } catch {
      /* history may be unavailable in embedded previews */
    }
  }, [])

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { screen?: Screen } | null)?.screen
      if (!s) return reset()
      setScreen(s === 'success' ? 'files' : s)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [reset])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [user, screen])

  if (!user)
    return (
      <Landing
        onLoggedIn={(u) => {
          setUser(u)
          go('files')
        }}
      />
    )

  const remaining = (files ?? []).filter((f) => FILE_STATUS[f.status].selectable && !completed.includes(f.id)).length

  return (
    <AppShell user={user} onLogout={() => setExitOpen(true)}>
      {screen === 'files' && (
        <FilesStep
          user={user}
          files={files}
          setFiles={setFiles}
          completed={completed}
          onCancel={() => setExitOpen(true)}
          onNext={(f, hasKeysun) => {
            setFile(f)
            setMemoryId(hasKeysun ? f.keysunMemoryId ?? null : null)
            go(hasKeysun ? 'buyers' : 'permission')
          }}
        />
      )}

      {screen === 'permission' && file && (
        <PermissionStep
          file={file}
          onCancel={() => setExitOpen(true)}
          onBack={() => go('files')}
          onNext={(id) => {
            setMemoryId(id)
            go('buyers')
          }}
        />
      )}

      {screen === 'buyers' && file && (
        <BuyersStep
          file={file}
          onCancel={() => setExitOpen(true)}
          onDone={(b) => {
            setBuyers(b)
            setCompleted((c) => [...c, file.id])
            go('success')
          }}
        />
      )}

      {screen === 'success' && file && (
        <SuccessStep
          file={file}
          memoryId={memoryId}
          buyers={buyers}
          remaining={remaining}
          onAnother={() => {
            setFile(null)
            go('files')
          }}
          onFinish={reset}
        />
      )}

      <ExitConfirm open={exitOpen} onCancel={() => setExitOpen(false)} onConfirm={reset} />
    </AppShell>
  )
}
