import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { PageShell } from '../components/layout/PageShell'
import { MemoryReplayTimeline } from '../components/features/MemoryReplayTimeline'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { useSession } from '../hooks/useSession'
import { useStore } from '../store'
import { notesApi } from '../api/notes'
import { checklistApi } from '../api/checklist'
import { sessionsApi } from '../api/sessions'
import { getStatusColor, getMomentumColor, formatDuration, formatRelativeTime } from '../utils'
import { AISummaryPanel } from '../components/ai/AISummaryPanel'
import { NextActionPanel } from '../components/ai/NextActionPanel'
import type { Note, ChecklistItem, TabLog, SessionEvent } from '../types'

interface TimelineItem {
  type: 'event' | 'tab'
  data: SessionEvent | TabLog
  timestamp: string | number
}
export function SessionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pauseSession, openModal, focusTimeSeconds, activeSession } = useStore()
  const { session, notes, checklist, events, tabs, extensionState, loading, error, refetch } = useSession(id!)

  // Build timeline: use tab_log rows for browsing (not tab_open events — they're duplicates)
  const timeline: TimelineItem[] = [
    ...events.filter(e => e.type !== 'tab_open').map(e => ({ type: 'event' as const, data: e, timestamp: e.timestamp })),
    ...tabs.map(t => ({ type: 'tab' as const, data: t, timestamp: t.logged_at }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Show live timer if this is the active session, otherwise show DB value
  const displayFocusSecs = (activeSession?.id === id && focusTimeSeconds > 0)
    ? focusTimeSeconds
    : session?.focus_time_secs ?? 0

  const [newNote, setNewNote] = useState('')
  const [newTask, setNewTask] = useState('')
  const [completing, setCompleting] = useState(false)
  const [outcome, setOutcome] = useState('')
  const [showOutcome, setShowOutcome] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')

  if (loading) {
    return (
      <PageShell>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </PageShell>
    )
  }

  if (error || !session) {
    return (
      <PageShell>
        <div className="p-6 text-center">
          <p className="text-muted font-body">{error ?? 'Session not found'}</p>
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mt-4">← Back</Button>
        </div>
      </PageShell>
    )
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    try {
      await notesApi.create(session.id, { content: newNote })
      setNewNote('')
      refetch()
    } catch {
      toast.error('Failed to add note')
    }
  }

  const handleAddTask = async () => {
    if (!newTask.trim()) return
    try {
      await checklistApi.create(session.id, { text: newTask })
      setNewTask('')
      refetch()
    } catch {
      toast.error('Failed to add task')
    }
  }

  const handleToggleTask = async (item: ChecklistItem) => {
    try {
      await checklistApi.update(item.id, { done: !item.done })
      refetch()
    } catch {
      toast.error('Failed to update task')
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await notesApi.delete(noteId)
      refetch()
    } catch {
      toast.error('Failed to delete note')
    }
  }

  const handlePause = async () => {
    try {
      await pauseSession(session.id)
      refetch()
    } catch {
      toast.error('Failed to pause session')
    }
  }

  const handleResume = () => {
    openModal('resume-packet', session.id)
  }

  const handleComplete = async () => {
    if (!outcome.trim()) {
      toast.error('Please describe what you achieved')
      return
    }
    setCompleting(true)
    try {
      await useStore.getState().completeSession(session.id, outcome)
      refetch()
      setShowOutcome(false)
    } catch {
      toast.error('Failed to complete session')
    } finally {
      setCompleting(false)
    }
  }

  const handleTitleSave = async () => {
    if (!titleValue.trim()) return
    try {
      await sessionsApi.update(session.id, { title: titleValue })
      setEditingTitle(false)
      refetch()
    } catch {
      toast.error('Failed to update title')
    }
  }

  const doneTasks = checklist.filter((t) => t.done).length
  const totalTasks = checklist.length
  const progressPct = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0

  return (
    <PageShell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-xs text-muted font-body">
          <Link to="/dashboard" className="hover:text-text transition-colors">Dashboard</Link>
          <span>/</span>
          <Link to="/sessions" className="hover:text-text transition-colors">Sessions</Link>
          <span>/</span>
          <span className="text-text truncate max-w-[200px]">{session.title}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {session.color && (
              <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: session.color }} />
            )}
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                    className="bg-bg-subtle border border-accent/50 rounded-md px-3 py-1.5 text-text font-display font-bold text-xl outline-none"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleTitleSave}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>Cancel</Button>
                </div>
              ) : (
                <div className="group/title">
                  <h1
                    className="font-display font-bold text-xl sm:text-2xl text-text cursor-pointer hover:text-accent transition-colors"
                    onClick={() => { setTitleValue(session.title); setEditingTitle(true) }}
                    title="Click to edit title"
                  >
                    {session.title}
                    <span className="ml-2 text-xs text-muted opacity-0 group-hover/title:opacity-100 transition-opacity font-body font-normal">
                      ✎ edit
                    </span>
                  </h1>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge color={getStatusColor(session.status)} className="capitalize">{session.status}</Badge>
                {extensionState?.connected && (
                  <Badge className="bg-green/20 text-green border-green/30 flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-green" />
                    LIVE
                  </Badge>
                )}
                {session.tags?.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                <span className="text-xs text-muted font-mono">{formatDuration(displayFocusSecs)} focused</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Momentum ring */}
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
                <circle cx="20" cy="20" r="16" fill="none" stroke={getMomentumColor(session.momentum_score)}
                  strokeWidth="3" strokeDasharray={`${(session.momentum_score / 100) * 100.5} 100.5`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-text">
                {session.momentum_score}
              </span>
            </div>

            {session.status === 'active' && (
              <Button size="sm" variant="ghost" onClick={handlePause}>Pause</Button>
            )}
            {session.status === 'paused' && (
              <Button size="sm" onClick={handleResume}>Resume</Button>
            )}
            {session.status !== 'completed' && session.status !== 'abandoned' && (
              <Button size="sm" variant="outline" onClick={() => setShowOutcome(true)}>Complete</Button>
            )}
          </div>
        </div>

        {/* Complete outcome input */}
        {showOutcome && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green/5 border border-green/20 rounded-lg"
          >
            <p className="text-sm font-body text-text mb-3">What did you achieve in this session?</p>
            <textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Describe your outcome..."
              className="w-full bg-bg-subtle border border-[rgba(255,255,255,0.07)] rounded-md px-3 py-2.5 text-sm text-text placeholder:text-muted font-body outline-none focus:border-green/50 resize-none mb-3"
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowOutcome(false)}>Cancel</Button>
              <Button size="sm" loading={completing} onClick={handleComplete}
                className="bg-green hover:bg-green/90">
                Complete Session
              </Button>
            </div>
          </motion.div>
        )}

        {/* Intent / Outcome */}
        {(session.intent || session.outcome) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {session.intent && (
              <Card>
                <p className="text-xs text-accent font-mono uppercase tracking-wider mb-2">Intent</p>
                <p className="text-sm text-text font-body">{session.intent}</p>
              </Card>
            )}
            {session.outcome && (
              <Card>
                <p className="text-xs text-green font-mono uppercase tracking-wider mb-2">Outcome</p>
                <p className="text-sm text-text font-body">{session.outcome}</p>
              </Card>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Memory Replay */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-text">Memory Replay</h2>
                <span className="text-xs text-muted font-mono">{timeline.length} events</span>
              </div>
              <MemoryReplayTimeline timeline={timeline} />
            </Card>

            {/* Notes */}
            <Card>
              <h2 className="font-display font-semibold text-text mb-4">Notes</h2>
              <div className="flex gap-2 mb-4">
                <input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  placeholder="Add a note..."
                  className="flex-1 bg-bg-subtle border border-[rgba(255,255,255,0.07)] rounded-md px-3 py-2 text-sm text-text placeholder:text-muted font-body outline-none focus:border-accent/50"
                />
                <Button size="sm" onClick={handleAddNote}>Add</Button>
              </div>
              {notes.length === 0 ? (
                <p className="text-sm text-muted font-body text-center py-4">No notes yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {notes.map((note: Note) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-bg-subtle rounded-md p-3 relative group"
                    >
                      {note.pinned && <span className="text-xs text-accent font-mono mb-1 block">📌 Pinned</span>}
                      <p className="text-sm text-text font-body">{note.content}</p>
                      <p className="text-xs text-muted font-mono mt-2">{formatRelativeTime(note.created_at)}</p>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="absolute top-2 right-2 text-muted hover:text-red opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        aria-label="Delete note"
                      >
                        ✕
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>

            {/* Checklist */}
            <Card>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display font-semibold text-text">Tasks</h2>
                <span className="text-xs text-muted font-mono">{doneTasks}/{totalTasks}</span>
              </div>
              {totalTasks > 0 && (
                <div className="w-full bg-bg-subtle rounded-full h-1 mb-4">
                  <div className="bg-accent h-1 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              )}
              <div className="flex gap-2 mb-4">
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                  placeholder="Add a task..."
                  className="flex-1 bg-bg-subtle border border-[rgba(255,255,255,0.07)] rounded-md px-3 py-2 text-sm text-text placeholder:text-muted font-body outline-none focus:border-accent/50"
                />
                <Button size="sm" onClick={handleAddTask}>Add</Button>
              </div>
              <div className="space-y-2">
                {checklist.map((item: ChecklistItem) => (
                  <div key={item.id} className="flex items-center gap-3 group">
                    <button
                      onClick={() => handleToggleTask(item)}
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${item.done ? 'bg-green border-green' : 'border-[rgba(255,255,255,0.12)] hover:border-accent'
                        }`}
                      aria-label={item.done ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {item.done && <span className="text-bg-base text-xs">✓</span>}
                    </button>
                    <span className={`text-sm font-body flex-1 ${item.done ? 'line-through text-muted' : 'text-text'}`}>
                      {item.text}
                    </span>
                    <button
                      onClick={() => checklistApi.delete(item.id).then(refetch)}
                      className="text-muted hover:text-red opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      aria-label="Delete task"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <h3 className="font-display font-semibold text-text mb-3 text-sm">Session Info</h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted">Status</span>
                  <span className="capitalize" style={{ color: getStatusColor(session.status) }}>{session.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Focus time</span>
                  <span className="text-text">{formatDuration(displayFocusSecs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Drift events</span>
                  <span className="text-amber">{session.drift_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Momentum</span>
                  <span style={{ color: getMomentumColor(session.momentum_score) }}>{session.momentum_score}</span>
                </div>
                {session.started_at && (
                  <div className="flex justify-between">
                    <span className="text-muted">Started</span>
                    <span className="text-text">{formatRelativeTime(session.started_at)}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* AI panels — additive only, no existing UI changed */}
            <AISummaryPanel sessionId={session.id} sessionStatus={session.status} />
            {session.status === 'active' && (
              <NextActionPanel sessionId={session.id} />
            )}
            {session.status === 'active' && (
              <Link to="/flow">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-3 rounded-xl bg-accent/10 border border-accent/30 text-center cursor-pointer hover:bg-accent/15 transition-colors"
                >
                  <p className="text-accent font-mono text-sm font-semibold">◎ Enter Flow Mode</p>
                  <p className="text-xs text-muted font-body mt-0.5">Distraction-free focus view</p>
                </motion.div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
