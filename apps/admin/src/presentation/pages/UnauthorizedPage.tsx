import { ShieldOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'

export function UnauthorizedPage() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="size-14 rounded-xl bg-danger/10 flex items-center justify-center">
          <ShieldOff size={26} className="text-danger" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Acesso negado</h1>
        <p className="text-xs text-muted-foreground max-w-xs">
          Sua conta não tem permissão de administrador para acessar este painel.
        </p>
        <Button variant="outline" onClick={logout}>
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
