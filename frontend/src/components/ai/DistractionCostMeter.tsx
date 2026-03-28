import { useEffect, useState, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { aiApi } from '../../api/ai'
import { Card } from '../ui/Card'

interface DistractionCost {
  date: string
  total_distraction_minutes: number
  distraction_tab_minutes: number
  idle_drift_minutes: number
  top_source: string | null
  sessions_affected: number
  domain_breakdown: { domain: string; minutes: number; visits: number }[]
  drift_events: number
  severity: 'low' | 'medium' | 'high'
}

const severityColor = {
  low: '#22d3a0',
  medium: '#fbbf24',
  high: '#f87171',
}

const severityLabel = {
  low: 'Low',
  medium: 'Moderate',
  high: 'High ⚠',
}

// Animated number counter
function AnimatedNumber({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const motionVal = useMotionValue(0)
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 })
  const [display, setDisplay] = useState('0')
  const ref = useRef(false)

  useEffect(() => {
    if (!ref.current) { ref.current = true; motionVal.set(0) }
    motionVal.set(value)
  }, [value])

  useEffect(() => {
    return spring.on('change', v => setDisplay(v.toFixed(decimals)))
  }, [spring, decimals])

  return <span>{display}</span>
}

export function DistractionCostMeter() {
  const [data, setData] = useState<DistractionCost | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = () => {
    aiApi.getDistractionCost()
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <span>💸</span>
          <h3 className="font-display font-semibold text-text text-sm">Distraction Cost</h3>
        </div>
        <div className="h-16 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      </Card>
    )
  }

  const mins = data?.total_distraction_minutes ?? 0
  const severity = data?.severity ?? 'low'
  const color = severityColor[severity]
  const noData = !data || mins === 0

  return (
    <Card className={`${severity === 'high' ? 'border-red/20' : severity === 'medium' ? 'border-amber/20' : 'border-green/20'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">💸</span>
          <h3 className="font-display font-semibold text-text text-sm">Distraction Cost Today</h3>
        </div>
        {!noData && (
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded border"
            style={{ color, backgroundColor: `${color}15`, borderColor: `${color}30` }}
          >
            {severityLabel[severity]}
          </span>
        )}
      </div>

      {noData ? (
        <p className="text-xs text-muted font-body text-center py-3">
          No distraction data yet today. Keep it up! 🎯
        </p>
      ) : (
        <>
          {/* Big number */}
          <div className="flex items-baseline gap-1 mb-1">
            <motion.span
              className="font-display font-bold text-4xl neon-text"
              style={{ color }}
            >
              <AnimatedNumber value={mins} />
            </motion.span>
            <span className="text-sm text-muted font-mono">min lost</span>
          </div>

          {/* Breakdown */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted">Distraction sites</span>
              <span style={{ color }}>{data!.distraction_tab_minutes}m</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted">Idle drift time</span>
              <span className="text-amber">{data!.idle_drift_minutes}m</span>
            </div>
            {data!.top_source && (
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted">Main source</span>
                <span className="text-red font-semibold">{data!.top_source}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted">Sessions affected</span>
              <span className="text-text">{data!.sessions_affected}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-bg-subtle rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (mins / 60) * 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-muted font-mono text-right">
            {mins >= 60 ? 'Over 1 hour lost today' : `${60 - mins}m before 1hr threshold`}
          </p>

          {/* Domain breakdown */}
          {data!.domain_breakdown.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)] space-y-1">
              {data!.domain_breakdown.slice(0, 3).map(d => (
                <div key={d.domain} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-2 flex-1 truncate">{d.domain}</span>
                  <span className="text-xs font-mono text-red">{d.minutes}m</span>
                  <span className="text-xs font-mono text-muted">{d.visits}×</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  )
}
