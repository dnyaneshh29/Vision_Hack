import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import { Button } from '../ui/Button'

export function FocusDriftAlert() {
  const { driftDetected, dismissDrift, activeSession, pauseSession } = useStore()

  const handlePause = async () => {
    if (activeSession) {
      await pauseSession(activeSession.id)
    }
    dismissDrift()
  }

  return (
    <AnimatePresence>
      {driftDetected && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1, x: [0, -4, 4, -4, 4, 0] }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-amber/10 border-b border-amber/30"
        >
          <div className="flex items-center gap-3">
            <span className="text-amber text-lg">⚠</span>
            <p className="text-sm font-body text-amber">
              You left your flow 8 minutes ago
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={dismissDrift}>
              I'm back
            </Button>
            <Button size="sm" variant="danger" onClick={handlePause}>
              Pause session
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
