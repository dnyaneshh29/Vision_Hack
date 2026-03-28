import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { Session } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { getStatusColor, getMomentumColor, formatRelativeTime, formatDuration } from '../../utils'
import { useStore } from '../../store'

interface SessionCardProps {
  session: Session
  onResume?: (id: string) => void
}

export function SessionCard({ session, onResume }: SessionCardProps) {
  const navigate = useNavigate()
  const { openModal, activeSession, focusTimeSeconds } = useStore()

  // Show live timer for the currently active session
  const displayFocusSecs = (activeSession?.id === session.id && focusTimeSeconds > 0)
    ? focusTimeSeconds
    : session.focus_time_secs

  const handleResume = (e: React.MouseEvent) => {
    e.stopPropagation()
    openModal('resume-packet', session.id)
    onResume?.(session.id)
  }

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/sessions/${session.id}`)
  }

  return (
    <motion.div
      whileHover={{
        y: -4,
        scale: 1.012,
        borderColor: 'rgba(124,92,252,0.25)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,92,252,0.15)',
      }}
      whileTap={{ scale: 0.98, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={() => navigate(`/sessions/${session.id}`)}
      className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg p-4 cursor-pointer relative overflow-hidden group"
    >
      {/* Color bar */}
      {session.color && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
          style={{ backgroundColor: session.color }}
        />
      )}

      <div className={session.color ? 'pl-3' : ''}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-display font-semibold text-text text-sm leading-tight line-clamp-2 flex-1">
            {session.title}
          </h3>
          <Badge color={getStatusColor(session.status)} className="flex-shrink-0 capitalize text-xs">
            {session.status}
          </Badge>
        </div>

        {session.intent && (
          <p className="text-xs text-muted font-body line-clamp-1 mb-2.5 italic">
            "{session.intent}"
          </p>
        )}

        <div className="flex items-center gap-3 mb-2.5">
          {/* Momentum ring */}
          <div className="flex items-center gap-1.5">
            <div className="relative w-6 h-6">
              <svg viewBox="0 0 24 24" className="w-6 h-6 -rotate-90">
                <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
                <circle
                  cx="12" cy="12" r="9" fill="none"
                  stroke={getMomentumColor(session.momentum_score)}
                  strokeWidth="2.5"
                  strokeDasharray={`${(session.momentum_score / 100) * 56.5} 56.5`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-xs font-mono" style={{ color: getMomentumColor(session.momentum_score) }}>
              {session.momentum_score}
            </span>
          </div>

          {/* Focus time */}
          {displayFocusSecs > 0 && (
            <span className="text-xs text-muted font-mono">
              {formatDuration(displayFocusSecs)}
              {activeSession?.id === session.id && (
                <span className="text-green ml-1 animate-pulse">●</span>
              )}
            </span>
          )}

          <span className="text-xs text-muted font-mono ml-auto">
            {formatRelativeTime(session.updated_at)}
          </span>
        </div>

        {/* Tags */}
        {session.tags && session.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {session.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        {session.status === 'paused' && (
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleResume} className="flex-1">
              ▶ Resume
            </Button>
            <Button size="sm" variant="ghost" onClick={handleOpen} className="px-3">
              ↗
            </Button>
          </div>
        )}

        {session.status === 'active' && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse flex-shrink-0" />
            <span className="text-xs text-green font-mono">Active now</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
