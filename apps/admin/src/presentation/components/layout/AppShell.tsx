import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'Passageiros',
  '/drivers': 'Motoristas',
  '/rides': 'Corridas',
}

export function AppShell() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'Admin'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
