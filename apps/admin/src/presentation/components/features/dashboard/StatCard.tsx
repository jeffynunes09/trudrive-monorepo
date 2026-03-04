import type { LucideIcon } from 'lucide-react'
import { Card } from '../../ui/Card'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  gradient?: boolean
}

export function StatCard({ label, value, icon: Icon, gradient = false }: StatCardProps) {
  return (
    <Card gradient={gradient} className={gradient ? 'text-white' : undefined}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-[10px] font-semibold mb-1 ${gradient ? 'text-white/70' : 'text-muted-foreground'}`}>
            {label}
          </p>
          <p className={`text-xl font-bold ${gradient ? 'text-white' : 'text-primary'}`}>
            {value}
          </p>
        </div>
        <div
          className={`size-9 rounded-xl flex items-center justify-center ${
            gradient ? 'bg-white/20' : 'bg-primary/10'
          }`}
        >
          <Icon size={18} className={gradient ? 'text-white' : 'text-primary'} />
        </div>
      </div>
    </Card>
  )
}
