import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import clsx from 'clsx'
import { Card } from './Card'

export type KpiTone = 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky' | 'violet' | 'slate'

const toneClasses: Record<KpiTone, string> = {
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20',
  emerald:
    'bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20',
  violet:
    'bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
}

interface KpiCardProps {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  tone?: KpiTone
  /** Relative change vs. the previous period (0.12 = +12%). */
  delta?: number | null
  /** Whether a rise is good news (revenue) or bad news (costs). */
  deltaGoodWhen?: 'up' | 'down'
  /** Shown next to the delta, only when there is a delta (e.g. "vs. mês anterior"). */
  deltaLabel?: string
  valueClassName?: string
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'indigo',
  delta,
  deltaGoodWhen = 'up',
  deltaLabel,
  valueClassName,
}: KpiCardProps) {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta)
  const up = hasDelta && delta! >= 0
  const good = hasDelta && (deltaGoodWhen === 'up' ? up : !up)

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-medium uppercase leading-snug tracking-wider text-slate-500 dark:text-slate-400 sm:text-xs">
          {label}
        </p>
        <div className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset sm:h-9 sm:w-9', toneClasses[tone])}>
          <Icon size={17} />
        </div>
      </div>
      <p
        className={clsx(
          'mt-2 truncate text-lg font-semibold tracking-tight tabular-nums text-slate-900 dark:text-white sm:text-2xl',
          valueClassName,
        )}
        title={value}
      >
        {value}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs">
        {hasDelta && (
          <span
            className={clsx(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums',
              good
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
            )}
          >
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {`${Math.abs(delta! * 100).toFixed(1).replace('.', ',')}%`}
          </span>
        )}
        {hasDelta && deltaLabel && <span className="text-slate-500 dark:text-slate-400">{deltaLabel}</span>}
        {sub && <span className="text-slate-500 dark:text-slate-400">{sub}</span>}
      </div>
    </Card>
  )
}
