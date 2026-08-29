import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Layout, type Tab } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { TimeClockPage } from './pages/TimeClockPage'
import { ActivitiesPage } from './pages/ActivitiesPage'
import { UsersPage } from './pages/UsersPage'
import { useApp } from './context/AppContext'

function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const { loading } = useApp()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-indigo-500" size={28} />
      </div>
    )
  }

  return (
    <Layout active={tab} onChange={setTab}>
      {tab === 'dashboard' && <DashboardPage />}
      {tab === 'ponto' && <TimeClockPage />}
      {tab === 'atividades' && <ActivitiesPage />}
      {tab === 'usuarios' && <UsersPage />}
    </Layout>
  )
}

export default App
