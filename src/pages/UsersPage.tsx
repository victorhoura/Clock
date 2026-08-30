import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input } from '../components/ui/Field'
import { Avatar } from '../components/ui/Avatar'
import { uploadAvatar } from '../lib/supabase'
import { generateId } from '../utils/id'
import type { TeamMember } from '../types'
import { entryDurationHours } from '../utils/time'

const MAX_AVATAR_SIZE = 5 * 1024 * 1024

export function UsersPage() {
  const { users, addUser, updateUser, removeUser, timeEntries, activities } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null)

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Revoke the object URL created for a locally picked file once it's no
  // longer the active preview, so we don't leak blob URLs.
  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const stats = useMemo(() => {
    const map = new Map<string, { hours: number; completed: number }>()
    for (const u of users) map.set(u.id, { hours: 0, completed: 0 })
    for (const e of timeEntries) {
      const s = map.get(e.userId)
      if (s) s.hours += entryDurationHours(e)
    }
    for (const a of activities) {
      if (a.status !== 'completed') continue
      for (const userId of a.assigneeIds) {
        const s = map.get(userId)
        if (s) s.completed += 1
      }
    }
    return map
  }, [users, timeEntries, activities])

  function resetAvatarPicker() {
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(false)
    setAvatarError('')
  }

  function openNew() {
    setEditing(null)
    setName('')
    setRole('')
    resetAvatarPicker()
    setModalOpen(true)
  }

  function openEdit(user: TeamMember) {
    setEditing(user)
    setName(user.name)
    setRole(user.role)
    setAvatarFile(null)
    setAvatarPreview(user.avatarUrl)
    setRemoveAvatar(false)
    setAvatarError('')
    setModalOpen(true)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError('A imagem deve ter no máximo 5MB.')
      return
    }
    setAvatarError('')
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setRemoveAvatar(false)
  }

  function handleRemoveAvatarClick() {
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(true)
    setAvatarError('')
  }

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        const updates: Parameters<typeof updateUser>[1] = { name: name.trim(), role: role.trim() }
        if (avatarFile) {
          updates.avatarUrl = await uploadAvatar(editing.id, avatarFile)
        } else if (removeAvatar) {
          updates.avatarUrl = null
        }
        await updateUser(editing.id, updates)
      } else {
        const id = generateId()
        const avatarUrl = avatarFile ? await uploadAvatar(id, avatarFile) : null
        await addUser(id, name, role, avatarUrl)
      }
      setModalOpen(false)
    } catch {
      setAvatarError('Não foi possível salvar a foto. Tente novamente.')
    } finally {
      setSaving(false)
    }
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
        <Field label="Foto de perfil (opcional)">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative shrink-0"
              aria-label="Escolher foto"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Pré-visualização" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <UserRound size={26} />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white ring-2 ring-white dark:ring-slate-900">
                <Camera size={12} />
              </span>
            </button>
            <div className="flex flex-col items-start gap-1.5">
              <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                {avatarPreview ? 'Trocar foto' : 'Adicionar foto'}
              </Button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemoveAvatarClick}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Remover foto
                </button>
              )}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          {avatarError && <p className="mt-2 text-xs text-rose-500">{avatarError}</p>}
        </Field>
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
          <Button onClick={handleSubmit} disabled={!name.trim() || saving}>
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Adicionar membro'}
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
