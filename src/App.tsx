import { useState } from 'react'
import { Layout, type Tab } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { TimeClockPage } from './pages/TimeClockPage'
import { ActivitiesPage } from './pages/ActivitiesPage'
import { UsersPage } from './pages/UsersPage'

function App() {
  const [tab, setTab] = useState<Tab>('dashboard')

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
