import { useMemo } from 'react'
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Award, Download, Receipt, TrendingUp, Wallet } from 'lucide-react'
import clsx from 'clsx'
import { useFinance } from '../../context/FinanceContext'
import { useChartTheme } from '../../hooks/useChartTheme'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { KpiCard } from '../../components/ui/KpiCard'
import {
  downloadCSV,
  formatBRL,
  formatBRLCompact,
  formatPercent,
  MONTH_NAMES,
  MONTH_SHORT,
  monthlySummaries,
  relativeChange,
  summarize,
  yearRange,
  type Summary,
} from '../../utils/finance'
import { CHART_COLORS } from './colors'

interface Row {
  label: string
  value: (s: Summary) => number | null
  kind: 'money' | 'percent'
  emphasis?: 'subtotal' | 'total'
  negative?: boolean
}

const ROWS: Row[] = [
  { label: 'Receita bruta (faturamento)', value: (s) => s.revenue, kind: 'money' },
  { label: '(−) Custos variáveis', value: (s) => s.variableCosts, kind: 'money', negative: true },
  { label: '(=) Margem de contribuição', value: (s) => s.revenue - s.variableCosts, kind: 'money', emphasis: 'subtotal' },
  { label: '(−) Custos fixos', value: (s) => s.fixedCosts, kind: 'money', negative: true },
  { label: '(=) Lucro líquido', value: (s) => s.profit, kind: 'money', emphasis: 'total' },
  { label: 'Margem líquida', value: (s) => s.margin, kind: 'percent' },
]

export function AnnualTab({ year }: { year: number }) {
  const { transactions } = useFinance()
  const chart = useChartTheme()
  const now = new Date()

  const months = useMemo(() => monthlySummaries(transactions, year), [transactions, year])
  const total = useMemo(() => summarize(transactions, ...yearRange(year)), [transactions, year])
  const previousTotal = useMemo(() => summarize(transactions, ...yearRange(year - 1)), [transactions, year])

  // Average over months that already happened (all 12 for past years).
  const elapsed = year < now.getFullYear() ? 12 : year === now.getFullYear() ? now.getMonth() + 1 : 0
  const avgProfit = elapsed > 0 ? months.slice(0, elapsed).reduce((s, m) => s + m.profit, 0) / elapsed : 0
  const bestIndex = months.reduce((best, m, i) => (m.profit > months[best].profit ? i : best), 0)
  const hasData = months.some((m) => m.revenue > 0 || m.operatingCost > 0)

  // Months that haven't started yet stay blank instead of drawing a flat line.
  const chartData = months.map((m, i) => {
    const future = year > now.getFullYear() || (year === now.getFullYear() && i > now.getMonth())
    const hasEntries = m.revenue > 0 || m.operatingCost > 0
    return {
      name: MONTH_SHORT[i],
      Lucro: future && !hasEntries ? null : m.profit,
      Acumulado: future ? null : months.slice(0, i + 1).reduce((s, x) => s + x.profit, 0),
    }
  })

  function exportCSV() {
    const fmt = (row: Row, s: Summary) => {
      const v = row.value(s)
      if (v === null) return ''
      return row.kind === 'percent' ? formatPercent(v) : v
    }
    downloadCSV(`dre-${year}.csv`, [
      ['Demonstrativo', ...MONTH_NAMES, 'Total'],
      ...ROWS.map((row) => [row.label, ...months.map((m) => fmt(row, m)), fmt(row, total)]),
    ])
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label={`Faturamento ${year}`}
          value={formatBRL(total.revenue)}
          tone="emerald"
          delta={relativeChange(total.revenue, previousTotal.revenue)}
          deltaLabel="vs. ano anterior"
        />
        <KpiCard
          icon={Receipt}
          label={`Custos ${year}`}
          value={formatBRL(total.operatingCost)}
          tone="rose"
          delta={relativeChange(total.operatingCost, previousTotal.operatingCost)}
          deltaGoodWhen="down"
          deltaLabel="vs. ano anterior"
        />
        <KpiCard
          icon={Wallet}
          label={`Lucro ${year}`}
          value={formatBRL(total.profit)}
          tone="indigo"
          sub={total.margin === null ? 'Sem faturamento' : `Margem ${formatPercent(total.margin)}`}
          valueClassName={total.profit < 0 ? '!text-rose-600 dark:!text-rose-400' : undefined}
        />
        <KpiCard
          icon={Award}
          label="Lucro médio mensal"
          value={formatBRL(avgProfit)}
          tone="amber"
          sub={hasData ? `Melhor mês: ${MONTH_NAMES[bestIndex]}` : 'Sem lançamentos no ano'}
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Lucro mensal e acumulado</CardTitle>
            <CardDescription>Barras verdes = lucro, vermelhas = prejuízo</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-72 pt-2">
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
              <Bar dataKey="Lucro" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} fill={CHART_COLORS.revenue}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={(d.Lucro ?? 0) < 0 ? CHART_COLORS.cost : CHART_COLORS.revenue} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="Acumulado" stroke={CHART_COLORS.profit} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              Demonstrativo de resultado (DRE) — {year}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Regime de competência, mês a mês</p>
          </div>
          <Button variant="outline" onClick={exportCSV}>
            <Download size={16} />
            Exportar CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-right text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                <th className="sticky left-0 z-10 bg-slate-50 px-5 py-3 text-left font-medium dark:bg-[#0f1627]">Conta</th>
                {MONTH_SHORT.map((m, i) => (
                  <th
                    key={m}
                    className={clsx(
                      'px-3 py-3 font-medium',
                      year === now.getFullYear() && i === now.getMonth() && 'text-indigo-600 dark:text-indigo-400',
                    )}
                  >
                    {m}
                  </th>
                ))}
                <th className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-200">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ROWS.map((row) => {
                const cell = (s: Summary) => {
                  const v = row.value(s)
                  if (v === null) return '—'
                  if (row.kind === 'percent') return formatPercent(v)
                  if (v === 0) return '—'
                  return formatBRL(v)
                }
                const tone = (s: Summary) => {
                  const v = row.value(s)
                  if (row.emphasis === 'total' || row.kind === 'percent') {
                    if (v !== null && v < 0) return 'text-rose-600 dark:text-rose-400'
                    if (v !== null && v > 0) return 'text-emerald-600 dark:text-emerald-400'
                  }
                  return row.negative ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200'
                }
                return (
                  <tr
                    key={row.label}
                    className={clsx(
                      row.emphasis === 'subtotal' && 'bg-slate-50/50 font-medium dark:bg-slate-900/30',
                      row.emphasis === 'total' && 'bg-indigo-50/40 font-semibold dark:bg-indigo-500/[0.06]',
                    )}
                  >
                    <td
                      className={clsx(
                        'sticky left-0 z-10 whitespace-nowrap px-5 py-3 text-left text-slate-700 dark:text-slate-200',
                        row.emphasis === 'total' ? 'bg-[#f6f7fe] dark:bg-[#111833]' : 'bg-white dark:bg-surface-dark',
                      )}
                    >
                      {row.label}
                    </td>
                    {months.map((m, i) => (
                      <td key={i} className={clsx('whitespace-nowrap px-3 py-3 tabular-nums', tone(m))}>
                        {cell(m)}
                      </td>
                    ))}
                    <td className={clsx('whitespace-nowrap px-5 py-3 font-semibold tabular-nums', tone(total))}>{cell(total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
