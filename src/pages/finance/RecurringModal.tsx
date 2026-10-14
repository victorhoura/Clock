import { useState } from 'react'
import { Modal, ModalActions } from '../../components/ui/Modal'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { useFinance } from '../../context/FinanceContext'
import type { RecurringCost } from '../../types'
import { EXPENSE_CATEGORIES, moneyToInput, parseMoney } from '../../utils/finance'

export interface RecurringModalState {
  open: boolean
  editing: RecurringCost | null
}

interface ModalProps {
  state: RecurringModalState
  onClose: () => void
}

// Mounted only while open, so each opening starts from fresh state.
export function RecurringModal({ state, onClose }: ModalProps) {
  return state.open ? <RecurringForm state={state} onClose={onClose} /> : null
}

function RecurringForm({ state, onClose }: ModalProps) {
  const { addRecurring, updateRecurring } = useFinance()
  const r = state.editing
  const [description, setDescription] = useState(r?.description ?? '')
  const [amount, setAmount] = useState(r ? moneyToInput(r.amount) : '')
  const [category, setCategory] = useState(r?.category ?? EXPENSE_CATEGORIES[0])
  const [dueDay, setDueDay] = useState(String(r?.dueDay ?? 10))
  const [notes, setNotes] = useState(r?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const parsedAmount = parseMoney(amount)
  const day = Number(dueDay)
  const valid =
    description.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0 && Number.isInteger(day) && day >= 1 && day <= 31

  const categoryOptions = (EXPENSE_CATEGORIES.includes(category) ? EXPENSE_CATEGORIES : [category, ...EXPENSE_CATEGORIES]).map((c) => ({
    value: c,
    label: c,
  }))

  async function handleSubmit() {
    if (!valid) {
      setError('Preencha descrição, valor maior que zero e um dia de vencimento entre 1 e 31.')
      return
    }
    setSaving(true)
    const input = { description, category, amount: parsedAmount, dueDay: day, notes }
    try {
      if (state.editing) await updateRecurring(state.editing.id, input)
      else await addRecurring(input)
      onClose()
    } catch {
      setError('Não foi possível salvar. Tente novamente.')
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={state.editing ? 'Editar custo fixo' : 'Novo custo fixo'}
      description="Gera automaticamente uma conta a pagar todo mês, no dia do vencimento."
    >
      <Field label="Descrição">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Aluguel do escritório"
          autoFocus
          maxLength={140}
        />
      </Field>
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="Valor mensal (R$)">
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" className="tabular-nums" />
        </Field>
        <Field label="Dia do vencimento">
          <Input
            type="number"
            min={1}
            max={31}
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            inputMode="numeric"
            className="tabular-nums"
          />
        </Field>
      </div>
      <Field label="Categoria">
        <Select value={category} onChange={setCategory} options={categoryOptions} />
      </Field>
      <Field label="Observações (opcional)">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contrato, forma de pagamento…" rows={2} />
      </Field>
      {state.editing && (
        <p className="text-[11px] text-slate-400">
          As alterações valem para as contas ainda em aberto a partir deste mês. Contas já pagas não mudam.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
      <ModalActions>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={saving || !valid}>
          {saving ? 'Salvando…' : state.editing ? 'Salvar alterações' : 'Adicionar custo fixo'}
        </Button>
      </ModalActions>
    </Modal>
  )
}
