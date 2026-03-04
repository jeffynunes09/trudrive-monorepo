import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from './AuthGuard'
import { LoginPage } from '../pages/LoginPage'
import { UnauthorizedPage } from '../pages/UnauthorizedPage'
import { DashboardPage } from '../pages/DashboardPage'
import { UsersPage } from '../pages/UsersPage'
import { DriversPage } from '../pages/DriversPage'
import { RidesPage } from '../pages/RidesPage'
import { AppShell } from '../components/layout/AppShell'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/users', element: <UsersPage /> },
          { path: '/drivers', element: <DriversPage /> },
          { path: '/rides', element: <RidesPage /> },
        ],
      },
    ],
  },
])
