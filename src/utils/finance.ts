import type { FinanceTransaction, RecurringCost } from '../types'
import { toISODate } from './time'

export const INCOME_CATEGORIES = [
  'Serviços',
  'Contratos',
  'Vendas',
  'Comissões',
  'Rendimentos',
  'Outras receitas',
]

export const EXPENSE_CATEGORIES = [
  'Pessoal e salários',
  'Aluguel',
  'Água, luz e internet',
  'Software e assinaturas',
  'Marketing',
  'Impostos e taxas',
  'Fornecedores',
  'Serviços de terceiros',
  'Transporte',
  'Manutenção',
  'Material de escritório',
  'Outros',
]

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatBRL(value: number): string {
  return brl.format(value)
}

export function formatBRLCompact(value: number): string {
  return Math.abs(value) < 10_000 ? brl.format(Math.round(value)).replace(/,00$/, '') : brlCompact.format(value)
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits).replace('.', ',')}%`
}

/** Accepts "1.234,56", "1234,56", "1234.56" or "R$ 1.234,56". Returns NaN when invalid. */
export function parseMoney(input: string): number {
  let s = input.replace(/[R$\s]/g, '')
  if (!s) return NaN
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}

/** Formats a number for a money text field, e.g. 1234.5 → "1234,50". */
export function moneyToInput(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

// A period is identified by its year and zero-based month.
export interface Period {
  year: number
  month: number
}

export function currentPeriod(): Period {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

export function shiftPeriod(p: Period, delta: number): Period {
  const d = new Date(p.year, p.month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function periodStartISO(p: Period): string {
  return toISODate(new Date(p.year, p.month, 1))
}

export function periodKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export function periodKeyOf(p: Period): string {
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}`
}

export function periodLabel(p: Period): string {
  return `${MONTH_NAMES[p.month]} ${p.year}`
}

/** The date a pending item is due: its due date, or its competência date when none was given. */
export function effectiveDueDate(t: FinanceTransaction): string {
  return t.dueDate ?? t.date
}

export type DueState = 'overdue' | 'today' | 'soon' | 'later'

export function dueState(t: FinanceTransaction, todayISO: string): DueState {
  const due = effectiveDueDate(t)
  if (due < todayISO) return 'overdue'
  if (due === todayISO) return 'today'
  const in7 = new Date()
  in7.setDate(in7.getDate() + 7)
  return due <= toISODate(in7) ? 'soon' : 'later'
}

export function daysUntil(isoDate: string, todayISO: string): number {
  const [y1, m1, d1] = isoDate.split('-').map(Number)
  const [y2, m2, d2] = todayISO.split('-').map(Number)
  return Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2)) / 86_400_000)
}

export function dueText(t: FinanceTransaction, todayISO: string): string {
  const days = daysUntil(effectiveDueDate(t), todayISO)
  if (days === 0) return 'Vence hoje'
  if (days === 1) return 'Vence amanhã'
  if (days > 1) return `Vence em ${days} dias`
  if (days === -1) return 'Venceu ontem'
  return `Venceu há ${-days} dias`
}

export interface Summary {
  revenue: number
  fixedCosts: number
  variableCosts: number
  operatingCost: number
  profit: number
  margin: number | null // lucro / faturamento
  contributionMargin: number | null // (faturamento - variáveis) / faturamento
  breakEven: number | null // faturamento mínimo para cobrir os custos fixos
  received: number
  toReceive: number
  paid: number
  toPay: number
}

/** Aggregates the transactions whose competência date falls in [fromISO, toISO]. */
export function summarize(transactions: FinanceTransaction[], fromISO: string, toISO: string): Summary {
  let revenue = 0
  let fixedCosts = 0
  let variableCosts = 0
  let received = 0
  let toReceive = 0
  let paid = 0
  let toPay = 0
  for (const t of transactions) {
    if (t.date < fromISO || t.date > toISO) continue
    if (t.kind === 'income') {
      revenue += t.amount
      if (t.status === 'paid') received += t.amount
      else toReceive += t.amount
    } else {
      if (t.costType === 'fixed') fixedCosts += t.amount
      else variableCosts += t.amount
      if (t.status === 'paid') paid += t.amount
      else toPay += t.amount
    }
  }
  const operatingCost = fixedCosts + variableCosts
  const profit = revenue - operatingCost
  const contributionMargin = revenue > 0 ? (revenue - variableCosts) / revenue : null
  return {
    revenue,
    fixedCosts,
    variableCosts,
    operatingCost,
    profit,
    margin: revenue > 0 ? profit / revenue : null,
    contributionMargin,
    breakEven: contributionMargin && contributionMargin > 0 ? fixedCosts / contributionMargin : null,
    received,
    toReceive,
    paid,
    toPay,
  }
}

export function monthRange(p: Period): [string, string] {
  return [toISODate(new Date(p.year, p.month, 1)), toISODate(new Date(p.year, p.month + 1, 0))]
}

export function yearRange(year: number): [string, string] {
  return [`${year}-01-01`, `${year}-12-31`]
}

/** Twelve monthly summaries for a year, January first. */
export function monthlySummaries(transactions: FinanceTransaction[], year: number): Summary[] {
  return Array.from({ length: 12 }, (_, month) => {
    const [from, to] = monthRange({ year, month })
    return summarize(transactions, from, to)
  })
}

export function expensesByCategory(
  transactions: FinanceTransaction[],
  fromISO: string,
  toISO: string,
): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.kind !== 'expense' || t.date < fromISO || t.date > toISO) continue
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

/** Relative change from `previous` to `current`, or null when there is no base to compare against. */
export function relativeChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return (current - previous) / Math.abs(previous)
}

export function monthlyFixedTotal(recurring: RecurringCost[]): number {
  return recurring.filter((r) => r.active).reduce((sum, r) => sum + r.amount, 0)
}

/** Due date of a recurring cost in a given month, clamped to the month's last day. */
export function recurringDueDate(dueDay: number, periodISO: string): string {
  const [y, m] = periodISO.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return toISODate(new Date(y, m - 1, Math.min(dueDay, lastDay)))
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    // A text cell starting with = + - @ would run as a formula in Excel; the quote keeps it as text.
    const s = typeof v === 'number' ? v.toFixed(2).replace('.', ',') : /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  // Semicolon-separated with a BOM so Excel in pt-BR opens it with the right columns and accents.
  const csv = '﻿' + rows.map((r) => r.map(escape).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
