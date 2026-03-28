import type { InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-muted-2 font-body">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">{icon}</span>
          )}
          <input
            ref={ref}
            className={`
              w-full bg-bg-subtle border rounded-md px-3 py-2.5 text-sm text-text
              placeholder:text-muted font-body outline-none transition-colors
              focus:border-accent/50 focus:ring-1 focus:ring-accent/20
              ${error ? 'border-red/50' : 'border-[rgba(255,255,255,0.07)]'}
              ${icon ? 'pl-10' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red font-body">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
