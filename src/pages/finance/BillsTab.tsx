import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, CalendarDays, Check, CircleDollarSign, Pencil, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { useFinance } from '../../context/FinanceContext'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button, IconButton } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { KpiCard } from '../../components/ui/KpiCard'
import type { FinanceTransaction, TransactionKind } from '../../types'
import { dueState, dueText, effectiveDueDate, formatBRL, type DueState } from '../../utils/finance'
import { formatDate, todayISODate } from '../../utils/time'
import { ChoiceGroup, DateChip } from './shared'

const GROUPS: { id: DueState; label: string }[] = [
  { id: 'overdue', label: 'Vencidas' },
  { id: 'today', label: 'Vencem hoje' },
  { id: 'soon', label: 'Próximos 7 dias' },
  { id: 'later', label: 'Mais adiante' },
]

export function BillsTab({ onEdit }: { onEdit: (t: FinanceTransaction) => void }) {
  const { transactions, setPaid } = useFinance()
  const [kind, setKind] = useState<TransactionKind>('expense')
  const todayISO = todayISODate()
  const isIncome = kind === 'income'

  const open = useMemo(
    () =>
      transactions
        .filter((t) => t.kind === kind && t.status === 'pending')
        .sort((a, b) => effectiveDueDate(a).localeCompare(effectiveDueDate(b))),
    [transactions, kind],
  )

  const grouped = useMemo(() => {
    const map: Record<DueState, FinanceTransaction[]> = { overdue: [], today: [], soon: [], later: [] }
    for (const t of open) map[dueState(t, todayISO)].push(t)
    return map
  }, [open, todayISO])

  const recentlySettled = useMemo(
    () =>
      transactions
        .filter((t) => t.kind === kind && t.status === 'paid' && t.paidAt)
        .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? '') || b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8),
    [transactions, kind],
  )

  const sum = (list: FinanceTransaction[]) => list.reduce((s, t) => s + t.amount, 0)
  const next7 = [...grouped.today, ...grouped.soon]

  return (
    <div className="flex flex-col gap-6">
      <div className="w-full sm:w-80">
        <ChoiceGroup
          value={kind}
          onChange={setKind}
          options={[
            { value: 'expense', label: 'Contas a pagar' },
            { value: 'income', label: 'Contas a receber' },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <KpiCard
          icon={AlertTriangle}
          label="Vencidas"
          value={formatBRL(sum(grouped.overdue))}
          tone="rose"
          sub={`${grouped.overdue.length} ${grouped.overdue.length === 1 ? 'conta' : 'contas'}`}
        />
        <KpiCard
          icon={CalendarClock}
          label="Vencem em 7 dias"
          value={formatBRL(sum(next7))}
          tone="amber"
          sub={`${next7.length} ${next7.length === 1 ? 'conta' : 'contas'}`}
        />
        <KpiCard
          icon={CircleDollarSign}
          label={isIncome ? 'Total a receber' : 'Total a pagar'}
          value={formatBRL(sum(open))}
          tone="indigo"
          sub={`${open.length} em aberto`}
        />
      </div>

      {open.length === 0 ? (
        <Card>
          <EmptyState
            icon={Check}
            title={isIncome ? 'Nada a receber' : 'Tudo em dia'}
            description={
              isIncome
                ? 'Lance uma receita como "A receber" para acompanhar aqui.'
                : 'Nenhuma conta em aberto. Custos fixos geram contas aqui automaticamente todo mês.'
            }
          />
        </Card>
      ) : (
        GROUPS.filter((g) => grouped[g.id].length > 0).map((g) => (
          <Card key={g.id}>
            <CardHeader>
              <CardTitle className={clsx(g.id === 'overdue' && 'text-rose-600 dark:text-rose-400')}>{g.label}</CardTitle>
              <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
                {grouped[g.id].length} · {formatBRL(sum(grouped[g.id]))}
              </span>
            </CardHeader>
            <CardContent className="pt-3">
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {grouped[g.id].map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-3">
                    <DateChip
                      iso={effectiveDueDate(t)}
                      tone={g.id === 'overdue' ? 'rose' : g.id === 'today' ? 'amber' : 'slate'}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{t.description}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className={clsx(g.id === 'overdue' && 'font-medium text-rose-600 dark:text-rose-400')}>
                          {dueText(t, todayISO)}
                        </span>
                        · {t.category}
                        {t.recurringId && <Badge tone="violet">Custo fixo</Badge>}
                      </p>
                    </div>
                    <span className="hidden whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900 dark:text-white sm:block">
                      {formatBRL(t.amount)}
                    </span>
                    <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                      <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900 dark:text-white sm:hidden">
                        {formatBRL(t.amount)}
                      </span>
                      <div className="flex items-center gap-1">
                        <IconButton onClick={() => onEdit(t)} aria-label="Editar" title="Editar">
                          <Pencil size={15} />
                        </IconButton>
                        <Button size="sm" variant="success" onClick={() => setPaid(t.id, true).catch(() => {})}>
                          <Check size={14} />
                          {isIncome ? 'Receber' : 'Pagar'}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}

      {recentlySettled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{isIncome ? 'Recebidas recentemente' : 'Pagas recentemente'}</CardTitle>
            <CalendarDays size={16} className="text-slate-400" />
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentlySettled.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700 dark:text-slate-200">{t.description}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {isIncome ? 'Recebida' : 'Paga'} em {formatDate(t.paidAt!)} · {t.category}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-medium tabular-nums text-slate-500 dark:text-slate-400">
                    {formatBRL(t.amount)}
                  </span>
                  <IconButton
                    onClick={() => setPaid(t.id, false).catch(() => {})}
                    aria-label="Desfazer"
                    title="Desfazer (voltar para em aberto)"
                  >
                    <RotateCcw size={15} />
                  </IconButton>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
