import { cn } from './cn'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = { sm: 'size-4', md: 'size-8', lg: 'size-12' }

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'border-2 border-primary/30 border-t-primary rounded-full animate-spin',
        sizeClasses[size],
        className,
      )}
    />
  )
}
