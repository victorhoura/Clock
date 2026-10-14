import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, Clock, ListTodo, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { KpiCard } from '../components/ui/KpiCard'
import { PageHeader } from '../components/ui/PageHeader'
import { useChartTheme } from '../hooks/useChartTheme'
import { TeamCalendar } from '../components/TeamCalendar'
import { Avatar } from '../components/ui/Avatar'
import { dailyTeamHours, hoursInRange, hoursPerUser, lastNDays } from '../utils/stats'
import { formatDate, formatHours } from '../utils/time'
import type { Activity, TeamMember } from '../types'

const STATUS_COLORS: Record<string, string> = {
  Pendente: '#cbd5e1',
  'Em andamento': '#f59e0b',
  Concluída: '#10b981',
}

function ActivityListCard({
  title,
  activities,
  userMap,
  emptyMessage,
  accent,
}: {
  title: string
  activities: Activity[]
  userMap: Map<string, TeamMember>
  emptyMessage: string
  accent: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${accent}`} />
          {title}
        </CardTitle>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {activities.length}
        </span>
      </CardHeader>
      <CardContent className="flex h-72 flex-col gap-2 overflow-y-auto pt-4">
        {activities.length === 0 && <p className="py-8 text-center text-xs text-slate-400">{emptyMessage}</p>}
        {activities.map((activity) => {
          const assignees = activity.assigneeIds.map((id) => userMap.get(id)).filter((u): u is TeamMember => !!u)
          return (
            <div
              key={activity.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2.5 transition-colors hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/30"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{activity.title}</p>
                <p className="text-[11px] text-slate-400">Criada em {formatDate(activity.createdAt.slice(0, 10))}</p>
              </div>
              <div className="flex shrink-0 -space-x-1.5">
                {assignees.map((u) => (
                  <div key={u.id} title={u.name} className="ring-2 ring-white dark:ring-surface-dark">
                    <Avatar user={u} size={24} />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { users, timeEntries, activities } = useApp()
  const chart = useChartTheme()
  const gridColor = chart.gridColor
  const AXIS_COLOR = chart.axisColor
  const tooltipStyle = chart.tooltipStyle
  const tooltipItemStyle = chart.tooltipItemStyle

  const days14 = useMemo(() => lastNDays(14), [])
  const days7 = useMemo(() => lastNDays(7), [])

  const weekHours = useMemo(() => hoursInRange(timeEntries, days7[0], days7[days7.length - 1]), [timeEntries, days7])
  const allTimeHours = useMemo(
    () => hoursInRange(timeEntries, '0000-01-01', '9999-12-31'),
    [timeEntries],
  )
  const completedThisWeek = useMemo(
    () =>
      activities.filter(
        (a) => a.status === 'completed' && a.completedAt && days7.includes(a.completedAt.slice(0, 10)),
      ).length,
    [activities, days7],
  )
  const totalCompleted = useMemo(() => activities.filter((a) => a.status === 'completed').length, [activities])
  const activeNow = useMemo(() => timeEntries.filter((e) => e.clockOut === null).length, [timeEntries])

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])
  const hoursByUser = useMemo(() => hoursPerUser(timeEntries, users), [timeEntries, users])
  const pendingActivities = useMemo(
    () =>
      activities
        .filter((a) => a.status === 'pending')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [activities],
  )
  const inProgressActivities = useMemo(
    () =>
      activities
        .filter((a) => a.status === 'in_progress')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [activities],
  )
  const dailyHours = useMemo(() => dailyTeamHours(timeEntries, days14), [timeEntries, days14])

  const statusDistribution = useMemo(() => {
    const counts = { Pendente: 0, 'Em andamento': 0, Concluída: 0 }
    for (const a of activities) {
      if (a.status === 'pending') counts.Pendente++
      else if (a.status === 'in_progress') counts['Em andamento']++
      else counts.Concluída++
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [activities])

  const ranking = useMemo(
    () =>
      [...users]
        .map((u) => ({
          user: u,
          hours: hoursInRange(
            timeEntries.filter((e) => e.userId === u.id),
            '0000-01-01',
            '9999-12-31',
          ),
          completed: activities.filter((a) => a.assigneeIds.includes(u.id) && a.status === 'completed').length,
        }))
        .sort((a, b) => b.hours - a.hours),
    [users, timeEntries, activities],
  )

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral da produtividade da equipe." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Clock}
          label="Horas (7 dias)"
          value={formatHours(weekHours)}
          sub={`${formatHours(allTimeHours)} no total`}
          tone="indigo"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Concluídas (7 dias)"
          value={String(completedThisWeek)}
          sub={`${totalCompleted} no total`}
          tone="emerald"
        />
        <KpiCard
          icon={Users}
          label="Membros da equipe"
          value={String(users.length)}
          sub={`${activeNow} trabalhando agora`}
          tone="amber"
        />
        <KpiCard
          icon={ListTodo}
          label="Atividades em aberto"
          value={String(activities.filter((a) => a.status !== 'completed').length)}
          sub={`${activities.length} criadas`}
          tone="rose"
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Calendário da equipe</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <TeamCalendar entries={timeEntries} users={users} />
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Ranking de produtividade</CardTitle>
              <CardDescription>Horas registradas e atividades concluídas</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-4">
            {ranking.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Sem dados ainda.</p>}
            {ranking.map((r, i) => (
              <div key={r.user.id} className="flex items-center gap-3">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums ${i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{i + 1}</span>
                <Avatar user={r.user} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{r.user.name}</p>
                  <p className="text-[11px] text-slate-400">{formatHours(r.hours)} · {r.completed} concluídas</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horas trabalhadas por pessoa</CardTitle>
          </CardHeader>
          <CardContent className="h-72 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursByUser} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: AXIS_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: AXIS_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: chart.cursorFill }}
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value) => [formatHours(Number(value)), 'Horas']}
                />
                <Bar dataKey="hours" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                  {hoursByUser.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivityListCard
          title="Atividades pendentes"
          activities={pendingActivities}
          userMap={userMap}
          emptyMessage="Nenhuma atividade pendente. 🎉"
          accent="bg-slate-400"
        />
        <ActivityListCard
          title="Atividades em andamento"
          activities={inProgressActivities}
          userMap={userMap}
          emptyMessage="Nenhuma atividade em andamento."
          accent="bg-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Horas da equipe (últimos 14 dias)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyHours} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(d) => String(d).slice(8, 10) + '/' + String(d).slice(5, 7)}
                />
                <YAxis tick={{ fill: AXIS_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value) => [formatHours(Number(value)), 'Horas']}
                  labelFormatter={(d) => `Dia ${String(d).slice(8, 10)}/${String(d).slice(5, 7)}`}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status das atividades</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  isAnimationActive={false}
                >
                  {statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }} />
                <Tooltip contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
