import { useCallback, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../context/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button, IconButton } from '../components/ui/Button'
import { Modal, ModalActions } from '../components/ui/Modal'
import { Field, Input, MultiSelect, Textarea } from '../components/ui/Field'
import { Avatar } from '../components/ui/Avatar'
import { PageHeader } from '../components/ui/PageHeader'
import { useDragToColumn } from '../hooks/useDragToColumn'
import type { Activity, ActivityStatus } from '../types'

const COLUMNS: { id: ActivityStatus; label: string; accent: string }[] = [
  { id: 'pending', label: 'Pendente', accent: 'bg-slate-400' },
  { id: 'in_progress', label: 'Em andamento', accent: 'bg-amber-400' },
  { id: 'completed', label: 'Concluída', accent: 'bg-emerald-500' },
]

export function ActivitiesPage() {
  const { users, activities, addActivity, updateActivity, updateActivityStatus, deleteActivity } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])

  const handleDrop = useCallback(
    (id: string, column: string) => {
      const activity = activities.find((a) => a.id === id)
      if (activity && activity.status !== column) updateActivityStatus(id, column as ActivityStatus)
    },
    [activities, updateActivityStatus],
  )

  const { draggingId, overColumn, dragPosition, cardProps } = useDragToColumn(handleDrop)
  const draggingActivity = activities.find((a) => a.id === draggingId)

  const grouped = useMemo(() => {
    const map: Record<ActivityStatus, Activity[]> = { pending: [], in_progress: [], completed: [] }
    for (const a of [...activities].sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime())) {
      map[a.status].push(a)
    }
    return map
  }, [activities])

  function openNew() {
    setEditingId(null)
    setTitle('')
    setDescription('')
    setAssigneeIds(users[0] ? [users[0].id] : [])
    setModalOpen(true)
  }

  function openEdit(activity: Activity) {
    setEditingId(activity.id)
    setTitle(activity.title)
    setDescription(activity.description)
    setAssigneeIds(activity.assigneeIds)
    setModalOpen(true)
  }

  function handleSubmit() {
    if (!title.trim() || assigneeIds.length === 0) return
    if (editingId) {
      updateActivity(editingId, assigneeIds, title, description)
    } else {
      addActivity(assigneeIds, title, description)
    }
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
      <PageHeader
        title="Atividades"
        description="Arraste os cartões entre as colunas para atualizar o status de cada atividade."
        actions={
          <Button onClick={openNew}>
            <Plus size={16} />
            Nova atividade
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <Card
            key={col.id}
            data-column={col.id}
            className={clsx(
              'bg-slate-50/50 transition-colors dark:bg-surface-dark',
              overColumn === col.id &&
                draggingActivity?.status !== col.id &&
                'ring-2 ring-indigo-500 ring-offset-2 ring-offset-canvas dark:ring-offset-canvas-dark',
            )}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className={clsx('h-2 w-2 rounded-full', col.accent)} />
                {col.label}
              </CardTitle>
              <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-500 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                {grouped[col.id].length}
              </span>
            </CardHeader>
            <CardContent className="flex min-h-24 flex-col gap-3">
              {grouped[col.id].length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">Arraste uma atividade para cá.</p>
              )}
              {grouped[col.id].map((activity) => {
                const assignees = activity.assigneeIds.map((id) => userMap.get(id)).filter((u) => !!u)
                return (
                  <div
                    key={activity.id}
                    {...cardProps(activity.id)}
                    className={clsx(
                      'cursor-grab select-none rounded-lg border border-slate-200/80 bg-white p-3.5 shadow-card transition-shadow hover:shadow-md active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900/60',
                      draggingId === activity.id && 'opacity-40',
                    )}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{activity.title}</p>
                      <div className="flex shrink-0 gap-1">
                        <IconButton className="h-7 w-7" onClick={() => openEdit(activity)} aria-label="Editar atividade">
                          <Pencil size={13} />
                        </IconButton>
                        <IconButton
                          className="h-7 w-7"
                          tone="danger"
                          onClick={() => deleteActivity(activity.id)}
                          aria-label="Excluir atividade"
                        >
                          <Trash2 size={13} />
                        </IconButton>
                      </div>
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

      {draggingActivity && dragPosition && (
        <div
          className="pointer-events-none fixed z-50 w-56 max-w-[70vw] -translate-x-1/2 -translate-y-1/2 rotate-3 rounded-lg border border-indigo-300 bg-white p-3.5 shadow-pop dark:border-indigo-500/60 dark:bg-slate-800"
          style={{ left: dragPosition.x, top: dragPosition.y }}
        >
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{draggingActivity.title}</p>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar atividade' : 'Nova atividade'}>
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
        <ModalActions>
          <Button variant="outline" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || assigneeIds.length === 0}>
            {editingId ? 'Salvar alterações' : 'Criar atividade'}
          </Button>
        </ModalActions>
      </Modal>
    </div>
  )
}
