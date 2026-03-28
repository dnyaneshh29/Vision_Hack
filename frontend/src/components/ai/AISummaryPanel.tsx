import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiApi } from '../../api/ai'
import { Card } from '../ui/Card'

interface Props {
  sessionId: string
  sessionStatus: string
}

export function AISummaryPanel({ sessionId, sessionStatus }: Props) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const res = await aiApi.getSessionSummary(sessionId)
      setSummary(res.data.data.summary)
    } catch {
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && !summary) fetch()
  }, [open])

  // Auto-refresh every 30s when session is active
  useEffect(() => {
    if (sessionStatus !== 'active') return
    const interval = setInterval(() => { if (open) fetch() }, 30000)
    return () => clearInterval(interval)
  }, [sessionStatus, open])

  return (
    <Card className="border-accent/20">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <span className="text-accent text-base">◈</span>
          <h3 className="font-display font-semibold text-text text-sm">AI Context Summary</h3>
          <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono border border-accent/20">
            AI
          </span>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted text-xs"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-muted font-mono">
                  <div className="w-3 h-3 border border-accent/40 border-t-accent rounded-full animate-spin" />
                  Analyzing session...
                </div>
              ) : summary ? (
                <div className="space-y-2">
                  {summary.split(' · ').map((line, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="text-xs text-text font-body leading-relaxed flex items-start gap-2"
                    >
                      <span className="text-accent/60 flex-shrink-0 mt-0.5">›</span>
                      <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    </motion.p>
                  ))}
                  <button
                    onClick={fetch}
                    className="text-xs text-muted hover:text-accent transition-colors font-mono mt-1"
                  >
                    ↻ Refresh
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted font-body">No summary available yet.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
