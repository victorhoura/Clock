import { useMemo, useState } from 'react'
import { BarChart3, CalendarClock, Database, FileSpreadsheet, ListOrdered, Loader2, Minus, Plus, Repeat } from 'lucide-react'
import { FinanceProvider, useFinance } from '../../context/FinanceContext'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Segmented } from '../../components/ui/Segmented'
import type { FinanceTransaction, RecurringCost, TransactionKind } from '../../types'
import { currentPeriod, effectiveDueDate, type Period } from '../../utils/finance'
import { todayISODate } from '../../utils/time'
import { OverviewTab } from './OverviewTab'
import { TransactionsTab } from './TransactionsTab'
import { BillsTab } from './BillsTab'
import { RecurringTab } from './RecurringTab'
import { AnnualTab } from './AnnualTab'
import { TransactionModal, type TransactionModalState } from './TransactionModal'
import { RecurringModal, type RecurringModalState } from './RecurringModal'
import { ChoiceGroup, PeriodNavigator } from './shared'

type FinanceTab = 'overview' | 'transactions' | 'bills' | 'recurring' | 'annual'

export function FinancePage() {
  return (
    <FinanceProvider>
      <FinanceContent />
    </FinanceProvider>
  )
}

function FinanceContent() {
  const { state, transactions } = useFinance()
  const [tab, setTab] = useState<FinanceTab>('overview')
  const [mode, setMode] = useState<'month' | 'year'>('month')
  const [period, setPeriod] = useState<Period>(currentPeriod)
  const [txModal, setTxModal] = useState<TransactionModalState>({ open: false, kind: 'income', editing: null })
  const [recModal, setRecModal] = useState<RecurringModalState>({ open: false, editing: null })

  const todayISO = todayISODate()
  const overdueCount = useMemo(
    () => transactions.filter((t) => t.kind === 'expense' && t.status === 'pending' && effectiveDueDate(t) < todayISO).length,
    [transactions, todayISO],
  )

  const openNew = (kind: TransactionKind) => setTxModal({ open: true, kind, editing: null })
  const openEdit = (t: FinanceTransaction) => setTxModal({ open: true, kind: t.kind, editing: t })
  const closeTx = () => setTxModal((s) => ({ ...s, open: false }))

  const showPeriod = tab === 'overview' || tab === 'transactions' || tab === 'annual'
  const effectiveMode = tab === 'annual' ? 'year' : mode

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Faturamento, custos, lucro e contas da empresa em um só lugar."
        actions={
          state === 'ready' && (
            <>
              <Button variant="outline" onClick={() => openNew('expense')}>
                <Minus size={16} className="text-rose-500" />
                Nova despesa
              </Button>
              <Button variant="success" onClick={() => openNew('income')}>
                <Plus size={16} />
                Nova receita
              </Button>
            </>
          )
        }
      />

      {state === 'loading' && (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-indigo-500" size={26} />
        </div>
      )}

      {state === 'missing-schema' && (
        <Card>
          <EmptyState
            icon={Database}
            title="Configure o banco de dados do Financeiro"
            description="As tabelas do módulo financeiro ainda não existem no Supabase. Rode o arquivo supabase/migrations/20261014_financeiro.sql no SQL Editor do projeto e recarregue a página."
          />
        </Card>
      )}

      {state === 'error' && (
        <Card>
          <EmptyState
            icon={Database}
            title="Não foi possível carregar os dados financeiros"
            description="Verifique a conexão com a internet e recarregue a página."
          />
        </Card>
      )}

      {state === 'ready' && (
        <>
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'overview', label: 'Visão geral', icon: BarChart3 },
                { value: 'transactions', label: 'Lançamentos', icon: ListOrdered },
                { value: 'bills', label: 'Contas', icon: CalendarClock, count: overdueCount },
                { value: 'recurring', label: 'Custos fixos', icon: Repeat },
                { value: 'annual', label: 'Relatório anual', icon: FileSpreadsheet },
              ]}
            />
            {showPeriod && (
              <div className="flex flex-wrap items-center gap-2">
                {tab !== 'annual' && (
                  <div className="w-40">
                    <ChoiceGroup
                      value={mode}
                      onChange={setMode}
                      options={[
                        { value: 'month', label: 'Mensal' },
                        { value: 'year', label: 'Anual' },
                      ]}
                    />
                  </div>
                )}
                <PeriodNavigator period={period} onChange={setPeriod} mode={effectiveMode} />
              </div>
            )}
          </div>

          {tab === 'overview' && (
            <OverviewTab
              mode={mode}
              period={period}
              onOpenBills={() => setTab('bills')}
              onOpenTransactions={() => setTab('transactions')}
            />
          )}
          {tab === 'transactions' && <TransactionsTab mode={mode} period={period} onEdit={openEdit} />}
          {tab === 'bills' && <BillsTab onEdit={openEdit} />}
          {tab === 'recurring' && (
            <RecurringTab
              onNew={() => setRecModal({ open: true, editing: null })}
              onEdit={(r: RecurringCost) => setRecModal({ open: true, editing: r })}
            />
          )}
          {tab === 'annual' && <AnnualTab year={period.year} />}
        </>
      )}

      <TransactionModal state={txModal} onClose={closeTx} />
      <RecurringModal state={recModal} onClose={() => setRecModal((s) => ({ ...s, open: false }))} />
    </div>
  )
}
