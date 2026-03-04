import { Bell } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Avatar } from '../ui/Avatar'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const user = useAuthStore((s) => s.user)

  return (
    <header className="h-14 border-b border-border px-6 flex items-center justify-between shrink-0">
      <h1 className="text-sm font-bold text-foreground">{title}</h1>

      <div className="flex items-center gap-3">
        <button className="size-8 rounded-full bg-navy-input flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
          <Bell size={15} />
        </button>
        <div className="flex items-center gap-2">
          <Avatar name={user?.name} size="sm" />
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-foreground">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground">Administrador</p>
          </div>
        </div>
      </div>
    </header>
  )
}
