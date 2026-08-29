import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input } from '../components/ui/Field'
import { Avatar } from '../components/ui/Avatar'
import type { TeamMember } from '../types'
import { entryDurationHours } from '../utils/time'

export function UsersPage() {
  const { users, addUser, updateUser, removeUser, timeEntries, activities } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null)

  const stats = useMemo(() => {
    const map = new Map<string, { hours: number; completed: number }>()
    for (const u of users) map.set(u.id, { hours: 0, completed: 0 })
    for (const e of timeEntries) {
      const s = map.get(e.userId)
      if (s) s.hours += entryDurationHours(e)
    }
    for (const a of activities) {
      if (a.status !== 'completed') continue
      const s = map.get(a.userId)
      if (s) s.completed += 1
    }
    return map
  }, [users, timeEntries, activities])

  function openNew() {
    setEditing(null)
    setName('')
    setRole('')
    setModalOpen(true)
  }

  function openEdit(user: TeamMember) {
    setEditing(user)
    setName(user.name)
    setRole(user.role)
    setModalOpen(true)
  }

  function handleSubmit() {
    if (!name.trim()) return
    if (editing) {
      updateUser(editing.id, { name: name.trim(), role: role.trim() })
    } else {
      addUser(name, role)
    }
    setModalOpen(false)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Usuários</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gerencie os membros da equipe. Cadastro manual, sem necessidade de conta Google.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} />
          Novo membro
        </Button>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <UserRound className="text-slate-300 dark:text-slate-600" size={40} />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nenhum membro cadastrado</p>
            <p className="text-xs text-slate-400">Adicione o primeiro membro da equipe para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => {
            const s = stats.get(user.id) ?? { hours: 0, completed: 0 }
            return (
              <Card key={user.id}>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar user={user} size={44} />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.role || 'Sem cargo definido'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        aria-label="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(user)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                        aria-label="Remover"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{s.hours.toFixed(1)}h</p>
                      <p className="text-[11px] text-slate-400">Horas registradas</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{s.completed}</p>
                      <p className="text-[11px] text-slate-400">Atividades concluídas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar membro' : 'Novo membro'}>
        <Field label="Nome completo">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Maria Silva" autoFocus />
        </Field>
        <Field label="Cargo / função">
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex: Desenvolvedora" />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {editing ? 'Salvar alterações' : 'Adicionar membro'}
          </Button>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remover membro">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Tem certeza que deseja remover <strong>{confirmDelete?.name}</strong>? Todos os registros de ponto e
          atividades associados também serão apagados.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirmDelete) removeUser(confirmDelete.id)
              setConfirmDelete(null)
            }}
          >
            Remover
          </Button>
        </div>
      </Modal>
    </div>
  )
}
