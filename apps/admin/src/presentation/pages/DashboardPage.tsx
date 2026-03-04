import { Users, Car, MapPin, DollarSign, Clock, XCircle } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { StatCard } from '../components/features/dashboard/StatCard'
import { RevenueChart } from '../components/features/dashboard/RevenueChart'
import { Spinner } from '../components/ui/Spinner'
import { Money } from '../../domain/value-objects/Money'

export function DashboardPage() {
  const { data: stats, isLoading } = useDashboard()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!stats) return null

  const chartData = [
    { label: 'Corridas', value: stats.completedRides },
    { label: 'Activas', value: stats.activeRides },
    { label: 'Canceladas', value: stats.cancelledRides },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Receita Total"
          value={Money.fromNumber(stats.totalRevenue).format()}
          icon={DollarSign}
          gradient
        />
        <StatCard label="Corridas Totais" value={stats.totalRides} icon={MapPin} />
        <StatCard label="Corridas Ativas" value={stats.activeRides} icon={Clock} />
        <StatCard label="Aprovações Pendentes" value={stats.pendingApprovals} icon={Car} />
      </div>

      {/* Segunda linha */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Usuários" value={stats.totalUsers} icon={Users} />
        <StatCard label="Motoristas" value={stats.totalDrivers} icon={Car} />
        <StatCard label="Passageiros" value={stats.totalRiders} icon={Users} />
      </div>

      {/* Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueChart data={chartData} />
        <div className="bg-card border border-border rounded-card p-4 flex flex-col gap-3">
          <p className="text-xs font-bold text-foreground">Resumo de Corridas</p>
          {[
            { label: 'Concluídas', value: stats.completedRides, color: 'text-success' },
            { label: 'Canceladas', value: stats.cancelledRides, color: 'text-danger' },
            { label: 'Ativas agora', value: stats.activeRides, color: 'text-primary' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={`text-xs font-bold ${color}`}>{value}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <XCircle size={13} className="text-warning" />
            <span className="text-xs text-muted-foreground">
              {stats.pendingApprovals} motorista{stats.pendingApprovals !== 1 ? 's' : ''} aguardando aprovação
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
