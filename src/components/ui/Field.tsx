import { useEffect, useRef, useState } from 'react'
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

const inputClasses =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'

interface LabelProps {
  label: string
  children: ReactNode
}

// A plain <div> rather than <label>: wrapping a custom button-based control
// (Select/MultiSelect) in a <label> makes browsers treat the label text as
// that control's accessible name instead of its actual selected value.
export function Field({ label, children }: LabelProps) {
  return (
    <div className="mb-3 block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </div>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClasses} {...props} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={inputClasses} rows={3} {...props} />
}

export interface SelectOption {
  value: string
  label: string
}

// Closes an open popover on an outside click or Escape.
function useDismissableOpen(open: boolean, onDismiss: () => void, containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onDismiss()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onDismiss, containerRef])
}

const popoverListClasses =
  'absolute z-20 mt-1.5 max-h-60 w-full min-w-max max-w-[calc(100vw-2rem)] overflow-auto rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800'

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
  placeholder?: string
}

// Custom listbox instead of a native <select>: browsers render the native
// option popup with their own chrome and largely ignore option background
// styling, so the dropdown stays light even in dark mode.
export function Select({ value, onChange, options, className, placeholder }: SelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useDismissableOpen(open, () => setOpen(false), containerRef)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(inputClasses, 'flex items-center justify-between gap-2 text-left', className)}
      >
        <span className={clsx('truncate', !selected && 'text-slate-400 dark:text-slate-500')}>
          {selected?.label ?? placeholder ?? 'Selecione'}
        </span>
        <ChevronDown
          size={16}
          className={clsx('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul role="listbox" className={popoverListClasses}>
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={clsx(
                  'block w-full truncate rounded-lg px-3 py-2 text-left',
                  opt.value === value
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400'
                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60',
                )}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface MultiSelectProps {
  values: string[]
  onChange: (values: string[]) => void
  options: SelectOption[]
  className?: string
  placeholder?: string
}

// Same idea as Select, but toggles multiple values (checkbox-style options).
export function MultiSelect({ values, onChange, options, className, placeholder }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useDismissableOpen(open, () => setOpen(false), containerRef)

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value])
  }

  const label =
    values.length === 0
      ? (placeholder ?? 'Selecione')
      : options
          .filter((o) => values.includes(o.value))
          .map((o) => o.label)
          .join(', ')

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(inputClasses, 'flex items-center justify-between gap-2 text-left', className)}
      >
        <span className={clsx('truncate', values.length === 0 && 'text-slate-400 dark:text-slate-500')}>
          {label}
        </span>
        <ChevronDown
          size={16}
          className={clsx('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul role="listbox" className={popoverListClasses}>
          {options.map((opt) => {
            const checked = values.includes(opt.value)
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={checked}
                  onClick={() => toggle(opt.value)}
                  className={clsx(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left',
                    checked
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60',
                  )}
                >
                  <span
                    className={clsx(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      checked
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-600',
                    )}
                  >
                    {checked && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
