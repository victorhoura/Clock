import type { Activity, TeamMember, TimeEntry } from '../types'
import { entryDurationHours, toISODate } from './time'

export function hoursInRange(entries: TimeEntry[], fromISO: string, toISO: string): number {
  return entries
    .filter((e) => e.date >= fromISO && e.date <= toISO)
    .reduce((sum, e) => sum + entryDurationHours(e), 0)
}

export function lastNDays(n: number): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    days.push(toISODate(d))
  }
  return days
}

export function hoursPerUser(entries: TimeEntry[], users: TeamMember[]): { name: string; hours: number; color: string }[] {
  const map = new Map<string, number>()
  for (const e of entries) map.set(e.userId, (map.get(e.userId) ?? 0) + entryDurationHours(e))
  return users.map((u) => ({ name: u.name.split(' ')[0], hours: map.get(u.id) ?? 0, color: u.color }))
}

export function completedPerUser(activities: Activity[], users: TeamMember[]): { name: string; completed: number; color: string }[] {
  const map = new Map<string, number>()
  for (const a of activities) {
    if (a.status !== 'completed') continue
    for (const userId of a.assigneeIds) map.set(userId, (map.get(userId) ?? 0) + 1)
  }
  return users.map((u) => ({ name: u.name.split(' ')[0], completed: map.get(u.id) ?? 0, color: u.color }))
}

export function dailyTeamHours(entries: TimeEntry[], days: string[]): { date: string; hours: number }[] {
  const map = new Map<string, number>()
  for (const e of entries) map.set(e.date, (map.get(e.date) ?? 0) + entryDurationHours(e))
  return days.map((d) => ({ date: d, hours: map.get(d) ?? 0 }))
}
