import { motion } from 'framer-motion'
import type { SessionEvent, TabLog } from '../../types'
import { formatRelativeTime, formatDuration } from '../../utils'

const eventConfig: Record<string, { icon: string; color: string; label: string }> = {
  start: { icon: '●', color: '#22d3a0', label: 'Session started' },
  pause: { icon: '◐', color: '#6b6b80', label: 'Paused' },
  resume: { icon: '▶', color: '#7c5cfc', label: 'Resumed' },
  complete: { icon: '✓', color: '#22d3a0', label: 'Completed' },
  tab_open: { icon: '🌐', color: '#06b6d4', label: 'Browsed' },
  note_added: { icon: '✎', color: '#c084fc', label: 'Note added' },
  task_done: { icon: '✓', color: '#22d3a0', label: 'Task done' },
  drift_detected: { icon: '⚠', color: '#fbbf24', label: 'Focus drift' },
  intent_set: { icon: '◎', color: '#7c5cfc', label: 'Intent set' },
}

interface TimelineItem {
  type: 'event' | 'tab'
  data: SessionEvent | TabLog
  timestamp: string | number
}

interface MemoryReplayTimelineProps {
  timeline: TimelineItem[]
  compact?: boolean
}

export function MemoryReplayTimeline({ timeline, compact = false }: MemoryReplayTimelineProps) {
  if (timeline.length === 0) {
    return <p className="text-sm text-muted font-body text-center py-4">No activity yet</p>
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-[rgba(255,255,255,0.07)]" />
      <div className="space-y-3">
        {timeline.map((item, i) => {
          const isEvent = item.type === 'event'
          const data = item.data as any
          const config = isEvent 
            ? (eventConfig[data.type] ?? { icon: '·', color: '#6b6b80', label: data.type })
            : { icon: '🌐', color: '#06b6d4', label: 'Browsed' }

          return (
            <motion.div
              key={data.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 pl-1"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs z-10 relative"
                style={{ backgroundColor: `${config.color}20`, color: config.color }}
              >
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-body text-text">{config.label}</p>
                  <span className="text-xs font-mono text-muted flex-shrink-0">
                    {formatRelativeTime(String(item.timestamp))}
                  </span>
                </div>
                {!compact && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-[11px] font-body text-text font-medium leading-tight">
                        {isEvent
                          ? String(data.payload?.title ?? data.payload?.preview ?? data.payload?.task ?? '')
                          : String(data.title || data.domain || data.url || 'Untitled Tab')
                        }
                      </p>
                      {(isEvent
                        ? (data.type === 'tab_open' && data.payload?.duration_secs != null && Number(data.payload.duration_secs) > 0)
                        : (data.duration_secs != null && data.duration_secs > 0)
                      ) && (
                        <span className="text-[9px] font-mono text-accent/70 px-1 rounded bg-accent/5">
                          {formatDuration(Number(isEvent ? data.payload?.duration_secs : data.duration_secs))}
                        </span>
                      )}
                    </div>
                    {(isEvent
                      ? (data.type === 'tab_open' && data.payload?.domain)
                      : data.domain
                    ) && (
                      <p className="text-[10px] text-muted font-mono">
                        {isEvent ? String(data.payload?.domain ?? '') : String(data.domain)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
