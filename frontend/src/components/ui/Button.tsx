import { motion } from 'framer-motion'
import { useRef, type ButtonHTMLAttributes, type ReactNode, type MouseEvent } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

const variants = {
  primary: 'bg-accent hover:bg-accent/90 text-white shadow-[0_0_20px_rgba(124,92,252,0.3)] hover:shadow-[0_0_30px_rgba(124,92,252,0.5)]',
  ghost: 'bg-transparent border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.18)] text-text hover:bg-bg-subtle hover:shadow-[0_0_12px_rgba(255,255,255,0.04)]',
  danger: 'bg-red/10 border border-red/30 text-red hover:bg-red/20 hover:shadow-[0_0_16px_rgba(248,113,113,0.2)]',
  outline: 'bg-transparent border border-accent/50 text-accent hover:bg-accent/10 hover:border-accent hover:shadow-[0_0_16px_rgba(124,92,252,0.2)]',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({ variant = 'primary', size = 'md', loading, children, disabled, className = '', onClick, ...props }: ButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null)

  // Ripple effect on click
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current
    if (btn) {
      const ripple = document.createElement('span')
      const rect = btn.getBoundingClientRect()
      const sz = Math.max(rect.width, rect.height) * 2
      ripple.style.cssText = `
        position:absolute;width:${sz}px;height:${sz}px;
        left:${e.clientX - rect.left - sz / 2}px;
        top:${e.clientY - rect.top - sz / 2}px;
        background:radial-gradient(circle,rgba(255,255,255,0.25) 0%,transparent 60%);
        border-radius:50%;pointer-events:none;
        animation:rippleOut 0.5s ease-out forwards;
      `
      btn.appendChild(ripple)
      setTimeout(() => ripple.remove(), 500)
    }
    onClick?.(e)
  }

  return (
    <motion.button
      ref={btnRef as any}
      whileHover={{ scale: disabled || loading ? 1 : 1.03 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={handleClick}
      className={`
        relative inline-flex items-center justify-center gap-2 rounded-md font-body font-medium
        overflow-hidden transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || loading}
      {...(props as object)}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </motion.button>
  )
}
