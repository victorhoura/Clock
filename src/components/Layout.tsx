import type { ReactNode } from 'react'
import { CalendarClock, LayoutDashboard, ListChecks, Moon, Sun, Users } from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../context/AppContext'

export type Tab = 'dashboard' | 'ponto' | 'atividades' | 'usuarios'

const NAV_ITEMS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'ponto', label: 'Bater Ponto', icon: CalendarClock },
  { id: 'atividades', label: 'Atividades', icon: ListChecks },
  { id: 'usuarios', label: 'Usuários', icon: Users },
]

interface LayoutProps {
  active: Tab
  onChange: (tab: Tab) => void
  children: ReactNode
}

export function Layout({ active, onChange, children }: LayoutProps) {
  const { theme, toggleTheme } = useApp()

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-900 dark:text-white">Gestão Plantão Digital</p>
            <p className="text-[11px] leading-tight text-slate-400">Produtividade em equipe</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                )}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <LayoutDashboard size={16} />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Gestão Plantão Digital</p>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <nav className="sticky bottom-0 z-40 flex justify-around border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={clsx(
                  'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px] font-medium',
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400',
                )}
              >
                <Icon size={19} />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
