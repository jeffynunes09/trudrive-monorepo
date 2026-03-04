import { useUsers } from '../hooks/useUsers'
import { Spinner } from '../components/ui/Spinner'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'

export function UsersPage() {
  const { users, isLoading, deactivateUser, deleteUser, isDeactivating, isDeleting } = useUsers({
    role: 'rider',
  })

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Usuário', 'E-mail', 'Telefone', 'Status', 'Criado em', 'Ações'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar src={user.profileImage} name={user.name} size="sm" />
                      <span className="text-xs font-medium text-foreground">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{user.phone ?? '–'}</td>
                  <td className="px-4 py-3">
                    <Badge color={user.isActive ? 'success' : 'danger'}>
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          loading={isDeactivating}
                          onClick={() => deactivateUser(user.id)}
                        >
                          Desativar
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        loading={isDeleting}
                        onClick={() => deleteUser(user.id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center py-16 text-muted-foreground text-sm">
              Nenhum passageiro encontrado.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
