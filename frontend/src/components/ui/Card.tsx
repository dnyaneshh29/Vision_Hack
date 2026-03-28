import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? {
        y: -4,
        scale: 1.008,
        boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,92,252,0.2)',
        borderColor: 'rgba(124,92,252,0.25)',
      } : undefined}
      whileTap={hover ? { scale: 0.99, y: 0 } : undefined}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`
        glass-panel rounded-xl p-5
        ${hover ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}
