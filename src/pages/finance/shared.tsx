import type { ReactNode } from 'react'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { FinanceTransaction } from '../../types'
import { Badge } from '../../components/ui/Badge'
import { dueState, formatBRL, MONTH_SHORT, periodLabel, type Period } from '../../utils/finance'

/** Two-to-four option button group for forms (e.g. Receita / Despesa). */
export function ChoiceGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; activeClass?: string }[]
}) {
  return (
    <div className="grid gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/70" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={clsx(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            opt.value === value
              ? (opt.activeClass ?? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white')
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function PeriodNavigator({
  period,
  onChange,
  mode,
}: {
  period: Period
  onChange: (p: Period) => void
  mode: 'month' | 'year'
}) {
  const step = mode === 'month' ? 1 : 12
  const shift = (delta: number) => {
    const d = new Date(period.year, period.month + delta, 1)
    onChange({ year: d.getFullYear(), month: d.getMonth() })
  }
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200/80 bg-white shadow-card dark:border-slate-800 dark:bg-surface-dark">
      <button
        onClick={() => shift(-step)}
        className="flex h-9 w-9 items-center justify-center rounded-l-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label={mode === 'month' ? 'Mês anterior' : 'Ano anterior'}
      >
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-36 px-2 text-center text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
        {mode === 'month' ? periodLabel(period) : period.year}
      </span>
      <button
        onClick={() => shift(step)}
        className="flex h-9 w-9 items-center justify-center rounded-r-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label={mode === 'month' ? 'Próximo mês' : 'Próximo ano'}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

export function StatusBadge({ t, todayISO }: { t: FinanceTransaction; todayISO: string }) {
  if (t.status === 'paid') {
    return <Badge tone="emerald">{t.kind === 'income' ? 'Recebido' : 'Pago'}</Badge>
  }
  const state = dueState(t, todayISO)
  if (state === 'overdue') return <Badge tone="rose">Vencido</Badge>
  if (state === 'today') return <Badge tone="amber">Vence hoje</Badge>
  return <Badge tone="slate">{t.kind === 'income' ? 'A receber' : 'A pagar'}</Badge>
}

/** "14 Out" style date chip used in bill lists. */
export function DateChip({ iso, tone = 'slate' }: { iso: string; tone?: 'slate' | 'rose' | 'amber' }) {
  const [, m, d] = iso.split('-').map(Number)
  return (
    <div
      className={clsx(
        'flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg leading-none ring-1 ring-inset',
        tone === 'slate' && 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700',
        tone === 'rose' && 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/25',
        tone === 'amber' && 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/25',
      )}
    >
      <span className="text-sm font-semibold tabular-nums">{String(d).padStart(2, '0')}</span>
      <span className="mt-0.5 text-[10px] font-medium uppercase">{MONTH_SHORT[m - 1]}</span>
    </div>
  )
}

export function SignedAmount({ t, className }: { t: FinanceTransaction; className?: string }) {
  const income = t.kind === 'income'
  return (
    <span
      className={clsx(
        'whitespace-nowrap font-semibold tabular-nums',
        income ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100',
        className,
      )}
    >
      {income ? '+ ' : '− '}
      {formatBRL(t.amount)}
    </span>
  )
}

export function MiniStat({ label, value, tone, children }: { label: string; value: string; tone?: 'emerald' | 'rose' | 'amber'; children?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={clsx(
          'mt-1 truncate text-sm font-semibold tabular-nums tracking-tight sm:text-lg',
          tone === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'rose' && 'text-rose-600 dark:text-rose-400',
          tone === 'amber' && 'text-amber-600 dark:text-amber-400',
          !tone && 'text-slate-900 dark:text-white',
        )}
      >
        {value}
      </p>
      {children}
    </div>
  )
}
