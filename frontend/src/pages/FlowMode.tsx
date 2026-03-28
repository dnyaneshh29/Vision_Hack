import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { formatDuration, getMomentumColor } from '../utils'
import { aiApi } from '../api/ai'

interface Action {
  type: string
  priority: string
  label: string
  reason: string
}

const DISTRACTION_DOMAINS = [
  'twitter.com', 'x.com', 'reddit.com', 'youtube.com',
  'facebook.com', 'instagram.com', 'tiktok.com', 'netflix.com',
]

export function FlowMode() {
  const navigate = useNavigate()
  const { activeSession, focusTimeSeconds, driftDetected, dismissDrift } = useStore()
  const [actions, setActions] = useState<Action[]>([])
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale')
  const [breathActive, setBreathActive] = useState(false)
  const [contextSwitches, setContextSwitches] = useState(0)

  // Redirect if no active session
  useEffect(() => {
    if (!activeSession) navigate('/dashboard')
  }, [activeSession])

  // Load next actions
  useEffect(() => {
    if (!activeSession) return
    aiApi.getNextActions(activeSession.id)
      .then(r => setActions(r.data.data.actions))
      .catch(() => {})
    const interval = setInterval(() => {
      aiApi.getNextActions(activeSession.id)
        .then(r => setActions(r.data.data.actions))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [activeSession?.id])

  // Breathing exercise cycle
  useEffect(() => {
    if (!breathActive) return
    const cycle = async () => {
      setBreathPhase('inhale')
      await delay(4000)
      setBreathPhase('hold')
      await delay(4000)
      setBreathPhase('exhale')
      await delay(4000)
    }
    const interval = setInterval(cycle, 12000)
    cycle()
    return () => clearInterval(interval)
  }, [breathActive])

  // Context switch detection via tab visibility
  useEffect(() => {
    const handler = () => {
      if (document.hidden) setContextSwitches(c => c + 1)
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  if (!activeSession) return null

  const score = activeSession.momentum_score
  const scoreColor = getMomentumColor(score)

  return (
    <div className="fixed inset-0 bg-[#030305] flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Ambient background */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${scoreColor}40 0%, transparent 70%)`,
        }}
      />

      {/* Exit button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="absolute top-6 right-6 text-muted hover:text-text text-xs font-mono transition-colors px-3 py-1.5 rounded border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.15)]"
      >
        ✕ Exit Flow Mode
      </button>

      {/* Context switch counter */}
      {contextSwitches > 0 && (
        <div className="absolute top-6 left-6 text-xs font-mono text-amber">
          ⚠ {contextSwitches} context switch{contextSwitches !== 1 ? 'es' : ''}
        </div>
      )}

      <div className="flex flex-col items-center gap-8 max-w-lg w-full px-6">
        {/* Session title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-2">Now Focusing On</p>
          <h1 className="font-display font-bold text-2xl text-text">{activeSession.title}</h1>
          {activeSession.intent && (
            <p className="text-sm text-muted font-body mt-1 italic">"{activeSession.intent}"</p>
          )}
        </motion.div>

        {/* Big timer */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <p
            className="font-mono font-bold text-6xl neon-text"
            style={{ color: scoreColor }}
          >
            {formatDuration(focusTimeSeconds)}
          </p>
          <p className="text-xs text-muted font-mono mt-2">focused this session</p>
        </motion.div>

        {/* Momentum ring */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative w-24 h-24"
        >
          <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <motion.circle
              cx="48" cy="48" r="40" fill="none"
              stroke={scoreColor}
              strokeWidth="6"
              strokeLinecap="round"
              initial={{ strokeDasharray: '0 251.3' }}
              animate={{ strokeDasharray: `${(score / 100) * 251.3} 251.3` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono font-bold text-xl" style={{ color: scoreColor }}>{score}</span>
            <span className="text-xs text-muted font-mono">momentum</span>
          </div>
        </motion.div>

        {/* Drift alert */}
        <AnimatePresence>
          {driftDetected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full p-4 rounded-xl bg-amber/10 border border-amber/30 text-center"
            >
              <p className="text-amber font-mono text-sm mb-2">⚠ Focus drift detected</p>
              <p className="text-xs text-muted font-body mb-3">You've been away. Ready to refocus?</p>
              <button
                onClick={dismissDrift}
                className="px-4 py-1.5 rounded-md bg-amber/20 text-amber text-xs font-mono hover:bg-amber/30 transition-colors"
              >
                I'm back — resume focus
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next actions */}
        {actions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full space-y-2"
          >
            <p className="text-xs text-muted font-mono uppercase tracking-wider text-center mb-2">Suggested Next</p>
            {actions.slice(0, 2).map((action, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]"
              >
                <span className="text-accent text-sm flex-shrink-0">
                  {action.type === 'task' ? '✓' : action.type === 'focus' ? '◎' : '›'}
                </span>
                <p className="text-xs text-text font-body">{action.label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Breathing exercise */}
        <div className="flex flex-col items-center gap-3">
          {!breathActive ? (
            <button
              onClick={() => setBreathActive(true)}
              className="text-xs text-muted hover:text-accent transition-colors font-mono border border-[rgba(255,255,255,0.07)] px-4 py-2 rounded-md hover:border-accent/30"
            >
              ◎ Start breathing exercise
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={{
                  scale: breathPhase === 'inhale' ? 1.4 : breathPhase === 'hold' ? 1.4 : 1,
                  opacity: breathPhase === 'hold' ? 0.8 : 1,
                }}
                transition={{ duration: 4, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-full border-2 border-accent/40 flex items-center justify-center"
                style={{ boxShadow: '0 0 30px rgba(124,92,252,0.3)' }}
              >
                <div className="w-8 h-8 rounded-full bg-accent/20" />
              </motion.div>
              <p className="text-xs text-accent font-mono capitalize">{breathPhase}...</p>
              <button
                onClick={() => setBreathActive(false)}
                className="text-xs text-muted hover:text-text font-mono"
              >
                stop
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
