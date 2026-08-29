import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const inputClasses =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'

interface LabelProps {
  label: string
  children: ReactNode
}

export function Field({ label, children }: LabelProps) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClasses} {...props} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={inputClasses} rows={3} {...props} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClasses} {...props} />
}
