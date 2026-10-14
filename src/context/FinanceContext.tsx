import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import type { CostType, FinanceTransaction, RecurringCost, TransactionKind, TransactionStatus } from '../types'
import { COLLECTIONS, db } from '../lib/firebase'
import { todayISODate } from '../utils/time'
import { currentPeriod, periodStartISO, recurringDueDate, shiftPeriod, type Period } from '../utils/finance'

function fromTransactionDoc(d: QueryDocumentSnapshot<DocumentData>): FinanceTransaction {
  const data = d.data()
  return {
    id: d.id,
    kind: data.kind,
    description: data.description ?? '',
    category: data.category ?? 'Outros',
    amount: Number(data.amount) || 0,
    date: data.date,
    dueDate: data.dueDate ?? null,
    status: data.status ?? 'paid',
    paidAt: data.paidAt ?? null,
    costType: data.costType ?? null,
    recurringId: data.recurringId ?? null,
    period: data.period ?? null,
    notes: data.notes ?? '',
    createdAt: data.createdAt ?? '',
  }
}

function fromRecurringDoc(d: QueryDocumentSnapshot<DocumentData>): RecurringCost {
  const data = d.data()
  return {
    id: d.id,
    description: data.description ?? '',
    category: data.category ?? 'Outros',
    amount: Number(data.amount) || 0,
    dueDay: data.dueDay ?? 1,
    active: data.active ?? true,
    startPeriod: data.startPeriod,
    notes: data.notes ?? '',
    createdAt: data.createdAt ?? '',
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

type LoadState = 'loading' | 'ready' | 'error'

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

function toDocFields(input: TransactionInput) {
  const paid = input.status === 'paid'
  // An entry recorded as already settled is dated by its due/competência date, never in the future.
  const settledOn = input.dueDate ?? input.date
  return {
    kind: input.kind,
    description: input.description.trim(),
    category: input.category,
    amount: input.amount,
    date: input.date,
    dueDate: input.dueDate,
    status: input.status,
    paidAt: paid ? (settledOn < todayISODate() ? settledOn : todayISODate()) : null,
    costType: input.kind === 'expense' ? (input.costType ?? 'variable') : null,
    notes: input.notes.trim(),
  }
}

function toPeriod(iso: string): Period {
  const [year, month] = iso.split('-').map(Number)
  return { year, month: month - 1 }
}

/** Months (as YYYY-MM-01) from `from` through `to`, inclusive. */
function periodsBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let p = toPeriod(from); periodStartISO(p) <= to; p = shiftPeriod(p, 1)) out.push(periodStartISO(p))
  return out
}

// A fixed cost's bill for a month always has the same id, so generating it
// twice (two devices opening the app at once) lands on the same document
// instead of creating a duplicate.
const billId = (recurringId: string, period: string) => `${recurringId}_${period.slice(0, 7)}`

/**
 * Creates this month's bill (and any missed months) for every active fixed
 * cost. `lastGeneratedPeriod` remembers where each one stopped, so a bill that
 * was deleted by hand is not recreated.
 */
async function generateRecurringBills() {
  const until = periodStartISO(currentPeriod())
  const snap = await getDocs(query(collection(db, COLLECTIONS.recurring), where('active', '==', true)))
  for (const recDoc of snap.docs) {
    await runTransaction(db, async (tx) => {
      const r = (await tx.get(recDoc.ref)).data()
      if (!r || !r.active) return
      const last: string | null = r.lastGeneratedPeriod ?? null
      if (last && last >= until) return
      const next = last ? periodStartISO(shiftPeriod(toPeriod(last), 1)) : r.startPeriod
      const periods = periodsBetween(next > r.startPeriod ? next : r.startPeriod, until)
      const refs = periods.map((p) => doc(db, COLLECTIONS.transactions, billId(recDoc.id, p)))
      const existing = await Promise.all(refs.map((ref) => tx.get(ref)))
      periods.forEach((p, i) => {
        if (existing[i].exists()) return
        const due = recurringDueDate(r.dueDay, p)
        tx.set(refs[i], {
          kind: 'expense',
          description: r.description,
          category: r.category,
          amount: r.amount,
          date: due,
          dueDate: due,
          status: 'pending',
          paidAt: null,
          costType: 'fixed',
          recurringId: recDoc.id,
          period: p,
          notes: '',
          createdAt: new Date().toISOString(),
        })
      })
      tx.update(recDoc.ref, { lastGeneratedPeriod: until })
    })
  }
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoadState>('loading')
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [recurring, setRecurring] = useState<RecurringCost[]>([])
  const transactionsRef = useRef(transactions)

  useEffect(() => {
    transactionsRef.current = transactions
  }, [transactions])

  // Live listeners: the first snapshot is the initial load, later ones carry
  // changes made on any device.
  useEffect(() => {
    const pending = new Set(['transactions', 'recurring'])
    const settle = (key: string) => {
      pending.delete(key)
      if (pending.size === 0) setState((s) => (s === 'loading' ? 'ready' : s))
    }
    const fail = () => setState('error')

    // Materialize this month's fixed-cost bills; the listeners pick them up.
    generateRecurringBills().catch(() => {})

    const unsubs = [
      onSnapshot(
        collection(db, COLLECTIONS.transactions),
        (snap) => {
          setTransactions(
            snap.docs
              .map(fromTransactionDoc)
              .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
          )
          settle('transactions')
        },
        fail,
      ),
      onSnapshot(
        collection(db, COLLECTIONS.recurring),
        (snap) => {
          setRecurring(snap.docs.map(fromRecurringDoc).sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
          settle('recurring')
        },
        fail,
      ),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const addTransaction = useCallback(async (input: TransactionInput) => {
    await addDoc(collection(db, COLLECTIONS.transactions), {
      ...toDocFields(input),
      recurringId: null,
      period: null,
      createdAt: new Date().toISOString(),
    })
  }, [])

  const updateTransaction = useCallback(async (id: string, input: TransactionInput) => {
    await updateDoc(doc(db, COLLECTIONS.transactions, id), toDocFields(input))
  }, [])

  const deleteTransaction = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.transactions, id))
  }, [])

  const setPaid = useCallback(async (id: string, paid: boolean) => {
    await updateDoc(doc(db, COLLECTIONS.transactions, id), {
      status: paid ? 'paid' : 'pending',
      paidAt: paid ? todayISODate() : null,
    })
  }, [])

  const addRecurring = useCallback(async (input: RecurringInput) => {
    await addDoc(collection(db, COLLECTIONS.recurring), {
      description: input.description.trim(),
      category: input.category,
      amount: input.amount,
      dueDay: input.dueDay,
      notes: input.notes.trim(),
      active: true,
      startPeriod: periodStartISO(currentPeriod()),
      lastGeneratedPeriod: null,
      createdAt: new Date().toISOString(),
    })
    await generateRecurringBills()
  }, [])

  // Editing a fixed cost also updates its bills that are still open from this
  // month on; bills already paid keep the value they were paid with.
  const updateRecurring = useCallback(async (id: string, input: RecurringInput) => {
    const fromPeriod = periodStartISO(currentPeriod())
    const batch = writeBatch(db)
    batch.update(doc(db, COLLECTIONS.recurring, id), {
      description: input.description.trim(),
      category: input.category,
      amount: input.amount,
      dueDay: input.dueDay,
      notes: input.notes.trim(),
    })
    for (const t of transactionsRef.current) {
      if (t.recurringId !== id || t.status !== 'pending' || !t.period || t.period < fromPeriod) continue
      const due = recurringDueDate(input.dueDay, t.period)
      batch.update(doc(db, COLLECTIONS.transactions, t.id), {
        description: input.description.trim(),
        category: input.category,
        amount: input.amount,
        date: due,
        dueDate: due,
      })
    }
    await batch.commit()
  }, [])

  const setRecurringActive = useCallback(async (id: string, active: boolean) => {
    // On reactivation, resume from this month instead of back-filling the
    // months it was paused; a bill that already exists for this month is kept.
    const resume = active ? { lastGeneratedPeriod: periodStartISO(shiftPeriod(currentPeriod(), -1)) } : {}
    await updateDoc(doc(db, COLLECTIONS.recurring, id), { active, ...resume })
    if (active) await generateRecurringBills()
  }, [])

  // Removes the fixed cost and its still-open bills from this month on. Paid
  // and past bills stay in the history, just unlinked from the deleted cost.
  const deleteRecurring = useCallback(async (id: string) => {
    const fromPeriod = periodStartISO(currentPeriod())
    const bills = await getDocs(query(collection(db, COLLECTIONS.transactions), where('recurringId', '==', id)))
    const batch = writeBatch(db)
    for (const d of bills.docs) {
      const t = fromTransactionDoc(d)
      if (t.status === 'pending' && t.period && t.period >= fromPeriod) batch.delete(d.ref)
      else batch.update(d.ref, { recurringId: null })
    }
    batch.delete(doc(db, COLLECTIONS.recurring, id))
    await batch.commit()
  }, [])

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
