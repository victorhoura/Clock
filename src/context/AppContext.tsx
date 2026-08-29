import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Activity, ActivityStatus, TeamMember, Theme, TimeEntry } from '../types'
import { generateId } from '../utils/id'
import { todayISODate } from '../utils/time'

const STORAGE_KEY = 'team-productivity-app-v1'
const THEME_KEY = 'team-productivity-theme'

const MEMBER_COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6']

interface StoredState {
  users: TeamMember[]
  timeEntries: TimeEntry[]
  activities: Activity[]
}

function seedData(): StoredState {
  const now = new Date().toISOString()
  const users: TeamMember[] = [
    { id: generateId(), name: 'Ana Souza', role: 'Desenvolvedora', color: MEMBER_COLORS[0], createdAt: now },
    { id: generateId(), name: 'Bruno Lima', role: 'Designer', color: MEMBER_COLORS[1], createdAt: now },
    { id: generateId(), name: 'Carla Mendes', role: 'Gerente de Projetos', color: MEMBER_COLORS[2], createdAt: now },
  ]
  return { users, timeEntries: [], activities: [] }
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedData()
    const parsed = JSON.parse(raw) as StoredState
    if (!parsed.users || !parsed.timeEntries || !parsed.activities) return seedData()
    return parsed
  } catch {
    return seedData()
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

  users: TeamMember[]
  addUser: (name: string, role: string) => void
  updateUser: (id: string, updates: Partial<Pick<TeamMember, 'name' | 'role' | 'color'>>) => void
  removeUser: (id: string) => void

  timeEntries: TimeEntry[]
  activeEntryForUser: (userId: string) => TimeEntry | undefined
  clockIn: (userId: string) => void
  clockOut: (userId: string) => void
  deleteTimeEntry: (id: string) => void

  activities: Activity[]
  addActivity: (userId: string, title: string, description: string) => void
  updateActivityStatus: (id: string, status: ActivityStatus) => void
  deleteActivity: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [state, setState] = useState<StoredState>(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const addUser = (name: string, role: string) => {
    const color = MEMBER_COLORS[state.users.length % MEMBER_COLORS.length]
    const newUser: TeamMember = {
      id: generateId(),
      name: name.trim(),
      role: role.trim(),
      color,
      createdAt: new Date().toISOString(),
    }
    setState((s) => ({ ...s, users: [...s.users, newUser] }))
  }

  const updateUser: AppContextValue['updateUser'] = (id, updates) => {
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
    }))
  }

  const removeUser = (id: string) => {
    setState((s) => ({
      ...s,
      users: s.users.filter((u) => u.id !== id),
      timeEntries: s.timeEntries.filter((e) => e.userId !== id),
      activities: s.activities.filter((a) => a.userId !== id),
    }))
  }

  const activeEntryForUser = (userId: string) =>
    state.timeEntries.find((e) => e.userId === userId && e.clockOut === null)

  const clockIn = (userId: string) => {
    if (activeEntryForUser(userId)) return
    const newEntry: TimeEntry = {
      id: generateId(),
      userId,
      date: todayISODate(),
      clockIn: new Date().toISOString(),
      clockOut: null,
    }
    setState((s) => ({ ...s, timeEntries: [...s.timeEntries, newEntry] }))
  }

  const clockOut = (userId: string) => {
    setState((s) => ({
      ...s,
      timeEntries: s.timeEntries.map((e) =>
        e.userId === userId && e.clockOut === null ? { ...e, clockOut: new Date().toISOString() } : e,
      ),
    }))
  }

  const deleteTimeEntry = (id: string) => {
    setState((s) => ({ ...s, timeEntries: s.timeEntries.filter((e) => e.id !== id) }))
  }

  const addActivity = (userId: string, title: string, description: string) => {
    const newActivity: Activity = {
      id: generateId(),
      userId,
      title: title.trim(),
      description: description.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      completedAt: null,
    }
    setState((s) => ({ ...s, activities: [...s.activities, newActivity] }))
  }

  const updateActivityStatus = (id: string, status: ActivityStatus) => {
    setState((s) => ({
      ...s,
      activities: s.activities.map((a) =>
        a.id === id
          ? { ...a, status, completedAt: status === 'completed' ? new Date().toISOString() : null }
          : a,
      ),
    }))
  }

  const deleteActivity = (id: string) => {
    setState((s) => ({ ...s, activities: s.activities.filter((a) => a.id !== id) }))
  }

  const value = useMemo<AppContextValue>(
    () => ({
      theme,
      toggleTheme,
      users: state.users,
      addUser,
      updateUser,
      removeUser,
      timeEntries: state.timeEntries,
      activeEntryForUser,
      clockIn,
      clockOut,
      deleteTimeEntry,
      activities: state.activities,
      addActivity,
      updateActivityStatus,
      deleteActivity,
    }),
    [theme, state],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
