import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { aiApi } from '../../api/ai'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'

interface FocusDNA {
  peak_focus_hours: string
  top_distractions: string[]
  best_session_length: number
  focus_trend: string
  sessions_analyzed: number
}

const trendIcon = { improving: '↑', stable: '→', declining: '↓' }
const trendColor = { improving: '#22d3a0', stable: '#fbbf24', declining: '#f87171' }

export function FocusDNAWidget() {
  const [data, setData] = useState<FocusDNA | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    aiApi.getFocusDNA()
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-accent">🧠</span>
          <h3 className="font-display font-semibold text-text text-sm">Your Focus DNA</h3>
          <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono border border-accent/20">AI</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-6 w-full" />)}
        </div>
      </Card>
    )
  }

  if (!data || data.sessions_analyzed === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-accent">🧠</span>
          <h3 className="font-display font-semibold text-text text-sm">Your Focus DNA</h3>
          <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono border border-accent/20">AI</span>
        </div>
        <p className="text-xs text-muted font-body">Complete a few sessions to unlock your Focus DNA.</p>
      </Card>
    )
  }

  const trend = data.focus_trend as keyof typeof trendColor

  return (
    <Card className="border-accent/15">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🧠</span>
          <h3 className="font-display font-semibold text-text text-sm">Your Focus DNA</h3>
          <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono border border-accent/20">AI</span>
        </div>
        <span className="text-xs font-mono" style={{ color: trendColor[trend] ?? '#6b6b80' }}>
          {trendIcon[trend] ?? '→'} {data.focus_trend}
        </span>
      </div>

      <div className="space-y-2.5">
        {/* Peak hours */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-3 p-2 rounded-md bg-bg-subtle"
        >
          <span className="text-base flex-shrink-0">⏰</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted font-mono uppercase tracking-wider">Peak Focus</p>
            <p className="text-sm font-medium text-text">{data.peak_focus_hours}</p>
          </div>
        </motion.div>

        {/* Best session length */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 p-2 rounded-md bg-bg-subtle"
        >
          <span className="text-base flex-shrink-0">⏳</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted font-mono uppercase tracking-wider">Best Session Length</p>
            <p className="text-sm font-medium text-text">
              {data.best_session_length > 0 ? `${data.best_session_length} minutes` : 'Not enough data'}
            </p>
          </div>
        </motion.div>

        {/* Top distractions */}
        {data.top_distractions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-start gap-3 p-2 rounded-md bg-red/5 border border-red/10"
          >
            <span className="text-base flex-shrink-0">🚫</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted font-mono uppercase tracking-wider">Biggest Distractions</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.top_distractions.map(d => (
                  <span key={d} className="text-xs px-1.5 py-0.5 rounded bg-red/10 text-red font-mono border border-red/20">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <p className="text-xs text-muted font-mono text-right">
          Based on {data.sessions_analyzed} sessions (30 days)
        </p>
      </div>
    </Card>
  )
}
