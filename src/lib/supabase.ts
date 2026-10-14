import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface TeamMemberRow {
  id: string
  name: string
  role: string
  color: string
  avatar_url: string | null
  created_at: string
}

const AVATAR_BUCKET = 'avatars'

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
  })
  if (error) throw error
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl
}

export interface TimeEntryRow {
  id: string
  user_id: string
  date: string
  clock_in: string
  clock_out: string | null
}

export interface ActivityRow {
  id: string
  assignee_ids: string[]
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
  completed_at: string | null
}

export interface FinanceTransactionRow {
  id: string
  kind: 'income' | 'expense'
  description: string
  category: string
  amount: number | string
  date: string
  due_date: string | null
  status: 'paid' | 'pending'
  paid_at: string | null
  cost_type: 'fixed' | 'variable' | null
  recurring_id: string | null
  period: string | null
  notes: string
  created_at: string
}

export interface RecurringCostRow {
  id: string
  description: string
  category: string
  amount: number | string
  due_day: number
  active: boolean
  start_period: string
  last_generated_period: string | null
  notes: string
  created_at: string
}
