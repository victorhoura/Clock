export type Theme = 'light' | 'dark'

export interface TeamMember {
  id: string
  name: string
  role: string
  color: string
  createdAt: string
}

export interface TimeEntry {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  clockIn: string // ISO datetime
  clockOut: string | null // ISO datetime
}

export type ActivityStatus = 'pending' | 'in_progress' | 'completed'

export interface Activity {
  id: string
  assigneeIds: string[]
  title: string
  description: string
  status: ActivityStatus
  createdAt: string // ISO datetime
  completedAt: string | null // ISO datetime
}
