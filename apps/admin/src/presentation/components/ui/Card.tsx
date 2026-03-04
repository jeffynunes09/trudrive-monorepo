import type { HTMLAttributes } from 'react'
import { cn } from './cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  gradient?: boolean
}

export function Card({ gradient, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card p-4',
        gradient ? 'gradient-teal' : 'bg-card border border-border',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
