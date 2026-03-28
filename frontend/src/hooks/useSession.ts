import { useState, useEffect, useCallback } from 'react'
import { sessionsApi } from '../api/sessions'
import { notesApi } from '../api/notes'
import { checklistApi } from '../api/checklist'
import { eventsApi } from '../api/events'
import { tabsApi } from '../api/tabs'
import { extensionApi } from '../api/extension'
import type { Session, Note, ChecklistItem, SessionEvent, TabLog } from '../types'

interface SessionDetail {
  session: Session | null
  notes: Note[]
  checklist: ChecklistItem[]
  events: SessionEvent[]
  tabs: TabLog[]
  extensionState: any
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useSession(sessionId: string): SessionDetail {
  const [session, setSession] = useState<Session | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [tabs, setTabs] = useState<TabLog[]>([])
  const [extensionState, setExtensionState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    setError(null)
    try {
      const [s, n, c, e, t, ext] = await Promise.all([
        sessionsApi.get(sessionId),
        notesApi.list(sessionId),
        checklistApi.list(sessionId),
        eventsApi.list(sessionId),
        tabsApi.list(sessionId),
        extensionApi.getState()
      ])
      setSession(s.data.data)
      setNotes(n.data.data)
      setChecklist(c.data.data)
      setEvents(e.data.data)
      setTabs(t.data.data)
      setExtensionState(ext.data.data)
    } catch {
      setError('Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { 
    fetch(true) // Initial load with loading spinner
    const interval = setInterval(() => fetch(false), 5000) // Silent updates every 5s
    return () => clearInterval(interval)
  }, [fetch])

  return { session, notes, checklist, events, tabs, extensionState, loading, error, refetch: () => fetch(false) }
}
