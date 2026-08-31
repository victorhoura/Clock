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
    let lastMarked: HTMLElement | null = null

    function scan() {
      const vw = document.documentElement.clientWidth
      let badge = document.getElementById('debug-overflow-badge')
      if (!badge) {
        badge = document.createElement('div')
        badge.id = 'debug-overflow-badge'
        badge.style.cssText =
          'position:fixed;top:0;left:0;right:0;z-index:99999;background:#dc2626;color:#fff;font-size:10px;line-height:1.4;padding:4px 6px;font-family:monospace;pointer-events:none;white-space:pre-wrap;max-height:45vh;overflow:auto;'
        document.body.appendChild(badge)
      }

      // Segue o filho mais largo em cada nível, a partir de <main> (o
      // cabeçalho/nav só herdam a largura do container esticado), para
      // localizar exatamente onde a largura salta acima da tela.
      const chain: string[] = [`vw=${vw}`]
      let node: Element = document.querySelector('main') ?? document.body
      for (let depth = 0; depth < 16; depth++) {
        const w = Math.round(node.getBoundingClientRect().width)
        const cls = (node.getAttribute('class') || '').trim().split(/\s+/).slice(0, 3).join('.')
        chain.push(`${'  '.repeat(depth)}<${node.tagName.toLowerCase()}${cls ? '.' + cls : ''}> w=${w}`)

        let widestChild: Element | null = null
        let widestW = -1
        for (const child of Array.from(node.children)) {
          if (child.id === 'debug-overflow-badge') continue
          const cw = child.getBoundingClientRect().width
          if (cw > widestW) {
            widestW = cw
            widestChild = child
          }
        }
        if (!widestChild) break
        node = widestChild
      }
      badge.textContent = chain.join('\n')

      if (lastMarked) lastMarked.style.outline = ''
      lastMarked = node as HTMLElement
      lastMarked.style.outline = '4px solid red'
      lastMarked.style.outlineOffset = '-4px'
    }
    const id = setInterval(scan, 500)
    return () => {
      clearInterval(id)
      if (lastMarked) lastMarked.style.outline = ''
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
