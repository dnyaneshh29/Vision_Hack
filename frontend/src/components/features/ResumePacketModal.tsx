import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useStore } from '../../store'
import { notesApi } from '../../api/notes'
import { checklistApi } from '../../api/checklist'
import { eventsApi } from '../../api/events'
import type { Note, ChecklistItem, SessionEvent } from '../../types'
import { formatRelativeTime, formatDuration } from '../../utils'

export function ResumePacketModal() {
  const { activeModal, selectedSessionId, sessions, closeModal, resumeSession } = useStore()
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])
  const [tasks, setTasks] = useState<ChecklistItem[]>([])
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  const session = sessions.find((s) => s.id === selectedSessionId)

  useEffect(() => {
    if (activeModal === 'resume-packet' && selectedSessionId) {
      setFetching(true)
      Promise.all([
        notesApi.list(selectedSessionId),
        checklistApi.list(selectedSessionId),
        eventsApi.list(selectedSessionId),
      ]).then(([n, c, e]) => {
        setNotes(n.data.data.slice(0, 2))
        setTasks(c.data.data.filter((t) => !t.done))
        setEvents(e.data.data.slice(-3))
      }).catch(() => {}).finally(() => setFetching(false))
    }
  }, [activeModal, selectedSessionId])

  const handleContinue = async () => {
    if (!selectedSessionId) return
    setLoading(true)
    try {
      await resumeSession(selectedSessionId)
      closeModal()
      navigate(`/sessions/${selectedSessionId}`)
      toast.success('Back in flow!')
    } catch {
      toast.error('Failed to resume session')
    } finally {
      setLoading(false)
    }
  }

  if (!session) return null

  return (
    <Modal open={activeModal === 'resume-packet'} onClose={closeModal} className="max-w-md">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          {session.color && (
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: session.color }} />
          )}
          <h2 className="font-display font-bold text-text text-lg">{session.title}</h2>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <p className="text-xs text-muted font-mono">
            Last active: {formatRelativeTime(session.paused_at ?? session.updated_at)}
          </p>
          {session.focus_time_secs > 0 && (
            <span className="text-xs font-mono text-accent">
              {formatDuration(session.focus_time_secs)} focused
            </span>
          )}
        </div>

        {/* Intent — always show, most important */}
        {session.intent && (
          <div className="bg-accent/5 border border-accent/20 rounded-md p-3 mb-4">
            <p className="text-xs text-accent font-mono uppercase tracking-wider mb-1">Your Intent</p>
            <p className="text-sm text-text font-body">{session.intent}</p>
          </div>
        )}

        {fetching ? (
          <div className="space-y-3 mb-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-bg-subtle rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
            ))}
          </div>
        ) : (
          <>
            {/* Last events */}
            {events.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted font-mono uppercase tracking-wider mb-2">Last Activity</p>
                <div className="space-y-1.5">
                  {events.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 text-xs text-muted-2 font-body">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent/50 flex-shrink-0" />
                      <span className="capitalize">{e.type.replace(/_/g, ' ')}</span>
                      <span className="ml-auto font-mono">{formatRelativeTime(e.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending tasks */}
            {tasks.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted font-mono uppercase tracking-wider mb-2">
                  Pending Tasks ({tasks.length})
                </p>
                <div className="space-y-1.5">
                  {tasks.slice(0, 4).map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-xs text-muted-2 font-body">
                      <span className="w-3 h-3 rounded border border-[rgba(255,255,255,0.12)] flex-shrink-0" />
                      {t.text}
                    </div>
                  ))}
                  {tasks.length > 4 && (
                    <p className="text-xs text-muted font-mono">+{tasks.length - 4} more tasks</p>
                  )}
                </div>
              </div>
            )}

            {tasks.length === 0 && events.length === 0 && (
              <p className="text-xs text-muted font-body mb-4 text-center py-2">
                No previous activity recorded yet.
              </p>
            )}

            {/* Latest notes */}
            {notes.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted font-mono uppercase tracking-wider mb-2">Latest Notes</p>
                <div className="space-y-2">
                  {notes.map((n) => (
                    <div key={n.id} className="bg-bg-subtle rounded-md p-2.5 text-xs text-muted-2 font-body line-clamp-2">
                      {n.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3 mt-2">
          <Button variant="ghost" onClick={closeModal} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleContinue} loading={loading} className="flex-1">
            Continue Session →
          </Button>
        </div>
      </div>
    </Modal>
  )
}
