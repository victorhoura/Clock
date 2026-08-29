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
  created_at: string
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
  user_id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
  completed_at: string | null
}
