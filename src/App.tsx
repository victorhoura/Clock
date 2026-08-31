import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Layout, type Tab } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { TimeClockPage } from './pages/TimeClockPage'
import { ActivitiesPage } from './pages/ActivitiesPage'
import { UsersPage } from './pages/UsersPage'
import { useApp } from './context/AppContext'

// TEMP DEBUG: destaca em vermelho qualquer elemento que ultrapasse a largura
// da tela, para localizar visualmente a causa do overflow horizontal mobile.
// Remover depois que o bug for identificado.
function useOverflowDebug(tab: Tab) {
  useEffect(() => {
    function scan() {
      const vw = document.documentElement.clientWidth
      let badge = document.getElementById('debug-overflow-badge')
      if (!badge) {
        badge = document.createElement('div')
        badge.id = 'debug-overflow-badge'
        badge.style.cssText =
          'position:fixed;top:0;left:0;right:0;z-index:99999;background:#dc2626;color:#fff;font-size:11px;padding:2px 6px;font-family:monospace;pointer-events:none;'
        document.body.appendChild(badge)
      }
      badge.textContent = `vw=${vw} scrollWidth=${document.documentElement.scrollWidth} bodyScrollWidth=${document.body.scrollWidth}`

      document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
        if (el.id === 'debug-overflow-badge') return
        const r = el.getBoundingClientRect()
        if (r.right > vw + 1 && r.width > 0) {
          el.style.outline = '3px solid red'
          el.style.outlineOffset = '-3px'
        }
      })
    }
    const id = setInterval(scan, 400)
    return () => {
      clearInterval(id)
      document.getElementById('debug-overflow-badge')?.remove()
    }
  }, [tab])
}

function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const { loading } = useApp()
  useOverflowDebug(tab)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-indigo-500" size={28} />
      </div>
    )
  }

  return (
    <Layout active={tab} onChange={setTab}>
      {tab === 'dashboard' && <DashboardPage />}
      {tab === 'ponto' && <TimeClockPage />}
      {tab === 'atividades' && <ActivitiesPage />}
      {tab === 'usuarios' && <UsersPage />}
    </Layout>
  )
}

export default App
