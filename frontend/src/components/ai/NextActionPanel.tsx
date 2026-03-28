import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { aiApi } from '../../api/ai'
import { Card } from '../ui/Card'

interface Action {
  type: string
  priority: string
  label: string
  reason: string
}

const typeIcon: Record<string, string> = {
  task: '✓',
  focus: '◎',
  warning: '⚠',
  note: '✎',
  continue: '▶',
}

const priorityColor: Record<string, string> = {
  high: '#f87171',
  medium: '#fbbf24',
  low: '#22d3a0',
}

interface Props {
  sessionId: string
}

export function NextActionPanel({ sessionId }: Props) {
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    aiApi.getNextActions(sessionId)
      .then(r => setActions(r.data.data.actions))
      .catch(() => setActions([]))
      .finally(() => setLoading(false))

    const interval = setInterval(() => {
      aiApi.getNextActions(sessionId)
        .then(r => setActions(r.data.data.actions))
        .catch(() => {})
    }, 20000)
    return () => clearInterval(interval)
  }, [sessionId])

  if (loading) return null

  return (
    <Card className="border-green/20">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-green text-base">▶</span>
        <h3 className="font-display font-semibold text-text text-sm">Next Best Actions</h3>
        <span className="text-xs px-1.5 py-0.5 rounded bg-green/10 text-green font-mono border border-green/20">
          AI
        </span>
      </div>
      <div className="space-y-2">
        {actions.map((action, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-start gap-3 p-2.5 rounded-md bg-bg-subtle border border-[rgba(255,255,255,0.04)]"
          >
            <span
              className="text-sm flex-shrink-0 mt-0.5"
              style={{ color: priorityColor[action.priority] }}
            >
              {typeIcon[action.type] ?? '·'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text leading-tight">{action.label}</p>
              <p className="text-xs text-muted font-body mt-0.5">{action.reason}</p>
            </div>
            <span
              className="text-xs font-mono px-1 py-0.5 rounded flex-shrink-0"
              style={{
                backgroundColor: `${priorityColor[action.priority]}15`,
                color: priorityColor[action.priority],
              }}
            >
              {action.priority}
            </span>
          </motion.div>
        ))}
      </div>
    </Card>
  )
}
