export type Theme = 'light' | 'dark'

export interface TeamMember {
  id: string
  name: string
  role: string
  color: string
  avatarUrl: string | null
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

export type TransactionKind = 'income' | 'expense'
export type TransactionStatus = 'paid' | 'pending'
export type CostType = 'fixed' | 'variable'

export interface FinanceTransaction {
  id: string
  kind: TransactionKind
  description: string
  category: string
  amount: number
  date: string // YYYY-MM-DD, competência
  dueDate: string | null // YYYY-MM-DD
  status: TransactionStatus
  paidAt: string | null // YYYY-MM-DD
  costType: CostType | null // só para despesas
  recurringId: string | null
  period: string | null // YYYY-MM-01, conta gerada de um custo fixo
  notes: string
  createdAt: string
}

export interface RecurringCost {
  id: string
  description: string
  category: string
  amount: number
  dueDay: number
  active: boolean
  startPeriod: string // YYYY-MM-01
  notes: string
  createdAt: string
}
