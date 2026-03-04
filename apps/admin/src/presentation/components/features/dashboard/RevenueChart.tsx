import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card } from '../../ui/Card'

interface RevenueChartProps {
  data: Array<{ label: string; value: number }>
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card>
      <p className="text-xs font-bold text-foreground mb-4">Receita por status</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(226 35% 20%)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'hsl(210 20% 55%)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'hsl(210 20% 55%)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `R$${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(226 40% 13%)',
              border: '1px solid hsl(226 35% 20%)',
              borderRadius: '0.5rem',
              color: 'hsl(210 40% 96%)',
              fontSize: 12,
            }}
            formatter={(value: number) =>
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
            }
          />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            fill="hsl(180 75% 52%)"
            opacity={0.9}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
