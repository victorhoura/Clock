import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Activity, ActivityStatus, TeamMember, Theme, TimeEntry } from '../types'
import { supabase, type ActivityRow, type TeamMemberRow, type TimeEntryRow } from '../lib/supabase'
import { todayISODate } from '../utils/time'

const THEME_KEY = 'team-productivity-theme'
const MEMBER_COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6']

function fromMemberRow(row: TeamMemberRow): TeamMember {
  return { id: row.id, name: row.name, role: row.role, color: row.color, createdAt: row.created_at }
}

function fromEntryRow(row: TimeEntryRow): TimeEntry {
  return { id: row.id, userId: row.user_id, date: row.date, clockIn: row.clock_in, clockOut: row.clock_out }
}

function fromActivityRow(row: ActivityRow): Activity {
  return {
    id: row.id,
    assigneeIds: row.assignee_ids ?? [],
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }
}

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // ignore
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface AppContextValue {
  theme: Theme
  toggleTheme: () => void
  loading: boolean

  users: TeamMember[]
  addUser: (name: string, role: string) => Promise<void>
  updateUser: (id: string, updates: Partial<Pick<TeamMember, 'name' | 'role' | 'color'>>) => Promise<void>
  removeUser: (id: string) => Promise<void>

  timeEntries: TimeEntry[]
  activeEntryForUser: (userId: string) => TimeEntry | undefined
  clockIn: (userId: string) => Promise<void>
  clockOut: (userId: string) => Promise<void>
  deleteTimeEntry: (id: string) => Promise<void>

  activities: Activity[]
  addActivity: (assigneeIds: string[], title: string, description: string) => Promise<void>
  updateActivity: (id: string, assigneeIds: string[], title: string, description: string) => Promise<void>
  updateActivityStatus: (id: string, status: ActivityStatus) => Promise<void>
  deleteActivity: (id: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [users, setUsers] = useState<TeamMember[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      const [membersRes, entriesRes, activitiesRes] = await Promise.all([
        supabase.from('team_members').select('*').order('created_at', { ascending: true }),
        supabase.from('time_entries').select('*').order('clock_in', { ascending: false }),
        supabase.from('activities').select('*').order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      if (membersRes.data) setUsers(membersRes.data.map(fromMemberRow))
      if (entriesRes.data) setTimeEntries(entriesRes.data.map(fromEntryRow))
      if (activitiesRes.data) setActivities(activitiesRes.data.map(fromActivityRow))
      setLoading(false)
    }

    loadAll()

    const channel = supabase
      .channel('pulse-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setUsers((prev) => prev.filter((u) => u.id !== (payload.old as TeamMemberRow).id))
        } else {
          const row = fromMemberRow(payload.new as TeamMemberRow)
          setUsers((prev) => {
            const exists = prev.some((u) => u.id === row.id)
            return exists ? prev.map((u) => (u.id === row.id ? row : u)) : [...prev, row]
          })
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setTimeEntries((prev) => prev.filter((e) => e.id !== (payload.old as TimeEntryRow).id))
        } else {
          const row = fromEntryRow(payload.new as TimeEntryRow)
          setTimeEntries((prev) => {
            const exists = prev.some((e) => e.id === row.id)
            return exists ? prev.map((e) => (e.id === row.id ? row : e)) : [row, ...prev]
          })
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setActivities((prev) => prev.filter((a) => a.id !== (payload.old as ActivityRow).id))
        } else {
          const row = fromActivityRow(payload.new as ActivityRow)
          setActivities((prev) => {
            const exists = prev.some((a) => a.id === row.id)
            return exists ? prev.map((a) => (a.id === row.id ? row : a)) : [row, ...prev]
          })
        }
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const addUser = async (name: string, role: string) => {
    const color = MEMBER_COLORS[users.length % MEMBER_COLORS.length]
    await supabase.from('team_members').insert({ name: name.trim(), role: role.trim(), color })
  }

  const updateUser: AppContextValue['updateUser'] = async (id, updates) => {
    await supabase.from('team_members').update(updates).eq('id', id)
  }

  const removeUser = async (id: string) => {
    await supabase.from('team_members').delete().eq('id', id)
  }

  const activeEntryForUser = (userId: string) =>
    timeEntries.find((e) => e.userId === userId && e.clockOut === null)

  const clockIn = async (userId: string) => {
    if (activeEntryForUser(userId)) return
    await supabase.from('time_entries').insert({
      user_id: userId,
      date: todayISODate(),
      clock_in: new Date().toISOString(),
      clock_out: null,
    })
  }

  const clockOut = async (userId: string) => {
    const entry = activeEntryForUser(userId)
    if (!entry) return
    await supabase.from('time_entries').update({ clock_out: new Date().toISOString() }).eq('id', entry.id)
  }

  const deleteTimeEntry = async (id: string) => {
    await supabase.from('time_entries').delete().eq('id', id)
  }

  const addActivity = async (assigneeIds: string[], title: string, description: string) => {
    await supabase.from('activities').insert({
      assignee_ids: assigneeIds,
      title: title.trim(),
      description: description.trim(),
      status: 'pending',
    })
  }

  const updateActivity = async (id: string, assigneeIds: string[], title: string, description: string) => {
    await supabase
      .from('activities')
      .update({ assignee_ids: assigneeIds, title: title.trim(), description: description.trim() })
      .eq('id', id)
  }

  const updateActivityStatus = async (id: string, status: ActivityStatus) => {
    await supabase
      .from('activities')
      .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
      .eq('id', id)
  }

  const deleteActivity = async (id: string) => {
    await supabase.from('activities').delete().eq('id', id)
  }

  const value = useMemo<AppContextValue>(
    () => ({
      theme,
      toggleTheme,
      loading,
      users,
      addUser,
      updateUser,
      removeUser,
      timeEntries,
      activeEntryForUser,
      clockIn,
      clockOut,
      deleteTimeEntry,
      activities,
      addActivity,
      updateActivity,
      updateActivityStatus,
      deleteActivity,
    }),
    [theme, loading, users, timeEntries, activities],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
