import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { TeamMember, TimeEntry } from '../types'
import { entryDurationHours, toISODate } from '../utils/time'
import { Avatar } from './ui/Avatar'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface DayInfo {
  date: Date
  isoDate: string
  inMonth: boolean
  isToday: boolean
  users: TeamMember[]
  totalHours: number
}

export function TeamCalendar({ entries, users }: { entries: TimeEntry[]; users: TeamMember[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])
  const todayISO = toISODate(new Date())

  const dayData = useMemo(() => {
    const byDate = new Map<string, { userIds: Set<string>; hours: number }>()
    for (const e of entries) {
      const entry = byDate.get(e.date) ?? { userIds: new Set(), hours: 0 }
      entry.userIds.add(e.userId)
      entry.hours += entryDurationHours(e)
      byDate.set(e.date, entry)
    }
    return byDate
  }, [entries])

  const days = useMemo<DayInfo[]>(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstDay = new Date(year, month, 1)
    const startOffset = firstDay.getDay()
    const gridStart = new Date(year, month, 1 - startOffset)

    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + i)
      const isoDate = toISODate(date)
      const info = dayData.get(isoDate)
      return {
        date,
        isoDate,
        inMonth: date.getMonth() === month,
        isToday: isoDate === todayISO,
        users: info ? [...info.userIds].map((id) => userMap.get(id)).filter((u): u is TeamMember => !!u) : [],
        totalHours: info?.hours ?? 0,
      }
    })
  }, [cursor, dayData, userMap, todayISO])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="pb-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div
            key={day.isoDate}
            className={`flex min-h-16 flex-col items-center rounded-lg border p-1 text-xs ${
              day.inMonth
                ? 'border-slate-100 dark:border-slate-800'
                : 'border-transparent opacity-40'
            } ${day.isToday ? 'ring-2 ring-indigo-500' : ''}`}
          >
            <span
              className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full ${
                day.isToday
                  ? 'bg-indigo-600 font-semibold text-white'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {day.date.getDate()}
            </span>
            {day.users.length > 0 && (
              <div className="flex flex-wrap justify-center gap-0.5">
                {day.users.slice(0, 3).map((u) => (
                  <div key={u.id} title={u.name}>
                    <Avatar user={u} size={14} />
                  </div>
                ))}
                {day.users.length > 3 && (
                  <span className="text-[9px] text-slate-400">+{day.users.length - 3}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
