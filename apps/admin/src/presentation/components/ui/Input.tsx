import type { InputHTMLAttributes } from 'react'
import { cn } from './cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full rounded-btn px-3 py-2.5 text-sm text-foreground',
          'bg-navy-input border border-border',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60',
          'transition-colors',
          error && 'border-danger/60 focus:ring-danger/30',
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
