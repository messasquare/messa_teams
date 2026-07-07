// frontend/src/components/Avatar.jsx
import { memo } from 'react'
import { getInitials, getAvatarGradient, cn } from '../lib/utils'

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-2xl',
}

const DOT_SIZES = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
  '2xl': 'w-4 h-4',
}

function Avatar({
  name = '',
  src,
  size = 'md',
  online,
  className,
  ring = false,
  onClick,
}) {
  const initials = getInitials(name)
  const gradient = getAvatarGradient(name)
  const sizeClass = SIZES[size] || SIZES.md
  const dotSize = DOT_SIZES[size] || DOT_SIZES.md

  return (
    <div
      className={cn('relative flex-shrink-0', onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn(
            'rounded-full object-cover',
            sizeClass,
            ring && 'ring-2 ring-messa-red ring-offset-2 ring-offset-dark'
          )}
          loading="lazy"
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold text-white select-none',
            'bg-gradient-to-br',
            gradient,
            sizeClass,
            ring && 'ring-2 ring-messa-red ring-offset-2 ring-offset-dark'
          )}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-dark',
            online ? 'bg-online' : 'bg-offline',
            dotSize
          )}
        />
      )}
    </div>
  )
}

export default memo(Avatar)