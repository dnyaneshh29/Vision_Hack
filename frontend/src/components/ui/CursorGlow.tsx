import { useEffect, useState } from 'react'
import { motion, useSpring } from 'framer-motion'

export function CursorGlow() {
  const [isVisible, setIsVisible] = useState(false)

  const springConfig = { damping: 25, stiffness: 200, mass: 0.5 }
  const mouseX = useSpring(0, springConfig)
  const mouseY = useSpring(0, springConfig)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 150)
      mouseY.set(e.clientY - 150)
      if (!isVisible) setIsVisible(true)
    }
    
    const handleMouseLeave = () => setIsVisible(false)
    const handleMouseEnter = () => setIsVisible(true)

    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
    }
  }, [mouseX, mouseY, isVisible])

  return (
    <motion.div
      className="pointer-events-none fixed z-[9999] top-0 left-0 w-[300px] h-[300px] rounded-full mix-blend-screen opacity-50"
      style={{
        x: mouseX,
        y: mouseY,
        opacity: isVisible ? 0.4 : 0,
        background: 'radial-gradient(circle, rgba(124,92,252,0.15) 0%, rgba(6,182,212,0.05) 50%, transparent 70%)',
        filter: 'blur(20px)',
      }}
    />
  )
}
