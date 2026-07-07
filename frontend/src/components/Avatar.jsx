// frontend/src/components/Avatar.jsx
import { getInitials, getAvatarColor } from '../lib/utils'
import { cn } from '../lib/utils'

const sizeMap = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

export default function Avatar({ name = '', src, size = 'md', online, className }) {
  const initials = getInitials(name)
  const colorClass = getAvatarColor(name)
  const sizeClass = sizeMap[size] || sizeMap.md

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn('rounded-full object-cover', sizeClass)}
        />
      ) : (
        <div className={cn(
          'rounded-full flex items-center justify-center font-semibold text-white',
          `bg-gradient-to-br ${colorClass}`,
          sizeClass
        )}>
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span className={cn(
          'absolute bottom-0 right-0 rounded-full border-2 border-dark',
          online ? 'bg-online' : 'bg-text-muted',
          size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
        )} />
      )}
    </div>
  )
}