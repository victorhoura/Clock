import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  addDoc,
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import type { Activity, ActivityStatus, TeamMember, Theme, TimeEntry } from '../types'
import { COLLECTIONS, db } from '../lib/firebase'
import { todayISODate } from '../utils/time'

const THEME_KEY = 'team-productivity-theme'
// Ordered so the first members picked are the easiest to tell apart in the
// charts: indigo, amber, emerald, then sky, pink and violet.
const MEMBER_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#0ea5e9', '#ec4899', '#8b5cf6']

// Indexing the palette by users.length hands out a duplicate whenever the
// local list is behind the database (a member added elsewhere, or one removed),
// which shows up as two people sharing a bar color. Take the first unused
// color instead, falling back to the least used one once the palette runs out.
function nextMemberColor(users: TeamMember[]): string {
  const inUse = users.map((u) => u.color)
  const unused = MEMBER_COLORS.find((c) => !inUse.includes(c))
  if (unused) return unused
  return MEMBER_COLORS.reduce((least, color) => {
    const count = inUse.filter((c) => c === color).length
    const leastCount = inUse.filter((c) => c === least).length
    return count < leastCount ? color : least
  }, MEMBER_COLORS[0])
}

function fromMemberDoc(d: QueryDocumentSnapshot<DocumentData>): TeamMember {
  const data = d.data()
  return {
    id: d.id,
    name: data.name ?? '',
    role: data.role ?? '',
    color: data.color ?? MEMBER_COLORS[0],
    avatarUrl: data.avatarUrl ?? null,
    createdAt: data.createdAt ?? '',
  }
}

function fromEntryDoc(d: QueryDocumentSnapshot<DocumentData>): TimeEntry {
  const data = d.data()
  return { id: d.id, userId: data.userId, date: data.date, clockIn: data.clockIn, clockOut: data.clockOut ?? null }
}

function fromActivityDoc(d: QueryDocumentSnapshot<DocumentData>): Activity {
  const data = d.data()
  return {
    id: d.id,
    assigneeIds: data.assigneeIds ?? [],
    title: data.title ?? '',
    description: data.description ?? '',
    status: data.status ?? 'pending',
    createdAt: data.createdAt ?? '',
    completedAt: data.completedAt ?? null,
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
  addUser: (id: string, name: string, role: string, avatarUrl: string | null) => Promise<void>
  updateUser: (
    id: string,
    updates: Partial<Pick<TeamMember, 'name' | 'role' | 'color' | 'avatarUrl'>>,
  ) => Promise<void>
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

  // One live listener per collection: the first snapshot is the initial load,
  // later ones carry changes made on any device.
  useEffect(() => {
    const pending = new Set(['members', 'entries', 'activities'])
    const settle = (key: string) => {
      pending.delete(key)
      if (pending.size === 0) setLoading(false)
    }

    const unsubs = [
      onSnapshot(
        collection(db, COLLECTIONS.members),
        (snap) => {
          setUsers(snap.docs.map(fromMemberDoc).sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
          settle('members')
        },
        () => settle('members'),
      ),
      onSnapshot(
        collection(db, COLLECTIONS.timeEntries),
        (snap) => {
          setTimeEntries(snap.docs.map(fromEntryDoc).sort((a, b) => b.clockIn.localeCompare(a.clockIn)))
          settle('entries')
        },
        () => settle('entries'),
      ),
      onSnapshot(
        collection(db, COLLECTIONS.activities),
        (snap) => {
          setActivities(snap.docs.map(fromActivityDoc).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
          settle('activities')
        },
        () => settle('activities'),
      ),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const addUser = async (id: string, name: string, role: string, avatarUrl: string | null) => {
    const color = nextMemberColor(users)
    await setDoc(doc(db, COLLECTIONS.members, id), {
      name: name.trim(),
      role: role.trim(),
      color,
      avatarUrl,
      createdAt: new Date().toISOString(),
    })
  }

  const updateUser: AppContextValue['updateUser'] = async (id, updates) => {
    await updateDoc(doc(db, COLLECTIONS.members, id), { ...updates })
  }

  // Removing a member also deletes their time entries and takes them off the
  // activities they were assigned to.
  const removeUser = async (id: string) => {
    const [entries, assigned] = await Promise.all([
      getDocs(query(collection(db, COLLECTIONS.timeEntries), where('userId', '==', id))),
      getDocs(query(collection(db, COLLECTIONS.activities), where('assigneeIds', 'array-contains', id))),
    ])
    const batch = writeBatch(db)
    entries.docs.forEach((d) => batch.delete(d.ref))
    assigned.docs.forEach((d) => batch.update(d.ref, { assigneeIds: arrayRemove(id) }))
    batch.delete(doc(db, COLLECTIONS.members, id))
    await batch.commit()
  }

  const activeEntryForUser = (userId: string) =>
    timeEntries.find((e) => e.userId === userId && e.clockOut === null)

  const clockIn = async (userId: string) => {
    if (activeEntryForUser(userId)) return
    await addDoc(collection(db, COLLECTIONS.timeEntries), {
      userId,
      date: todayISODate(),
      clockIn: new Date().toISOString(),
      clockOut: null,
    })
  }

  const clockOut = async (userId: string) => {
    const entry = activeEntryForUser(userId)
    if (!entry) return
    await updateDoc(doc(db, COLLECTIONS.timeEntries, entry.id), { clockOut: new Date().toISOString() })
  }

  const deleteTimeEntry = async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.timeEntries, id))
  }

  const addActivity = async (assigneeIds: string[], title: string, description: string) => {
    await addDoc(collection(db, COLLECTIONS.activities), {
      assigneeIds,
      title: title.trim(),
      description: description.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      completedAt: null,
    })
  }

  const updateActivity = async (id: string, assigneeIds: string[], title: string, description: string) => {
    await updateDoc(doc(db, COLLECTIONS.activities, id), {
      assigneeIds,
      title: title.trim(),
      description: description.trim(),
    })
  }

  const updateActivityStatus = async (id: string, status: ActivityStatus) => {
    await updateDoc(doc(db, COLLECTIONS.activities, id), {
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : null,
    })
  }

  const deleteActivity = async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.activities, id))
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
