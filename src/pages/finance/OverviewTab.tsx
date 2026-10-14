import { useMemo } from 'react'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, ArrowRight, Check, Percent, Receipt, Scale, TrendingUp, Wallet } from 'lucide-react'
import { useFinance } from '../../context/FinanceContext'
import { useChartTheme } from '../../hooks/useChartTheme'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { KpiCard } from '../../components/ui/KpiCard'
import { IconButton } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Badge } from '../../components/ui/Badge'
import {
  dueText,
  effectiveDueDate,
  expensesByCategory,
  formatBRL,
  formatBRLCompact,
  formatPercent,
  MONTH_SHORT,
  monthlySummaries,
  monthRange,
  periodLabel,
  relativeChange,
  shiftPeriod,
  summarize,
  yearRange,
  type Period,
} from '../../utils/finance'
import { formatDate, todayISODate, toISODate } from '../../utils/time'
import { SignedAmount, StatusBadge } from './shared'
import { CATEGORY_PALETTE, CHART_COLORS } from './colors'

interface OverviewTabProps {
  mode: 'month' | 'year'
  period: Period
  onOpenBills: () => void
  onOpenTransactions: () => void
}

export function OverviewTab({ mode, period, onOpenBills, onOpenTransactions }: OverviewTabProps) {
  const { transactions, setPaid } = useFinance()
  const chart = useChartTheme()
  const todayISO = todayISODate()

  const [from, to] = mode === 'month' ? monthRange(period) : yearRange(period.year)
  const [prevFrom, prevTo] = mode === 'month' ? monthRange(shiftPeriod(period, -1)) : yearRange(period.year - 1)
  const comparisonLabel = mode === 'month' ? 'vs. mês anterior' : 'vs. ano anterior'

  const summary = useMemo(() => summarize(transactions, from, to), [transactions, from, to])
  const previous = useMemo(() => summarize(transactions, prevFrom, prevTo), [transactions, prevFrom, prevTo])
  const monthly = useMemo(() => monthlySummaries(transactions, period.year), [transactions, period.year])
  const byCategory = useMemo(() => {
    const all = expensesByCategory(transactions, from, to)
    if (all.length <= 7) return all
    const rest = all.slice(6).reduce((s, c) => s + c.value, 0)
    return [...all.slice(0, 6), { name: 'Outras', value: rest }]
  }, [transactions, from, to])
  const totalExpenses = byCategory.reduce((s, c) => s + c.value, 0)

  const overdue = useMemo(
    () => transactions.filter((t) => t.status === 'pending' && effectiveDueDate(t) < todayISO),
    [transactions, todayISO],
  )
  const upcoming = useMemo(() => {
    const limit = new Date()
    limit.setDate(limit.getDate() + 15)
    const limitISO = toISODate(limit)
    return transactions
      .filter((t) => t.status === 'pending' && effectiveDueDate(t) <= limitISO)
      .sort((a, b) => effectiveDueDate(a).localeCompare(effectiveDueDate(b)))
      .slice(0, 6)
  }, [transactions])
  const recent = useMemo(
    () => [...transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    [transactions],
  )

  const chartData = monthly.map((m, i) => ({
    name: MONTH_SHORT[i],
    Faturamento: m.revenue,
    Custos: m.operatingCost,
    Lucro: m.profit,
  }))
  const overdueTotal = overdue.reduce((s, t) => s + (t.kind === 'expense' ? t.amount : 0), 0)
  const overdueExpenses = overdue.filter((t) => t.kind === 'expense').length

  return (
    <div className="flex flex-col gap-6">
      {overdueExpenses > 0 && (
        <button
          onClick={onOpenBills}
          className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm text-rose-800 transition-colors hover:bg-rose-100 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
        >
          <AlertTriangle size={18} className="shrink-0" />
          <span className="flex-1">
            <strong>
              {overdueExpenses} {overdueExpenses === 1 ? 'conta vencida' : 'contas vencidas'}
            </strong>{' '}
            somando {formatBRL(overdueTotal)}. Regularize para evitar juros e multas.
          </span>
          <ArrowRight size={16} className="shrink-0" />
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="Faturamento"
          value={formatBRL(summary.revenue)}
          tone="emerald"
          delta={relativeChange(summary.revenue, previous.revenue)}
          deltaLabel={comparisonLabel}
        />
        <KpiCard
          icon={Receipt}
          label="Custo operacional"
          value={formatBRL(summary.operatingCost)}
          tone="rose"
          delta={relativeChange(summary.operatingCost, previous.operatingCost)}
          deltaGoodWhen="down"
          sub={`Fixo ${formatBRLCompact(summary.fixedCosts)} · Variável ${formatBRLCompact(summary.variableCosts)}`}
        />
        <KpiCard
          icon={Wallet}
          label="Lucro líquido"
          value={formatBRL(summary.profit)}
          tone="indigo"
          delta={relativeChange(summary.profit, previous.profit)}
          deltaLabel={comparisonLabel}
          valueClassName={summary.profit < 0 ? '!text-rose-600 dark:!text-rose-400' : undefined}
        />
        <KpiCard
          icon={Percent}
          label="Margem de lucro"
          value={summary.margin === null ? '—' : formatPercent(summary.margin)}
          tone="violet"
          sub={
            summary.contributionMargin === null
              ? 'Sem faturamento no período'
              : `Margem de contribuição ${formatPercent(summary.contributionMargin)}`
          }
        />
      </div>

      <Card>
        <div className="grid grid-cols-2 divide-slate-100 dark:divide-slate-800 lg:grid-cols-4 lg:divide-x">
          <div className="p-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">A receber no período</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{formatBRL(summary.toReceive)}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Recebido {formatBRL(summary.received)}</p>
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">A pagar no período</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{formatBRL(summary.toPay)}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Pago {formatBRL(summary.paid)}</p>
          </div>
          <div className="border-t border-slate-100 p-5 dark:border-slate-800 lg:border-t-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">Saldo de caixa no período</p>
            <p
              className={`mt-1 text-lg font-semibold tabular-nums ${summary.received - summary.paid < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}
            >
              {formatBRL(summary.received - summary.paid)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">Recebido − pago</p>
          </div>
          <div className="border-t border-slate-100 p-5 dark:border-slate-800 lg:border-t-0">
            <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Scale size={12} /> Ponto de equilíbrio
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
              {summary.breakEven === null ? '—' : formatBRL(summary.breakEven)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {summary.breakEven === null
                ? 'Precisa de faturamento no período'
                : summary.revenue >= summary.breakEven
                  ? 'Faturamento acima do equilíbrio'
                  : `Faltam ${formatBRL(summary.breakEven - summary.revenue)}`}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Desempenho em {period.year}</CardTitle>
              <CardDescription>Faturamento, custos e lucro mês a mês</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid stroke={chart.gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: chart.axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: chart.axisColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tickFormatter={(v) => formatBRLCompact(Number(v))}
                />
                <Tooltip
                  cursor={{ fill: chart.cursorFill }}
                  contentStyle={chart.tooltipStyle}
                  itemStyle={chart.tooltipItemStyle}
                  labelStyle={chart.tooltipLabelStyle}
                  formatter={(value, name) => [formatBRL(Number(value)), name]}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: chart.axisColor, paddingTop: 8 }} />
                <Bar dataKey="Faturamento" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                <Bar dataKey="Custos" fill={CHART_COLORS.cost} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                <Line
                  type="monotone"
                  dataKey="Lucro"
                  stroke={CHART_COLORS.profit}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: CHART_COLORS.profit, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Custos por categoria</CardTitle>
              <CardDescription>{mode === 'month' ? periodLabel(period) : `Ano de ${period.year}`}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {byCategory.length === 0 ? (
              <EmptyState icon={Receipt} title="Sem custos no período" />
            ) : (
              <>
                <div className="relative h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byCategory}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={56}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {byCategory.map((c, i) => (
                          <Cell key={c.name} fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={chart.tooltipStyle}
                        itemStyle={chart.tooltipItemStyle}
                        formatter={(value, name) => [formatBRL(Number(value)), name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[11px] text-slate-400">Total</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      {formatBRLCompact(totalExpenses)}
                    </span>
                  </div>
                </div>
                <ul className="mt-4 flex flex-col gap-2">
                  {byCategory.map((c, i) => (
                    <li key={c.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] }} />
                      <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{c.name}</span>
                      <span className="tabular-nums text-slate-400">{formatPercent(c.value / totalExpenses, 0)}</span>
                      <span className="w-24 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">
                        {formatBRL(c.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Próximos vencimentos</CardTitle>
              <CardDescription>Vencidos e até 15 dias</CardDescription>
            </div>
            <button onClick={onOpenBills} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Ver todas
            </button>
          </CardHeader>
          <CardContent className="pt-3">
            {upcoming.length === 0 ? (
              <EmptyState icon={Check} title="Nada vencendo" description="Nenhuma conta em aberto nos próximos 15 dias." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {upcoming.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{t.description}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                        <StatusBadge t={t} todayISO={todayISO} />
                        {dueText(t, todayISO)} · {formatDate(effectiveDueDate(t))}
                      </p>
                    </div>
                    <SignedAmount t={t} className="text-sm" />
                    <IconButton
                      tone="success"
                      onClick={() => setPaid(t.id, true).catch(() => {})}
                      aria-label={t.kind === 'income' ? 'Marcar como recebido' : 'Marcar como pago'}
                      title={t.kind === 'income' ? 'Marcar como recebido' : 'Marcar como pago'}
                    >
                      <Check size={16} />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Últimos lançamentos</CardTitle>
              <CardDescription>Registrados mais recentemente</CardDescription>
            </div>
            <button onClick={onOpenTransactions} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Ver todos
            </button>
          </CardHeader>
          <CardContent className="pt-3">
            {recent.length === 0 ? (
              <EmptyState icon={Receipt} title="Nenhum lançamento ainda" description="Use os botões Nova receita e Nova despesa." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {recent.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{t.description}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                        {formatDate(t.date)} · {t.category}
                        {t.costType === 'fixed' && <Badge tone="violet">Fixo</Badge>}
                      </p>
                    </div>
                    <SignedAmount t={t} className="text-sm" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
