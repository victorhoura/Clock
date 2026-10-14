import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200/80 bg-white shadow-card dark:border-slate-800/80 dark:bg-surface-dark',
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
    <h3
      className={clsx('text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({ children, className, ...props }: CardProps) {
  return (
    <p className={clsx('text-xs text-slate-500 dark:text-slate-400', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <div className={clsx('p-5', className)} {...props}>
      {children}
    </div>
  )
}
