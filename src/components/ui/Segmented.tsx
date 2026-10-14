import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** Shown instead of `label` on phones, where every tab must fit side by side. */
  shortLabel?: string
  icon?: LucideIcon
  count?: number
}

/**
 * Pill-style tab switcher. On phones the tabs share the full width as an
 * even grid (icon over a short label) so none are hidden off-screen; from the
 * sm breakpoint up they sit inline with icon and full label.
 */
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
    <div
      role="tablist"
      className={clsx(
        'grid w-full gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-card dark:border-slate-800 dark:bg-surface-dark sm:inline-flex sm:w-auto',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const Icon = opt.icon
        const active = opt.value === value
        const hasCount = opt.count !== undefined && opt.count > 0
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            aria-label={opt.label}
            onClick={() => onChange(opt.value)}
            className={clsx(
              'relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors',
              'sm:flex-row sm:gap-2 sm:whitespace-nowrap sm:px-3 sm:py-1.5 sm:text-sm',
              active
                ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
            )}
          >
            {Icon && <Icon size={16} className="shrink-0 sm:h-[15px] sm:w-[15px]" />}
            <span className="max-w-full truncate sm:hidden">{opt.shortLabel ?? opt.label}</span>
            <span className="hidden sm:inline">{opt.label}</span>
            {hasCount && (
              <span
                className={clsx(
                  'absolute right-1 top-1 min-w-4 rounded-full px-1 text-center text-[10px] font-semibold leading-4 tabular-nums',
                  'sm:static sm:px-1.5 sm:text-[11px]',
                  active
                    ? 'bg-rose-500 text-white sm:bg-white/20 sm:text-inherit dark:sm:bg-slate-900/10'
                    : 'bg-rose-500 text-white sm:bg-rose-100 sm:text-rose-700 dark:sm:bg-rose-500/15 dark:sm:text-rose-400',
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
