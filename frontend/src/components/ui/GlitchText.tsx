/**
 * GlitchText — text with a cyberpunk RGB glitch effect on hover.
 * Pure CSS animation, no JS overhead.
 */
import { useState, type ReactNode } from 'react'

interface GlitchTextProps {
  children: ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
}

export function GlitchText({ children, className = '', as: Tag = 'span' }: GlitchTextProps) {
  const [glitching, setGlitching] = useState(false)

  return (
    <Tag
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setGlitching(true)}
      onMouseLeave={() => setGlitching(false)}
      style={{ isolation: 'isolate' }}
    >
      {children}
      {glitching && (
        <>
          {/* Red channel offset */}
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              color: '#f87171',
              clipPath: 'polygon(0 20%, 100% 20%, 100% 40%, 0 40%)',
              transform: 'translateX(-3px)',
              opacity: 0.7,
              animation: 'glitch-r 0.15s steps(2) infinite',
            }}
          >
            {children}
          </span>
          {/* Cyan channel offset */}
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              color: '#06b6d4',
              clipPath: 'polygon(0 60%, 100% 60%, 100% 80%, 0 80%)',
              transform: 'translateX(3px)',
              opacity: 0.7,
              animation: 'glitch-c 0.15s steps(2) infinite reverse',
            }}
          >
            {children}
          </span>
        </>
      )}

      <style>{`
        @keyframes glitch-r {
          0%   { transform: translateX(-3px) skewX(-1deg); }
          50%  { transform: translateX(2px) skewX(1deg); }
          100% { transform: translateX(-3px) skewX(-1deg); }
        }
        @keyframes glitch-c {
          0%   { transform: translateX(3px) skewX(1deg); }
          50%  { transform: translateX(-2px) skewX(-1deg); }
          100% { transform: translateX(3px) skewX(1deg); }
        }
      `}</style>
    </Tag>
  )
}
