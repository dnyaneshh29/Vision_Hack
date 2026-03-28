/**
 * Aurora Background — animated gradient mesh that shifts like northern lights.
 * Pure CSS + Framer Motion, zero dependencies.
 */
import { motion } from 'framer-motion'

export function Aurora() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Primary aurora blob */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '80vw',
          height: '60vh',
          top: '-20vh',
          left: '-10vw',
          background: 'radial-gradient(ellipse, rgba(124,92,252,0.18) 0%, rgba(124,92,252,0.06) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 60, -40, 0],
          y: [0, 40, -20, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Secondary aurora blob */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '60vw',
          height: '50vh',
          top: '20vh',
          right: '-15vw',
          background: 'radial-gradient(ellipse, rgba(192,132,252,0.12) 0%, rgba(6,182,212,0.06) 50%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, -50, 30, 0],
          y: [0, -30, 50, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      {/* Tertiary accent */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '40vw',
          height: '40vh',
          bottom: '-10vh',
          left: '30vw',
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.10) 0%, rgba(34,211,160,0.05) 50%, transparent 70%)',
          filter: 'blur(70px)',
        }}
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.2, 0.85, 1],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
      />
    </div>
  )
}
