import { useMemo, useState } from 'react'
import { CircleCheck, LogIn, LogOut, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Field'
import { Avatar } from '../components/ui/Avatar'
import { entryDurationHours, formatDate, formatHours, formatTime } from '../utils/time'

export function TimeClockPage() {
  const { users, timeEntries, activeEntryForUser, clockIn, clockOut, deleteTimeEntry } = useApp()
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? '')

  const selectedUser = users.find((u) => u.id === selectedUserId)
  const activeEntry = selectedUser ? activeEntryForUser(selectedUser.id) : undefined

  const history = useMemo(
    () =>
      [...timeEntries].sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()).slice(0, 40),
    [timeEntries],
  )

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
          Cadastre membros da equipe na aba <strong>Usuários</strong> antes de registrar o ponto.
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Bater Ponto</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Selecione seu nome e registre a entrada ou saída do expediente.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-5 py-8 text-center">
            <Select
              value={selectedUserId}
              onChange={setSelectedUserId}
              options={users.map((u) => ({ value: u.id, label: u.name }))}
              className="max-w-xs"
            />

            {selectedUser && (
              <>
                <Avatar user={selectedUser} size={72} />
                <div className="w-full max-w-full break-words">
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{selectedUser.name}</p>
                  <p className="text-xs text-slate-400">{selectedUser.role || 'Sem cargo definido'}</p>
                </div>

                {activeEntry ? (
                  <div className="w-full rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    Expediente iniciado às <strong>{formatTime(activeEntry.clockIn)}</strong>
                  </div>
                ) : (
                  <div className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Nenhum expediente em andamento
                  </div>
                )}

                {activeEntry ? (
                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={() => clockOut(selectedUser.id)}
                  >
                    <LogOut size={16} />
                    Registrar saída
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => clockIn(selectedUser.id)}>
                    <LogIn size={16} />
                    Registrar entrada
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Status da equipe hoje</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {users.map((user) => {
              const entry = activeEntryForUser(user.id)
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 dark:border-slate-800"
                >
                  <Avatar user={user} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{user.name}</p>
                    {entry ? (
                      <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <CircleCheck size={12} /> Trabalhando desde {formatTime(entry.clockIn)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">Sem expediente ativo</p>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Histórico de registros</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {history.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Nenhum registro de ponto ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                    <th className="py-2 pr-4 font-medium">Membro</th>
                    <th className="py-2 pr-4 font-medium">Data</th>
                    <th className="py-2 pr-4 font-medium">Entrada</th>
                    <th className="py-2 pr-4 font-medium">Saída</th>
                    <th className="py-2 pr-4 font-medium">Horas</th>
                    <th className="py-2 pr-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => {
                    const user = userMap.get(entry.userId)
                    if (!user) return null
                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-slate-50 last:border-0 dark:border-slate-800/60"
                      >
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <Avatar user={user} size={26} />
                            <span className="text-slate-700 dark:text-slate-200">{user.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{formatDate(entry.date)}</td>
                        <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{formatTime(entry.clockIn)}</td>
                        <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                          {entry.clockOut ? (
                            formatTime(entry.clockOut)
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">Em andamento</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 font-medium text-slate-700 dark:text-slate-200">
                          {entry.clockOut ? formatHours(entryDurationHours(entry)) : '—'}
                        </td>
                        <td className="py-2.5 pr-2 text-right">
                          <button
                            onClick={() => deleteTimeEntry(entry.id)}
                            className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                            aria-label="Excluir registro"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
