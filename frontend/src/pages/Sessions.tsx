import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PageShell } from '../components/layout/PageShell'
import { SessionCard } from '../components/features/SessionCard'
import { SessionCardSkeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { useStore } from '../store'

const STATUS_FILTERS = ['all', 'active', 'paused', 'completed', 'abandoned'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

export function Sessions() {
  const { sessions, loadingSessions, fetchSessions, openModal } = useStore()
  const [filter, setFilter] = useState<StatusFilter>('all')

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const filtered = filter === 'all' ? sessions : sessions.filter((s) => s.status === filter)

  return (
    <PageShell>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="font-display font-bold text-xl sm:text-2xl text-text">Sessions</h1>
          <Button onClick={() => openModal('new-session')} size="sm">+ New</Button>
        </div>

        <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-mono capitalize transition-colors ${
                filter === f ? 'bg-accent text-white' : 'bg-bg-subtle text-muted hover:text-text'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loadingSessions ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SessionCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <p className="text-4xl mb-4">◈</p>
            <p className="text-muted font-body mb-4 text-sm">
              {filter === 'all' ? 'No sessions yet' : `No ${filter} sessions`}
            </p>
            <Button onClick={() => openModal('new-session')}>Start a session</Button>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {filtered.map((s) => (
              <motion.div
                key={s.id}
                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              >
                <SessionCard session={s} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </PageShell>
  )
}
