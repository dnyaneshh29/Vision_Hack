/**
 * Card3D — a card that tilts in 3D based on mouse position.
 * Creates a realistic depth illusion with specular highlight.
 */
import { useRef, type ReactNode, type MouseEvent } from 'react'

interface Card3DProps {
  children: ReactNode
  className?: string
  intensity?: number  // tilt intensity, default 8 degrees
  glare?: boolean
}

export function Card3D({ children, className = '', intensity = 8, glare = true }: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2

    const rotateX = ((y - cy) / cy) * -intensity
    const rotateY = ((x - cx) / cx) * intensity

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    card.style.transition = 'transform 0.1s ease'

    if (glare && glareRef.current) {
      const glareX = (x / rect.width) * 100
      const glareY = (y / rect.height) * 100
      glareRef.current.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.08) 0%, transparent 60%)`
      glareRef.current.style.opacity = '1'
    }
  }

  const handleMouseLeave = () => {
    const card = cardRef.current
    if (!card) return
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
    card.style.transition = 'transform 0.5s ease'
    if (glare && glareRef.current) {
      glareRef.current.style.opacity = '0'
    }
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${className}`}
      style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
    >
      {children}
      {glare && (
        <div
          ref={glareRef}
          className="absolute inset-0 pointer-events-none rounded-inherit transition-opacity duration-300"
          style={{ opacity: 0, borderRadius: 'inherit' }}
        />
      )}
    </div>
  )
}
