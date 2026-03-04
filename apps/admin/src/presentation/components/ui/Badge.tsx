import type { HTMLAttributes } from 'react'
import { cn } from './cn'

type BadgeColor = 'primary' | 'success' | 'warning' | 'danger' | 'muted'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor
}

const colorClasses: Record<BadgeColor, string> = {
  primary: 'bg-primary/10 text-primary border border-primary/20',
  success: 'bg-success/10 text-success border border-success/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  danger: 'bg-danger/10 text-danger border border-danger/20',
  muted: 'bg-muted text-muted-foreground border border-border',
}

export function Badge({ color = 'muted', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
        colorClasses[color],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
