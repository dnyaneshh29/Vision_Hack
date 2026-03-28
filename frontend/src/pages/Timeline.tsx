import { useEffect, useState } from 'react'
import { PageShell } from '../components/layout/PageShell'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { dashboardApi } from '../api/dashboard'
import { formatRelativeTime, formatDuration } from '../utils'

const eventIcons: Record<string, string> = {
  start: '●', pause: '◐', resume: '▶', complete: '✓',
  tab_open: '⊕', note_added: '✎', task_done: '✓',
  drift_detected: '⚠', intent_set: '◎',
}

const eventColors: Record<string, string> = {
  start: '#22d3a0', pause: '#6b6b80', resume: '#7c5cfc', complete: '#22d3a0',
  tab_open: '#06b6d4', note_added: '#c084fc', task_done: '#22d3a0',
  drift_detected: '#fbbf24', intent_set: '#7c5cfc',
}

interface TimelineEvent {
  id: string
  type: string
  session_id: string
  payload: Record<string, unknown>
  timestamp: string
}

export function Timeline() {
  const [grouped, setGrouped] = useState<Record<string, TimelineEvent[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.timeline(7).then((r) => {
      setGrouped(r.data.data as Record<string, TimelineEvent[]>)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const days = Object.keys(grouped).sort().reverse()

  return (
    <PageShell>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="font-display font-bold text-2xl text-text mb-6">Memory Timeline</h1>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : days.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted font-body">No events yet — start a session to build your timeline</p>
          </div>
        ) : (
          <div className="space-y-6">
            {days.map((day) => (
              <div key={day}>
                <p className="text-xs text-muted font-mono uppercase tracking-wider mb-3">{day}</p>
                <Card>
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-[rgba(255,255,255,0.07)]" />
                    <div className="space-y-3">
                      {grouped[day].map((event, i) => (
                        <div key={event.id ?? i} className="flex items-start gap-3 pl-1">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs z-10 relative"
                            style={{ backgroundColor: `${eventColors[event.type] ?? '#6b6b80'}20`, color: eventColors[event.type] ?? '#6b6b80' }}
                          >
                            {eventIcons[event.type] ?? '·'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-body text-text capitalize">{event.type.replace('_', ' ')}</p>
                              <span className="text-xs font-mono text-muted flex-shrink-0">
                                {formatRelativeTime(event.timestamp)}
                              </span>
                            </div>
                            {event.payload && Object.keys(event.payload).length > 0 && (
                              <p className="text-xs text-muted font-body mt-0.5 truncate">
                                {event.type === 'tab_open'
                                  ? String(event.payload.title || event.payload.domain || '')
                                  : String(event.payload.title ?? event.payload.preview ?? event.payload.task ?? '')
                                }
                              </p>
                            )}
                            {event.type === 'tab_open' && !!event.payload?.domain && (
                              <p className="text-[10px] text-muted font-mono mt-0.5 flex items-center gap-2">
                                <span>{String(event.payload.domain)}</span>
                                {event.payload.duration_secs != null && Number(event.payload.duration_secs) > 0 && (
                                  <span className="text-accent/70">{formatDuration(Number(event.payload.duration_secs))}</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
