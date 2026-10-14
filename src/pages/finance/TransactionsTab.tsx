import { useMemo, useState } from 'react'
import { Check, Download, Pencil, Receipt, RotateCcw, Search, Trash2 } from 'lucide-react'
import { useFinance } from '../../context/FinanceContext'
import { Card } from '../../components/ui/Card'
import { Button, IconButton } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal, ModalActions } from '../../components/ui/Modal'
import type { FinanceTransaction } from '../../types'
import { downloadCSV, formatBRL, monthRange, periodKeyOf, yearRange, type Period } from '../../utils/finance'
import { formatDate, todayISODate } from '../../utils/time'
import { ChoiceGroup, MiniStat, SignedAmount, StatusBadge } from './shared'

type KindFilter = 'all' | 'income' | 'expense'
type StatusFilter = 'all' | 'paid' | 'pending'

interface TransactionsTabProps {
  mode: 'month' | 'year'
  period: Period
  onEdit: (t: FinanceTransaction) => void
}

export function TransactionsTab({ mode, period, onEdit }: TransactionsTabProps) {
  const { transactions, setPaid, deleteTransaction } = useFinance()
  const [kind, setKind] = useState<KindFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<FinanceTransaction | null>(null)
  const todayISO = todayISODate()

  const [from, to] = mode === 'month' ? monthRange(period) : yearRange(period.year)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return transactions
      .filter((t) => t.date >= from && t.date <= to)
      .filter((t) => kind === 'all' || t.kind === kind)
      .filter((t) => status === 'all' || t.status === status)
      .filter(
        (t) =>
          !q ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }, [transactions, from, to, kind, status, query])

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of filtered) {
      if (t.kind === 'income') income += t.amount
      else expense += t.amount
    }
    return { income, expense, balance: income - expense }
  }, [filtered])

  function exportCSV() {
    const rows: (string | number)[][] = [
      ['Data', 'Tipo', 'Descrição', 'Categoria', 'Tipo de custo', 'Situação', 'Vencimento', 'Pago/recebido em', 'Valor', 'Observações'],
      ...filtered.map((t) => [
        formatDate(t.date),
        t.kind === 'income' ? 'Receita' : 'Despesa',
        t.description,
        t.category,
        t.kind === 'expense' ? (t.costType === 'fixed' ? 'Fixo' : 'Variável') : '',
        t.status === 'paid' ? (t.kind === 'income' ? 'Recebido' : 'Pago') : 'Em aberto',
        t.dueDate ? formatDate(t.dueDate) : '',
        t.paidAt ? formatDate(t.paidAt) : '',
        t.kind === 'income' ? t.amount : -t.amount,
        t.notes,
      ]),
    ]
    const suffix = mode === 'month' ? periodKeyOf(period) : String(period.year)
    downloadCSV(`lancamentos-${suffix}.csv`, rows)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="w-full lg:w-72">
            <ChoiceGroup
              value={kind}
              onChange={setKind}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'income', label: 'Receitas' },
                { value: 'expense', label: 'Despesas' },
              ]}
            />
          </div>
          <div className="w-full lg:w-44">
            <Select
              value={status}
              onChange={(v) => setStatus(v as StatusFilter)}
              options={[
                { value: 'all', label: 'Todas as situações' },
                { value: 'paid', label: 'Pagos / recebidos' },
                { value: 'pending', label: 'Em aberto' },
              ]}
            />
          </div>
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar descrição, categoria…"
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download size={16} />
            Exportar CSV
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <MiniStat label="Entradas" value={formatBRL(totals.income)} tone="emerald" />
          <MiniStat label="Saídas" value={formatBRL(totals.expense)} tone="rose" />
          <MiniStat label="Resultado" value={formatBRL(totals.balance)} tone={totals.balance < 0 ? 'rose' : undefined} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nenhum lançamento encontrado"
            description="Ajuste os filtros ou o período, ou registre uma nova receita ou despesa."
          />
        ) : (
          <>
            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-3 py-3 font-medium">Descrição</th>
                    <th className="px-3 py-3 font-medium">Categoria</th>
                    <th className="px-3 py-3 font-medium">Situação</th>
                    <th className="px-3 py-3 text-right font-medium">Valor</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((t) => (
                    <tr key={t.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="whitespace-nowrap px-5 py-3 tabular-nums text-slate-500 dark:text-slate-400">{formatDate(t.date)}</td>
                      <td className="max-w-xs px-3 py-3">
                        <p className="truncate font-medium text-slate-800 dark:text-slate-100">{t.description}</p>
                        {(t.notes || t.dueDate) && (
                          <p className="truncate text-[11px] text-slate-400">
                            {t.dueDate && `Venc. ${formatDate(t.dueDate)}`}
                            {t.dueDate && t.notes && ' · '}
                            {t.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-slate-600 dark:text-slate-300">{t.category}</span>
                          {t.kind === 'expense' && (
                            <Badge tone={t.costType === 'fixed' ? 'violet' : 'amber'}>
                              {t.costType === 'fixed' ? 'Fixo' : 'Variável'}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge t={t} todayISO={todayISO} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <SignedAmount t={t} />
                      </td>
                      <td className="px-5 py-3">
                        <RowActions t={t} onEdit={onEdit} onDelete={setConfirmDelete} onTogglePaid={setPaid} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: list */}
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
              {filtered.map((t) => (
                <li key={t.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{t.description}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {formatDate(t.date)} · {t.category}
                      </p>
                    </div>
                    <SignedAmount t={t} className="text-sm" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge t={t} todayISO={todayISO} />
                      {t.kind === 'expense' && (
                        <Badge tone={t.costType === 'fixed' ? 'violet' : 'amber'}>{t.costType === 'fixed' ? 'Fixo' : 'Variável'}</Badge>
                      )}
                    </div>
                    <RowActions t={t} onEdit={onEdit} onDelete={setConfirmDelete} onTogglePaid={setPaid} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Excluir lançamento">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Excluir <strong>{confirmDelete?.description}</strong> ({confirmDelete && formatBRL(confirmDelete.amount)})? Esta ação
          não pode ser desfeita.
        </p>
        <ModalActions>
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirmDelete) deleteTransaction(confirmDelete.id).catch(() => {})
              setConfirmDelete(null)
            }}
          >
            Excluir
          </Button>
        </ModalActions>
      </Modal>
    </div>
  )
}

function RowActions({
  t,
  onEdit,
  onDelete,
  onTogglePaid,
}: {
  t: FinanceTransaction
  onEdit: (t: FinanceTransaction) => void
  onDelete: (t: FinanceTransaction) => void
  onTogglePaid: (id: string, paid: boolean) => Promise<void>
}) {
  const paid = t.status === 'paid'
  const label = paid ? 'Reabrir' : t.kind === 'income' ? 'Marcar como recebido' : 'Marcar como pago'
  return (
    <div className="flex justify-end gap-0.5">
      <IconButton tone={paid ? 'neutral' : 'success'} onClick={() => onTogglePaid(t.id, !paid).catch(() => {})} aria-label={label} title={label}>
        {paid ? <RotateCcw size={15} /> : <Check size={16} />}
      </IconButton>
      <IconButton onClick={() => onEdit(t)} aria-label="Editar" title="Editar">
        <Pencil size={15} />
      </IconButton>
      <IconButton tone="danger" onClick={() => onDelete(t)} aria-label="Excluir" title="Excluir">
        <Trash2 size={15} />
      </IconButton>
    </div>
  )
}
