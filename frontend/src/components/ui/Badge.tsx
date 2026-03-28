import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  color?: string
  variant?: 'default' | 'outline'
  className?: string
}

export function Badge({ children, color, variant = 'default', className = '' }: BadgeProps) {
  const style = color
    ? variant === 'outline'
      ? { borderColor: color, color }
      : { backgroundColor: `${color}20`, color }
    : {}

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium
        ${!color && variant === 'default' ? 'bg-bg-subtle text-muted-2' : ''}
        ${!color && variant === 'outline' ? 'border border-[rgba(255,255,255,0.07)] text-muted-2' : ''}
        ${className}
      `}
      style={style}
    >
      {children}
    </span>
  )
}
