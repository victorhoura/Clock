import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { useInstallPrompt } from './useInstallPrompt'
import { InstallInstructions } from '../components/InstallInstructions'
import { Button } from '../components/ui/Button'

const DISMISS_KEY = 'install-banner-dismissed'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** Install entry points: a dismissible banner on phones and a button for the sidebar. */
export function useInstallApp() {
  const { mode, promptInstall } = useInstallPrompt()
  const [showHelp, setShowHelp] = useState(false)
  const [dismissed, setDismissed] = useState(readDismissed)

  const install = () => {
    if (mode === 'native') promptInstall()
    else setShowHelp(true)
  }

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore
    }
  }

  const modal = showHelp && mode ? <InstallInstructions mode={mode} onClose={() => setShowHelp(false)} /> : null

  const banner =
    mode && !dismissed ? (
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-indigo-200/70 bg-indigo-50 p-3 dark:border-indigo-500/25 dark:bg-indigo-500/10 md:hidden">
        <img src="/icons/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Instale o app</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Acesse direto da tela de início, em tela cheia.</p>
        </div>
        <Button size="sm" onClick={install}>
          Instalar
        </Button>
        <button
          onClick={dismiss}
          className="-mr-1 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Dispensar"
        >
          <X size={16} />
        </button>
      </div>
    ) : null

  // Kept available even after the banner is dismissed.
  const sidebarButton = mode ? (
    <button
      onClick={install}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-slate-100"
    >
      <Download size={18} />
      Instalar app
    </button>
  ) : null

  const headerButton = mode ? (
    <button
      onClick={install}
      className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
      aria-label="Instalar app"
      title="Instalar app"
    >
      <Download size={18} />
    </button>
  ) : null

  return { banner, sidebarButton, headerButton, modal }
}
