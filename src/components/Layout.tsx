import type { ReactNode } from 'react'
import { Activity, CalendarClock, LayoutDashboard, ListChecks, Moon, Sun, Users, Wallet } from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../context/AppContext'
import { useInstallApp } from '../hooks/useInstallApp'

export type Tab = 'dashboard' | 'ponto' | 'atividades' | 'financeiro' | 'usuarios'

interface NavItem {
  id: Tab
  label: string
  shortLabel: string
  icon: typeof LayoutDashboard
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Operação',
    items: [
      { id: 'dashboard', label: 'Dashboard', shortLabel: 'Início', icon: LayoutDashboard },
      { id: 'ponto', label: 'Bater Ponto', shortLabel: 'Ponto', icon: CalendarClock },
      { id: 'atividades', label: 'Atividades', shortLabel: 'Atividades', icon: ListChecks },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { id: 'financeiro', label: 'Financeiro', shortLabel: 'Financeiro', icon: Wallet },
      { id: 'usuarios', label: 'Usuários', shortLabel: 'Equipe', icon: Users },
    ],
  },
]

const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items)

function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-inset ring-white/15"
      style={{ width: size, height: size }}
    >
      <Activity size={size * 0.5} strokeWidth={2.4} />
    </div>
  )
}

interface LayoutProps {
  active: Tab
  onChange: (tab: Tab) => void
  children: ReactNode
}

export function Layout({ active, onChange, children }: LayoutProps) {
  const { theme, toggleTheme } = useApp()
  const installApp = useInstallApp()
  const todayLong = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  const today = todayLong.charAt(0).toUpperCase() + todayLong.slice(1)

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-sidebar px-3 py-5 text-slate-300 md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <BrandMark />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-white">Gestão Plantão Digital</p>
            <p className="text-[11px] leading-tight text-slate-500">Produtividade e finanças</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {group.title}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = active === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => onChange(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={clsx(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-white/[0.08] text-white'
                          : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100',
                      )}
                    >
                      {isActive && (
                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-indigo-400" aria-hidden />
                      )}
                      <Icon
                        size={18}
                        className={clsx(isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300')}
                      />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-6 border-t border-white/[0.06] pt-4">
          <p className="mb-3 px-3 text-[11px] text-slate-500">{today}</p>
          {installApp.sidebarButton}
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-slate-100"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between bg-sidebar px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
          <div className="flex items-center gap-2.5">
            <BrandMark size={30} />
            <p className="text-sm font-semibold text-white">Gestão Plantão Digital</p>
          </div>
          <div className="flex items-center gap-1">
            {installApp.headerButton}
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">
            {installApp.banner}
            <div key={active} className="animate-page">
              {children}
            </div>
          </div>
        </main>
        {installApp.modal}

        <nav className="sticky bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-surface-dark/95 md:hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium transition-colors',
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400',
                )}
              >
                <span
                  className={clsx(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    isActive && 'bg-indigo-50 dark:bg-indigo-500/15',
                  )}
                >
                  <Icon size={18} />
                </span>
                <span className="truncate">{item.shortLabel}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
