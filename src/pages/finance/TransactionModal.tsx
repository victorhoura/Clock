import { useState } from 'react'
import { Modal, ModalActions } from '../../components/ui/Modal'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { useFinance } from '../../context/FinanceContext'
import type { CostType, FinanceTransaction, TransactionKind, TransactionStatus } from '../../types'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, moneyToInput, parseMoney } from '../../utils/finance'
import { todayISODate } from '../../utils/time'
import { ChoiceGroup } from './shared'

export interface TransactionModalState {
  open: boolean
  kind: TransactionKind
  editing: FinanceTransaction | null
}

interface ModalProps {
  state: TransactionModalState
  onClose: () => void
}

// The form only exists while the modal is open, so each opening starts from
// fresh state seeded by the entry being edited (or blank for a new one).
export function TransactionModal({ state, onClose }: ModalProps) {
  return state.open ? <TransactionForm state={state} onClose={onClose} /> : null
}

function TransactionForm({ state, onClose }: ModalProps) {
  const { addTransaction, updateTransaction } = useFinance()
  const t = state.editing
  const [kind, setKind] = useState<TransactionKind>(t?.kind ?? state.kind)
  const [description, setDescription] = useState(t?.description ?? '')
  const [amount, setAmount] = useState(t ? moneyToInput(t.amount) : '')
  const [category, setCategory] = useState(
    t?.category ?? (state.kind === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]),
  )
  const [date, setDate] = useState(t?.date ?? todayISODate())
  const [dueDate, setDueDate] = useState(t?.dueDate ?? '')
  const [status, setStatus] = useState<TransactionStatus>(t?.status ?? 'paid')
  const [costType, setCostType] = useState<CostType>(t?.costType ?? 'variable')
  const [notes, setNotes] = useState(t?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const categories = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  // Keep a custom/legacy category selectable when editing an entry that uses one.
  const categoryOptions = (categories.includes(category) || !category ? categories : [category, ...categories]).map((c) => ({
    value: c,
    label: c,
  }))

  function changeKind(next: TransactionKind) {
    setKind(next)
    setCategory(next === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
  }

  const parsedAmount = parseMoney(amount)
  const valid = description.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0 && !!date

  async function handleSubmit() {
    if (!valid) {
      setError('Preencha descrição, valor maior que zero e data.')
      return
    }
    setSaving(true)
    const input = {
      kind,
      description,
      category,
      amount: parsedAmount,
      date,
      dueDate: dueDate || null,
      status,
      costType: kind === 'expense' ? costType : null,
      notes,
    }
    try {
      if (state.editing) await updateTransaction(state.editing.id, input)
      else await addTransaction(input)
      onClose()
    } catch {
      setError('Não foi possível salvar. Tente novamente.')
      setSaving(false)
    }
  }

  const isIncome = kind === 'income'
  const title = state.editing
    ? isIncome
      ? 'Editar receita'
      : 'Editar despesa'
    : isIncome
      ? 'Nova receita'
      : 'Nova despesa'

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={isIncome ? 'Faturamento, vendas e outras entradas.' : 'Custos operacionais, contas e outras saídas.'}
      size="lg"
    >
      {!state.editing && (
        <div className="mb-4">
          <ChoiceGroup
            value={kind}
            onChange={changeKind}
            options={[
              { value: 'income', label: 'Receita', activeClass: 'bg-emerald-600 text-white shadow-sm' },
              { value: 'expense', label: 'Despesa', activeClass: 'bg-rose-600 text-white shadow-sm' },
            ]}
          />
        </div>
      )}

      <Field label="Descrição">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isIncome ? 'Ex: Contrato mensal — Cliente X' : 'Ex: Conta de energia'}
          autoFocus
          maxLength={140}
        />
      </Field>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label="Valor (R$)">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="tabular-nums"
          />
        </Field>
        <Field label="Categoria">
          <Select value={category} onChange={setCategory} options={categoryOptions} />
        </Field>
        <Field label="Data de competência" hint="Mês em que entra no faturamento/custo.">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Vencimento (opcional)">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>

      {!isIncome && (
        <Field label="Tipo de custo">
          <ChoiceGroup
            value={costType}
            onChange={setCostType}
            options={[
              { value: 'variable', label: 'Variável' },
              { value: 'fixed', label: 'Fixo' },
            ]}
          />
        </Field>
      )}

      <Field label="Situação">
        <ChoiceGroup
          value={status}
          onChange={setStatus}
          options={[
            { value: 'paid', label: isIncome ? 'Recebido' : 'Pago' },
            { value: 'pending', label: isIncome ? 'A receber' : 'A pagar' },
          ]}
        />
      </Field>

      <Field label="Observações (opcional)">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nota fiscal, forma de pagamento…" rows={2} />
      </Field>

      {error && <p className="text-xs text-rose-500">{error}</p>}

      <ModalActions>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant={isIncome ? 'success' : 'primary'} onClick={handleSubmit} disabled={saving || !valid}>
          {saving ? 'Salvando…' : state.editing ? 'Salvar alterações' : isIncome ? 'Lançar receita' : 'Lançar despesa'}
        </Button>
      </ModalActions>
    </Modal>
  )
}
