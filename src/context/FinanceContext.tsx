import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CostType, FinanceTransaction, RecurringCost, TransactionKind, TransactionStatus } from '../types'
import { supabase, type FinanceTransactionRow, type RecurringCostRow } from '../lib/supabase'
import { todayISODate } from '../utils/time'
import { currentPeriod, periodStartISO, recurringDueDate, shiftPeriod } from '../utils/finance'

function fromTransactionRow(row: FinanceTransactionRow): FinanceTransaction {
  return {
    id: row.id,
    kind: row.kind,
    description: row.description,
    category: row.category,
    amount: Number(row.amount),
    date: row.date,
    dueDate: row.due_date,
    status: row.status,
    paidAt: row.paid_at,
    costType: row.cost_type,
    recurringId: row.recurring_id,
    period: row.period,
    notes: row.notes ?? '',
    createdAt: row.created_at,
  }
}

function fromRecurringRow(row: RecurringCostRow): RecurringCost {
  return {
    id: row.id,
    description: row.description,
    category: row.category,
    amount: Number(row.amount),
    dueDay: row.due_day,
    active: row.active,
    startPeriod: row.start_period,
    notes: row.notes ?? '',
    createdAt: row.created_at,
  }
}

export interface TransactionInput {
  kind: TransactionKind
  description: string
  category: string
  amount: number
  date: string
  dueDate: string | null
  status: TransactionStatus
  costType: CostType | null
  notes: string
}

export interface RecurringInput {
  description: string
  category: string
  amount: number
  dueDay: number
  notes: string
}

// 'missing-schema' means the finance tables were not created in Supabase yet.
type LoadState = 'loading' | 'ready' | 'missing-schema' | 'error'

interface FinanceContextValue {
  state: LoadState
  transactions: FinanceTransaction[]
  recurring: RecurringCost[]
  addTransaction: (input: TransactionInput) => Promise<void>
  updateTransaction: (id: string, input: TransactionInput) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  setPaid: (id: string, paid: boolean) => Promise<void>
  addRecurring: (input: RecurringInput) => Promise<void>
  updateRecurring: (id: string, input: RecurringInput) => Promise<void>
  setRecurringActive: (id: string, active: boolean) => Promise<void>
  deleteRecurring: (id: string) => Promise<void>
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === 'PGRST205' || /does not exist|could not find the table/i.test(error.message ?? '')
}

// Supabase reports failures in the result instead of throwing; callers (the
// modals) rely on a throw to keep the form open and show an error.
function must<T extends { error: unknown }>(res: T): T {
  if (res.error) throw res.error
  return res
}

function upsertById<T extends { id: string }>(list: T[], row: T): T[] {
  return list.some((x) => x.id === row.id) ? list.map((x) => (x.id === row.id ? row : x)) : [row, ...list]
}

function toRowPayload(input: TransactionInput) {
  const paid = input.status === 'paid'
  // An entry recorded as already settled is dated by its due/competência date, never in the future.
  const settledOn = input.dueDate ?? input.date
  return {
    kind: input.kind,
    description: input.description.trim(),
    category: input.category,
    amount: input.amount,
    date: input.date,
    due_date: input.dueDate,
    status: input.status,
    paid_at: paid ? (settledOn < todayISODate() ? settledOn : todayISODate()) : null,
    cost_type: input.kind === 'expense' ? (input.costType ?? 'variable') : null,
    notes: input.notes.trim(),
  }
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoadState>('loading')
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [recurring, setRecurring] = useState<RecurringCost[]>([])

  const generateRecurring = useCallback(async () => {
    await supabase.rpc('finance_generate_recurring', { p_until: periodStartISO(currentPeriod()) })
  }, [])

  const loadAll = useCallback(async () => {
    const [txRes, recRes] = await Promise.all([
      supabase.from('finance_transactions').select('*').order('date', { ascending: false }),
      supabase.from('finance_recurring').select('*').order('created_at', { ascending: true }),
    ])
    if (isMissingTable(txRes.error) || isMissingTable(recRes.error)) {
      setState('missing-schema')
      return
    }
    if (txRes.error || recRes.error) {
      setState('error')
      return
    }
    setTransactions((txRes.data as FinanceTransactionRow[]).map(fromTransactionRow))
    setRecurring((recRes.data as RecurringCostRow[]).map(fromRecurringRow))
    setState('ready')
  }, [])

  useEffect(() => {
    let cancelled = false

    // Materialize this month's fixed-cost bills before the first read, so they show up right away.
    generateRecurring().finally(() => {
      if (!cancelled) loadAll()
    })

    const channel = supabase
      .channel('finance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_transactions' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setTransactions((prev) => prev.filter((t) => t.id !== (payload.old as FinanceTransactionRow).id))
        } else {
          setTransactions((prev) => upsertById(prev, fromTransactionRow(payload.new as FinanceTransactionRow)))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_recurring' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setRecurring((prev) => prev.filter((r) => r.id !== (payload.old as RecurringCostRow).id))
        } else {
          const row = fromRecurringRow(payload.new as RecurringCostRow)
          setRecurring((prev) =>
            prev.some((r) => r.id === row.id) ? prev.map((r) => (r.id === row.id ? row : r)) : [...prev, row],
          )
        }
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [generateRecurring, loadAll])

  // Writes apply the returned row locally as well, so the screen updates even
  // if the realtime publication is slow or not configured.
  const addTransaction = useCallback(async (input: TransactionInput) => {
    const { data } = must(await supabase.from('finance_transactions').insert(toRowPayload(input)).select().single())
    if (data) setTransactions((prev) => upsertById(prev, fromTransactionRow(data as FinanceTransactionRow)))
  }, [])

  const updateTransaction = useCallback(async (id: string, input: TransactionInput) => {
    const { data } = must(
      await supabase.from('finance_transactions').update(toRowPayload(input)).eq('id', id).select().single(),
    )
    if (data) setTransactions((prev) => upsertById(prev, fromTransactionRow(data as FinanceTransactionRow)))
  }, [])

  const deleteTransaction = useCallback(async (id: string) => {
    must(await supabase.from('finance_transactions').delete().eq('id', id))
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const setPaid = useCallback(async (id: string, paid: boolean) => {
    const { data } = must(
      await supabase
        .from('finance_transactions')
        .update({ status: paid ? 'paid' : 'pending', paid_at: paid ? todayISODate() : null })
        .eq('id', id)
        .select()
        .single(),
    )
    if (data) setTransactions((prev) => upsertById(prev, fromTransactionRow(data as FinanceTransactionRow)))
  }, [])

  const addRecurring = useCallback(
    async (input: RecurringInput) => {
      must(
        await supabase.from('finance_recurring').insert({
          description: input.description.trim(),
          category: input.category,
          amount: input.amount,
          due_day: input.dueDay,
          notes: input.notes.trim(),
          start_period: periodStartISO(currentPeriod()),
        }),
      )
      await generateRecurring()
      await loadAll()
    },
    [generateRecurring, loadAll],
  )

  // Editing a fixed cost also updates its bills that are still open from this
  // month on; bills already paid keep the value they were paid with.
  const updateRecurring = useCallback(
    async (id: string, input: RecurringInput) => {
      must(
        await supabase
          .from('finance_recurring')
          .update({
            description: input.description.trim(),
            category: input.category,
            amount: input.amount,
            due_day: input.dueDay,
            notes: input.notes.trim(),
          })
          .eq('id', id),
      )
      const fromPeriod = periodStartISO(currentPeriod())
      const open = transactions.filter(
        (t) => t.recurringId === id && t.status === 'pending' && t.period && t.period >= fromPeriod,
      )
      const results = await Promise.all(
        open.map((t) => {
          const due = recurringDueDate(input.dueDay, t.period!)
          return supabase
            .from('finance_transactions')
            .update({
              description: input.description.trim(),
              category: input.category,
              amount: input.amount,
              date: due,
              due_date: due,
            })
            .eq('id', t.id)
        }),
      )
      results.forEach(must)
      await loadAll()
    },
    [transactions, loadAll],
  )

  const setRecurringActive = useCallback(
    async (id: string, active: boolean) => {
      // On reactivation, resume from this month instead of back-filling the
      // months it was paused; the unique (recurring_id, period) key keeps this
      // month's bill from being duplicated if it already exists.
      const resume = active ? { last_generated_period: periodStartISO(shiftPeriod(currentPeriod(), -1)) } : {}
      must(await supabase.from('finance_recurring').update({ active, ...resume }).eq('id', id))
      if (active) await generateRecurring()
      await loadAll()
    },
    [generateRecurring, loadAll],
  )

  // Removes the fixed cost and its still-open bills from this month on. Paid
  // bills stay in the history (the foreign key just drops the link).
  const deleteRecurring = useCallback(
    async (id: string) => {
      must(
        await supabase
          .from('finance_transactions')
          .delete()
          .eq('recurring_id', id)
          .eq('status', 'pending')
          .gte('period', periodStartISO(currentPeriod())),
      )
      must(await supabase.from('finance_recurring').delete().eq('id', id))
      await loadAll()
    },
    [loadAll],
  )

  const value = useMemo<FinanceContextValue>(
    () => ({
      state,
      transactions,
      recurring,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      setPaid,
      addRecurring,
      updateRecurring,
      setRecurringActive,
      deleteRecurring,
    }),
    [
      state,
      transactions,
      recurring,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      setPaid,
      addRecurring,
      updateRecurring,
      setRecurringActive,
      deleteRecurring,
    ],
  )

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
