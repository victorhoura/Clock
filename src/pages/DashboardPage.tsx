import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, Clock, ListTodo, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { TeamCalendar } from '../components/TeamCalendar'
import { Avatar } from '../components/ui/Avatar'
import { completedPerUser, dailyTeamHours, hoursInRange, hoursPerUser, lastNDays } from '../utils/stats'
import { formatHours } from '../utils/time'

const AXIS_COLOR = '#94a3b8'
const STATUS_COLORS: Record<string, string> = {
  Pendente: '#cbd5e1',
  'Em andamento': '#f59e0b',
  Concluída: '#10b981',
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: typeof Clock
  label: string
  value: string
  sub: string
  tint: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3.5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold leading-tight text-slate-900 dark:text-white">{value}</p>
          <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { users, timeEntries, activities, theme } = useApp()
  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0'
  const tooltipStyle = {
    borderRadius: 12,
    border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
    background: theme === 'dark' ? '#1e293b' : '#ffffff',
    color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
    fontSize: 12,
  }

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

  const hoursByUser = useMemo(() => hoursPerUser(timeEntries, users), [timeEntries, users])
  const completedByUser = useMemo(() => completedPerUser(activities, users), [activities, users])
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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Visão geral da produtividade da equipe.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Clock}
          label="Horas nos últimos 7 dias"
          value={formatHours(weekHours)}
          sub={`${formatHours(allTimeHours)} total`}
          tint="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
        />
        <StatCard
          icon={CheckCircle2}
          label="Atividades concluídas (7 dias)"
          value={String(completedThisWeek)}
          sub={`${totalCompleted} no total`}
          tint="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        />
        <StatCard
          icon={Users}
          label="Membros da equipe"
          value={String(users.length)}
          sub={`${activeNow} trabalhando agora`}
          tint="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        />
        <StatCard
          icon={ListTodo}
          label="Atividades em aberto"
          value={String(activities.filter((a) => a.status !== 'completed').length)}
          sub={`${activities.length} criadas`}
          tint="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Calendário da equipe</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TeamCalendar entries={timeEntries} users={users} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking de produtividade</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            {ranking.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Sem dados ainda.</p>}
            {ranking.map((r, i) => (
              <div key={r.user.id} className="flex items-center gap-3">
                <span className="w-4 text-xs font-semibold text-slate-400">{i + 1}</span>
                <Avatar user={r.user} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{r.user.name}</p>
                  <p className="text-[11px] text-slate-400">{formatHours(r.hours)} · {r.completed} concluídas</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Horas trabalhadas por pessoa</CardTitle>
          </CardHeader>
          <CardContent className="h-72 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursByUser} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: AXIS_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: AXIS_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${value}h`, 'Horas']}
                />
                <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                  {hoursByUser.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades concluídas por pessoa</CardTitle>
          </CardHeader>
          <CardContent className="h-72 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completedByUser} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: AXIS_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: AXIS_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(16,185,129,0.08)' }}
                  contentStyle={tooltipStyle}
                  formatter={(value) => [value, 'Concluídas']}
                />
                <Bar dataKey="completed" radius={[8, 8, 0, 0]}>
                  {completedByUser.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Horas da equipe (últimos 14 dias)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyHours} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
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
                  formatter={(value) => [`${value}h`, 'Horas']}
                  labelFormatter={(d) => `Dia ${String(d).slice(8, 10)}/${String(d).slice(5, 7)}`}
                />
                <Line type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2.5} dot={false} />
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
                >
                  {statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }} />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
