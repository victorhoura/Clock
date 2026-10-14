import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
  count?: number
}

/** Pill-style tab switcher; scrolls horizontally on narrow screens instead of wrapping. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
}) {
  return (
    <div className={clsx('-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}>
      <div
        role="tablist"
        className="inline-flex gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-card dark:border-slate-800 dark:bg-surface-dark"
      >
        {options.map((opt) => {
          const Icon = opt.icon
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(opt.value)}
              className={clsx(
                'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
              )}
            >
              {Icon && <Icon size={15} />}
              {opt.label}
              {opt.count !== undefined && opt.count > 0 && (
                <span
                  className={clsx(
                    'rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                    active ? 'bg-white/20 dark:bg-slate-900/10' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
                  )}
                >
                  {opt.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
