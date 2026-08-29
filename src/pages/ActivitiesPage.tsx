import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Avatar } from '../components/ui/Avatar'
import type { Activity, ActivityStatus } from '../types'

const COLUMNS: { id: ActivityStatus; label: string; accent: string }[] = [
  { id: 'pending', label: 'Pendente', accent: 'border-t-slate-300 dark:border-t-slate-600' },
  { id: 'in_progress', label: 'Em andamento', accent: 'border-t-amber-400' },
  { id: 'completed', label: 'Concluída', accent: 'border-t-emerald-400' },
]

const STATUS_OPTIONS = COLUMNS.map((c) => ({ value: c.id, label: c.label }))

export function ActivitiesPage() {
  const { users, activities, addActivity, updateActivityStatus, deleteActivity } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [userId, setUserId] = useState(users[0]?.id ?? '')

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])

  const grouped = useMemo(() => {
    const map: Record<ActivityStatus, Activity[]> = { pending: [], in_progress: [], completed: [] }
    for (const a of [...activities].sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime())) {
      map[a.status].push(a)
    }
    return map
  }, [activities])

  function openNew() {
    setTitle('')
    setDescription('')
    setUserId(users[0]?.id ?? '')
    setModalOpen(true)
  }

  function handleSubmit() {
    if (!title.trim() || !userId) return
    addActivity(userId, title, description)
    setModalOpen(false)
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
          Cadastre membros da equipe na aba <strong>Usuários</strong> antes de criar atividades.
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Atividades</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acompanhe tarefas atribuídas e conclusões de cada pessoa da equipe.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} />
          Nova atividade
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <Card key={col.id} className={`border-t-4 ${col.accent}`}>
            <CardHeader>
              <CardTitle>{col.label}</CardTitle>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {grouped[col.id].length}
              </span>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {grouped[col.id].length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">Nenhuma atividade aqui.</p>
              )}
              {grouped[col.id].map((activity) => {
                const user = userMap.get(activity.userId)
                return (
                  <div
                    key={activity.id}
                    className="rounded-xl border border-slate-100 p-3.5 dark:border-slate-800"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{activity.title}</p>
                      <button
                        onClick={() => deleteActivity(activity.id)}
                        className="shrink-0 rounded-lg p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                        aria-label="Excluir atividade"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {activity.description && (
                      <p className="mb-3 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                        {activity.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      {user && (
                        <div className="flex items-center gap-1.5">
                          <Avatar user={user} size={22} />
                          <span className="text-xs text-slate-500 dark:text-slate-400">{user.name}</span>
                        </div>
                      )}
                      <Select
                        value={activity.status}
                        onChange={(v) => updateActivityStatus(activity.id, v as ActivityStatus)}
                        options={STATUS_OPTIONS}
                        className="w-auto px-2.5 py-1 text-xs"
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova atividade">
        <Field label="Título">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Revisar layout do app" autoFocus />
        </Field>
        <Field label="Descrição (opcional)">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes da atividade" />
        </Field>
        <Field label="Responsável">
          <Select value={userId} onChange={setUserId} options={users.map((u) => ({ value: u.id, label: u.name }))} />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            Criar atividade
          </Button>
        </div>
      </Modal>
    </div>
  )
}
