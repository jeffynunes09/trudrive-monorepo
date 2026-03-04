import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Car,
  MapPin,
  LogOut,
} from 'lucide-react'
import { cn } from '../ui/cn'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'Passageiros' },
  { to: '/drivers', icon: Car, label: 'Motoristas' },
  { to: '/rides', icon: MapPin, label: 'Corridas' },
]

export function Sidebar() {
  const { logout } = useAuth()

  return (
    <aside className="w-60 shrink-0 h-screen bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl gradient-teal logo-glow flex items-center justify-center">
            <Car size={18} className="text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">TruDrive</p>
            <p className="text-[10px] text-muted-foreground">Painel Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors w-full"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}
