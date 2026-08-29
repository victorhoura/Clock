import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div className={clsx('flex items-center justify-between gap-3 px-5 pt-5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className, ...props }: CardProps) {
  return (
    <h3 className={clsx('text-sm font-semibold text-slate-700 dark:text-slate-200', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <div className={clsx('p-5', className)} {...props}>
      {children}
    </div>
  )
}
