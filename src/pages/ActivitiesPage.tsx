import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../context/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, MultiSelect, Textarea } from '../components/ui/Field'
import { Avatar } from '../components/ui/Avatar'
import type { Activity, ActivityStatus } from '../types'

const COLUMNS: { id: ActivityStatus; label: string; accent: string }[] = [
  { id: 'pending', label: 'Pendente', accent: 'border-t-slate-300 dark:border-t-slate-600' },
  { id: 'in_progress', label: 'Em andamento', accent: 'border-t-amber-400' },
  { id: 'completed', label: 'Concluída', accent: 'border-t-emerald-400' },
]

export function ActivitiesPage() {
  const { users, activities, addActivity, updateActivityStatus, deleteActivity } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<ActivityStatus | null>(null)

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
    setAssigneeIds(users[0] ? [users[0].id] : [])
    setModalOpen(true)
  }

  function handleSubmit() {
    if (!title.trim() || assigneeIds.length === 0) return
    addActivity(assigneeIds, title, description)
    setModalOpen(false)
  }

  function handleDrop(status: ActivityStatus) {
    const activity = activities.find((a) => a.id === draggingId)
    if (activity && activity.status !== status) updateActivityStatus(activity.id, status)
    setDraggingId(null)
    setDragOverColumn(null)
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
            Arraste os cartões entre as colunas para atualizar o status de cada atividade.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} />
          Nova atividade
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <Card
            key={col.id}
            className={clsx(
              'border-t-4 transition-colors',
              col.accent,
              dragOverColumn === col.id && 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950',
            )}
          >
            <CardHeader>
              <CardTitle>{col.label}</CardTitle>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {grouped[col.id].length}
              </span>
            </CardHeader>
            <CardContent
              className="flex min-h-24 flex-col gap-3"
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverColumn(col.id)
              }}
              onDragLeave={() => setDragOverColumn((c) => (c === col.id ? null : c))}
              onDrop={(e) => {
                e.preventDefault()
                handleDrop(col.id)
              }}
            >
              {grouped[col.id].length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">Arraste uma atividade para cá.</p>
              )}
              {grouped[col.id].map((activity) => {
                const assignees = activity.assigneeIds.map((id) => userMap.get(id)).filter((u) => !!u)
                return (
                  <div
                    key={activity.id}
                    draggable
                    onDragStart={() => setDraggingId(activity.id)}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setDragOverColumn(null)
                    }}
                    className={clsx(
                      'cursor-grab rounded-xl border border-slate-100 p-3.5 active:cursor-grabbing dark:border-slate-800',
                      draggingId === activity.id && 'opacity-40',
                    )}
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
                    {assignees.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {assignees.map((u) => (
                          <div key={u.id} className="flex items-center gap-1 rounded-full bg-slate-50 py-0.5 pl-0.5 pr-2 dark:bg-slate-800/60">
                            <Avatar user={u} size={20} />
                            <span className="text-xs text-slate-500 dark:text-slate-400">{u.name.split(' ')[0]}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
        <Field label="Responsáveis">
          <MultiSelect
            values={assigneeIds}
            onChange={setAssigneeIds}
            options={users.map((u) => ({ value: u.id, label: u.name }))}
            placeholder="Selecione um ou mais responsáveis"
          />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || assigneeIds.length === 0}>
            Criar atividade
          </Button>
        </div>
      </Modal>
    </div>
  )
}
