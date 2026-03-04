import { cn } from './cn'

interface AvatarProps {
  src?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' }

function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center overflow-hidden',
        'bg-primary/20 text-primary font-semibold',
        sizeClasses[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}
