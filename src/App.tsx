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
          'position:fixed;top:0;left:0;right:0;z-index:99999;background:#dc2626;color:#fff;font-size:9px;line-height:1.35;padding:4px 6px;font-family:monospace;pointer-events:none;white-space:pre-wrap;max-height:60vh;overflow:auto;'
        document.body.appendChild(badge)
      }

      // Relatório direto: largura de <main> e de cada filho direto dele
      // (blocos irmãos sempre herdam a mesma largura ambiente, então isso
      // não aponta a causa, só o formato), e de cada Card + da tabela
      // (candidata mais forte, mesmo tendo overflow-x-auto).
      const report: string[] = [`vw=${vw}`]
      const mainEl = document.querySelector('main')
      if (mainEl) {
        report.push(`<main> w=${Math.round(mainEl.getBoundingClientRect().width)}`)
        Array.from(mainEl.children).forEach((c, i) => {
          const cls = (c.getAttribute('class') || '').trim().split(/\s+/).slice(0, 2).join('.')
          report.push(`  child[${i}] <${c.tagName.toLowerCase()}.${cls}> w=${Math.round(c.getBoundingClientRect().width)}`)
        })
      }
      report.push('--- cards ---')
      document.querySelectorAll<HTMLElement>('.rounded-2xl').forEach((card, i) => {
        report.push(`Card[${i}] w=${Math.round(card.getBoundingClientRect().width)} sw=${card.scrollWidth}`)
      })
      const table = document.querySelector('table')
      if (table) {
        report.push('--- tabela ---')
        report.push(`<table> w=${Math.round(table.getBoundingClientRect().width)} scrollWidth=${table.scrollWidth}`)
        const wrapper = table.parentElement
        if (wrapper) {
          report.push(`wrapper(overflow-x-auto) w=${Math.round(wrapper.getBoundingClientRect().width)} scrollWidth=${wrapper.scrollWidth}`)
        }
      }

      badge.textContent = report.join('\n')
    }
    const id = setInterval(scan, 500)
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
