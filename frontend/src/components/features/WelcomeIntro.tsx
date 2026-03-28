import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'

interface WelcomeIntroProps {
  onComplete: () => void
  isNewUser?: boolean
}

export function WelcomeIntro({ onComplete, isNewUser = false }: WelcomeIntroProps) {
  const { user } = useStore()
  const [phase, setPhase] = useState<'logo' | 'tagline' | 'name' | 'out'>('logo')

  useEffect(() => {
    // Phase timeline:
    // 0ms   → logo appears
    // 600ms → tagline appears
    // 1200ms → name appears
    // 2200ms → everything fades out
    // 2700ms → onComplete fires

    const t1 = setTimeout(() => setPhase('tagline'), 600)
    const t2 = setTimeout(() => setPhase('name'), 1200)
    const t3 = setTimeout(() => setPhase('out'), 2200)
    const t4 = setTimeout(() => onComplete(), 2800)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [onComplete])

  const firstName = user?.username?.split(' ')[0] ?? user?.username ?? 'there'

  return (
    <AnimatePresence>
      {phase !== 'out' ? (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg-base overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(124,92,252,0.12) 0%, rgba(124,92,252,0.04) 50%, transparent 70%)',
              }}
            />
          </div>

          {/* Particle dots */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-accent/30"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 0.6, 0],
                scale: [0, 1, 0],
                x: Math.cos((i / 6) * Math.PI * 2) * 120,
                y: Math.sin((i / 6) * Math.PI * 2) * 120,
              }}
              transition={{ duration: 2, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
              style={{
                left: '50%',
                top: '50%',
              }}
            />
          ))}

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-6"
          >
            {/* Outer ring */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="absolute inset-0 -m-3 rounded-2xl border border-accent/20"
            />
            <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center shadow-2xl"
              style={{ boxShadow: '0 0 60px rgba(124,92,252,0.4)' }}>
              <span className="text-white font-display font-bold text-4xl">N</span>
            </div>
          </motion.div>

          {/* App name */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-center mb-3"
          >
            <h1 className="font-display font-bold text-2xl text-text tracking-tight">
              NeuroFlow
            </h1>
          </motion.div>

          {/* Tagline */}
          <AnimatePresence>
            {(phase === 'tagline' || phase === 'name') && (
              <motion.p
                key="tagline"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-sm text-muted font-body text-center mb-6"
              >
                {isNewUser
                  ? "Your context-aware workspace is ready."
                  : "We don't track tasks — we preserve human focus."}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Personalized greeting */}
          <AnimatePresence>
            {phase === 'name' && (
              <motion.div
                key="greeting"
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="px-5 py-2.5 rounded-full border border-accent/30 bg-accent/10"
              >
                <p className="text-sm font-body text-accent font-medium">
                  {isNewUser ? `Welcome, ${firstName} 👋` : `Welcome back, ${firstName}`}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress bar at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-bg-subtle overflow-hidden">
            <motion.div
              className="h-full bg-accent"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.2, ease: 'linear' }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
