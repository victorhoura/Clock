import { useMemo, useState } from 'react'
import { CalendarClock, CalendarRange, Layers, Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useFinance } from '../../context/FinanceContext'
import { Card } from '../../components/ui/Card'
import { Button, IconButton } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { KpiCard } from '../../components/ui/KpiCard'
import { Modal, ModalActions } from '../../components/ui/Modal'
import type { RecurringCost } from '../../types'
import { currentPeriod, formatBRL, monthlyFixedTotal, periodStartISO } from '../../utils/finance'
import { todayISODate } from '../../utils/time'

export function RecurringTab({ onNew, onEdit }: { onNew: () => void; onEdit: (r: RecurringCost) => void }) {
  const { recurring, transactions, setRecurringActive, deleteRecurring } = useFinance()
  const [confirmDelete, setConfirmDelete] = useState<RecurringCost | null>(null)
  const thisPeriod = periodStartISO(currentPeriod())
  const today = new Date().getDate()
  const todayISO = todayISODate()

  // This month's bill for each fixed cost, to show whether it is paid yet.
  const currentBill = useMemo(() => {
    const map = new Map<string, (typeof transactions)[number]>()
    for (const t of transactions) if (t.recurringId && t.period === thisPeriod) map.set(t.recurringId, t)
    return map
  }, [transactions, thisPeriod])

  const sorted = useMemo(
    () => [...recurring].sort((a, b) => Number(b.active) - Number(a.active) || a.dueDay - b.dueDay),
    [recurring],
  )
  const monthly = monthlyFixedTotal(recurring)
  const activeCount = recurring.filter((r) => r.active).length
  const nextDue = sorted.filter((r) => r.active).sort((a, b) => {
    const da = a.dueDay >= today ? a.dueDay : a.dueDay + 31
    const db = b.dueDay >= today ? b.dueDay : b.dueDay + 31
    return da - db
  })[0]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <KpiCard icon={Repeat} label="Custo fixo mensal" value={formatBRL(monthly)} tone="violet" sub={`${activeCount} ativos`} />
        <KpiCard icon={CalendarRange} label="Projeção anual" value={formatBRL(monthly * 12)} tone="indigo" sub="Custo fixo × 12 meses" />
        <KpiCard
          icon={CalendarClock}
          label="Próximo vencimento"
          value={nextDue ? `Dia ${nextDue.dueDay}` : '—'}
          tone="amber"
          sub={nextDue ? `${nextDue.description} · ${formatBRL(nextDue.amount)}` : 'Nenhum custo fixo ativo'}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">Custos fixos</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cada custo ativo gera automaticamente uma conta a pagar todo mês, no dia do vencimento.
            </p>
          </div>
          <Button onClick={onNew}>
            <Plus size={16} />
            Novo custo fixo
          </Button>
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Nenhum custo fixo cadastrado"
            description="Cadastre aluguel, salários, internet, assinaturas e outras contas que se repetem todo mês."
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {sorted.map((r) => {
              const bill = currentBill.get(r.id)
              return (
                <li key={r.id} className={clsx('flex items-center gap-3 px-5 py-3.5', !r.active && 'opacity-60')}>
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-violet-50 leading-none text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/25">
                    <span className="text-[9px] font-medium uppercase">Dia</span>
                    <span className="mt-0.5 text-sm font-semibold tabular-nums">{r.dueDay}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{r.description}</p>
                    <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white sm:hidden">{formatBRL(r.amount)}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{r.category}</span>
                      {!r.active ? (
                        <Badge tone="slate">Pausado</Badge>
                      ) : bill?.status === 'paid' ? (
                        <Badge tone="emerald">Pago este mês</Badge>
                      ) : bill && (bill.dueDate ?? bill.date) < todayISO ? (
                        <Badge tone="rose">Vencido este mês</Badge>
                      ) : bill ? (
                        <Badge tone="amber">Em aberto este mês</Badge>
                      ) : null}
                    </div>
                  </div>
                  <span className="hidden whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900 dark:text-white sm:block">
                    {formatBRL(r.amount)}
                  </span>
                  <div className="flex gap-0.5">
                    <IconButton
                      onClick={() => setRecurringActive(r.id, !r.active).catch(() => {})}
                      aria-label={r.active ? 'Pausar' : 'Reativar'}
                      title={r.active ? 'Pausar (para de gerar contas)' : 'Reativar'}
                    >
                      {r.active ? <Pause size={15} /> : <Play size={15} />}
                    </IconButton>
                    <IconButton onClick={() => onEdit(r)} aria-label="Editar" title="Editar">
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton tone="danger" onClick={() => setConfirmDelete(r)} aria-label="Excluir" title="Excluir">
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {sorted.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/40">
            <span className="text-slate-500 dark:text-slate-400">Total mensal (ativos)</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatBRL(monthly)}</span>
          </div>
        )}
      </Card>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Excluir custo fixo">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Excluir <strong>{confirmDelete?.description}</strong>? As contas ainda em aberto a partir deste mês também serão
          removidas. As contas já pagas continuam no histórico.
        </p>
        <ModalActions>
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirmDelete) deleteRecurring(confirmDelete.id).catch(() => {})
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
