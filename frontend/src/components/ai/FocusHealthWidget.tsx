import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { aiApi } from '../../api/ai'
import { Card } from '../ui/Card'

interface FocusHealth {
  avg_momentum_7d: number
  trend: string
  sessions_analyzed: number
  distraction_tabs_7d: number
  insights: string[]
  health_score: number
}

const trendIcon = { improving: '↑', stable: '→', declining: '↓' }
const trendColor = { improving: '#22d3a0', stable: '#fbbf24', declining: '#f87171' }

export function FocusHealthWidget() {
  const [data, setData] = useState<FocusHealth | null>(null)

  useEffect(() => {
    aiApi.getFocusHealth()
      .then(r => setData(r.data.data))
      .catch(() => {})
  }, [])

  if (!data) return null

  const color = data.health_score >= 70 ? '#22d3a0' : data.health_score >= 45 ? '#fbbf24' : '#f87171'

  return (
    <Card className="border-accent/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-accent">◈</span>
          <h3 className="font-display font-semibold text-text text-sm">Focus Health</h3>
          <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono border border-accent/20">AI</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-mono"
            style={{ color: trendColor[data.trend as keyof typeof trendColor] ?? '#6b6b80' }}
          >
            {trendIcon[data.trend as keyof typeof trendIcon] ?? '→'} {data.trend}
          </span>
        </div>
      </div>

      {/* Health score ring */}
      <div className="flex items-center gap-4 mb-3">
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <motion.circle
              cx="28" cy="28" r="22" fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              initial={{ strokeDasharray: '0 138.2' }}
              animate={{ strokeDasharray: `${(data.health_score / 100) * 138.2} 138.2` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-mono font-bold" style={{ color }}>{data.health_score}</span>
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-muted">7d avg</span>
            <span className="text-text">{data.avg_momentum_7d}</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-muted">Sessions</span>
            <span className="text-text">{data.sessions_analyzed}</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-muted">Distraction tabs</span>
            <span className="text-amber">{data.distraction_tabs_7d}</span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="space-y-1.5">
        {data.insights.map((insight, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="text-xs text-muted font-body flex items-start gap-1.5"
          >
            <span className="text-accent/60 flex-shrink-0">›</span>
            {insight}
          </motion.p>
        ))}
      </div>
    </Card>
  )
}
