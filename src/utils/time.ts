import type { TimeEntry } from '../types'

export function todayISODate(): string {
  return toISODate(new Date())
}

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function entryDurationHours(entry: TimeEntry): number {
  if (!entry.clockOut) return 0
  const start = new Date(entry.clockIn).getTime()
  const end = new Date(entry.clockOut).getTime()
  return Math.max(0, (end - start) / (1000 * 60 * 60))
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 60) return `${h + 1}h 00min`
  return `${h}h ${String(m).padStart(2, '0')}min`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateLong(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}
