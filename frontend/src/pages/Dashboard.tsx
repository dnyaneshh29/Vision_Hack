import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { PageShell } from '../components/layout/PageShell'
import { SessionCard } from '../components/features/SessionCard'
import { SessionCardSkeleton } from '../components/ui/Skeleton'
import { ExtensionStatus } from '../components/features/ExtensionStatus'
import { FocusHealthWidget } from '../components/ai/FocusHealthWidget'
import { FocusDNAWidget } from '../components/ai/FocusDNAWidget'
import { DistractionCostMeter } from '../components/ai/DistractionCostMeter'
import { Card } from '../components/ui/Card'
import { Card3D } from '../components/ui/Card3D'
import { Button } from '../components/ui/Button'
import { useStore } from '../store'
import { useDashboard } from '../hooks/useDashboard'
import { formatDuration, getMomentumColor } from '../utils'

export function Dashboard() {
  const { sessions, activeSession, loadingSessions, fetchSessions, focusTimeSeconds, driftDetected, openModal, dismissDrift, pauseSession } = useStore()
  const { stats, momentum, cognitive, loading: dashLoading } = useDashboard()
  const [isMomentumHovered, setIsMomentumHovered] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const pausedSessions = sessions.filter((s) => s.status === 'paused')
  const recentCompleted = sessions.filter((s) => s.status === 'completed').slice(0, 4)

  const cognitiveData = Object.entries(cognitive).sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([date, v]) => ({
    date: date.slice(5),
    deep: Math.round(v.deep / 60),
    shallow: Math.round(v.shallow / 60),
    distraction: Math.round(v.distraction / 60),
  }))



  return (
    <PageShell>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-gradient animate-pulse-slow">Dashboard</h1>
            <p className="text-xs sm:text-sm text-text font-body mt-2 opacity-80">Welcome back. Protect your focus.</p>
          </div>
          <Button onClick={() => openModal('new-session')} size="lg" className="sm:text-sm shadow-[0_0_20px_rgba(124,92,252,0.4)]">
            + New Session
          </Button>
        </div>

        {/* Active Session Banner */}
        {activeSession && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`mb-4 sm:mb-6 p-4 sm:p-5 rounded-2xl glass-panel relative overflow-hidden group ${driftDetected ? 'border-amber/50 shadow-[0_0_30px_rgba(251,191,36,0.2)]' : 'border-accent/50 shadow-[0_0_30px_rgba(124,92,252,0.2)]'}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${driftDetected ? 'from-amber/20' : 'from-accent/20'} to-transparent opacity-20 group-hover:opacity-40 transition-opacity`} />
            <div className="flex items-center justify-between flex-wrap gap-3 relative z-10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                  <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
                    <circle cx="20" cy="20" r="16" fill="none"
                      stroke={getMomentumColor(activeSession.momentum_score)}
                      strokeWidth="3"
                      strokeDasharray={`${(activeSession.momentum_score / 100) * 100.5} 100.5`}
                      strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-text">
                    {activeSession.momentum_score}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => navigate(`/sessions/${activeSession.id}`)}
                    className="font-display font-semibold text-text text-sm sm:text-base truncate max-w-[160px] sm:max-w-none hover:text-accent transition-colors text-left block"
                  >
                    {activeSession.title} ↗
                  </button>
                  <p className="text-xs text-muted font-mono">{formatDuration(focusTimeSeconds)} focused</p>
                </div>
                {driftDetected && (
                  <span className="hidden sm:inline px-2 py-1 rounded text-xs font-mono bg-amber/10 text-amber border border-amber/30 animate-pulse">
                    ⚠ Focus drift
                  </span>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {driftDetected && (
                  <Button size="sm" variant="ghost" onClick={dismissDrift}>
                    I'm back
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => navigate(`/sessions/${activeSession.id}`)}>
                  Open
                </Button>
                <Button size="sm" variant="danger"
                  onClick={() => pauseSession(activeSession.id)}>
                  Pause
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats row — 3D tilt cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {[
            { label: 'Focus Hours', value: dashLoading ? '—' : `${stats?.total_focus_hours ?? 0}h`, color: '#7c5cfc' },
            { label: 'This Week', value: dashLoading ? '—' : String(stats?.sessions_this_week ?? 0), color: '#06b6d4' },
            { label: 'Avg Momentum', value: dashLoading ? '—' : String(stats?.avg_momentum ?? 0), color: getMomentumColor(stats?.avg_momentum ?? 0) },
            { label: 'Tasks Done', value: dashLoading ? '—' : String(stats?.tasks_completed ?? 0), color: '#22d3a0' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card3D intensity={18} className="p-4 sm:p-5 glass-panel rounded-xl flex flex-col justify-center overflow-visible group">
                <p className="text-xs text-text font-mono mb-2 uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">{stat.label}</p>
                <p className="font-display font-bold text-3xl sm:text-4xl neon-text transition-all duration-300 drop-shadow-2xl" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                {/* Subtle bottom accent line */}
                <div className="h-0.5 w-8 rounded-full mt-2 opacity-60" style={{ backgroundColor: stat.color }} />
              </Card3D>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Main content */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            {/* Paused sessions */}
            {(loadingSessions || pausedSessions.length > 0) && (
              <div>
                <h2 className="font-display font-semibold text-text mb-3 text-xs uppercase tracking-wider text-muted">
                  Paused — Ready to Resume
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {loadingSessions
                    ? Array.from({ length: 2 }).map((_, i) => <SessionCardSkeleton key={i} />)
                    : pausedSessions.map((s) => <SessionCard key={s.id} session={s} />)
                  }
                </div>
              </div>
            )}

            {/* Recent completed */}
            {(loadingSessions || recentCompleted.length > 0) && (
              <div>
                <h2 className="font-display font-semibold text-text mb-3 text-xs uppercase tracking-wider text-muted">
                  Recent Sessions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {loadingSessions
                    ? Array.from({ length: 4 }).map((_, i) => <SessionCardSkeleton key={i} />)
                    : recentCompleted.map((s) => <SessionCard key={s.id} session={s} />)
                  }
                </div>
              </div>
            )}

            {/* Empty state — first-time user onboarding */}
            {!loadingSessions && sessions.length === 0 && (
              <Card className="text-center py-10 sm:py-14">
                <p className="text-4xl mb-4">◈</p>
                <h3 className="font-display font-semibold text-text mb-2 text-lg">Welcome to NeuroFlow</h3>
                <p className="text-sm text-muted font-body mb-6 max-w-sm mx-auto">
                  Stop losing 23 minutes every time you switch tasks. Create your first session to start preserving your focus and context.
                </p>
                <Button onClick={() => openModal('new-session')} size="lg" className="mb-4">
                  + Start Your First Session
                </Button>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 text-left max-w-lg mx-auto">
                  {[
                    { step: '1', title: 'Create a session', desc: 'Name your task and set your intent' },
                    { step: '2', title: 'Work with context', desc: 'Add notes, tasks, and links as you go' },
                    { step: '3', title: 'Pause & resume', desc: 'Get a full context packet when you return' },
                  ].map(s => (
                    <div key={s.step} className="bg-bg-subtle rounded-md p-3">
                      <div className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs font-mono flex items-center justify-center mb-2">
                        {s.step}
                      </div>
                      <p className="text-xs font-medium text-text mb-0.5">{s.title}</p>
                      <p className="text-xs text-muted">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Cognitive Timeline */}
            <Card>
              <h2 className="font-display font-semibold text-text mb-4 text-sm sm:text-base">Cognitive Timeline</h2>
              {cognitiveData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={cognitiveData}>
                    <defs>
                      <linearGradient id="deep" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="shallow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="distraction" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#6b6b80', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b6b80', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#e2e2f0', fontSize: 11 }} />
                    <Area type="monotone" dataKey="deep" stroke="#7c5cfc" fill="url(#deep)" strokeWidth={2} name="Deep Work" />
                    <Area type="monotone" dataKey="shallow" stroke="#06b6d4" fill="url(#shallow)" strokeWidth={2} name="Shallow Work" />
                    <Area type="monotone" dataKey="distraction" stroke="#fbbf24" fill="url(#distraction)" strokeWidth={2} name="Distraction" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted text-sm font-body text-center px-4">
                  Start a session to see your cognitive timeline
                </div>
              )}
              {/* Legend */}
              <div className="flex gap-4 mt-3 flex-wrap">
                {[['#7c5cfc', 'Deep Work'], ['#06b6d4', 'Shallow Work'], ['#fbbf24', 'Distraction']].map(([color, label]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs text-muted font-mono">{label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right panel */}
          <div className="space-y-3 sm:space-y-4">
            {/* Momentum gauge */}
            <Card className="relative overflow-hidden group">
              <div 
                className="w-full h-full relative z-10"
                onMouseEnter={() => setIsMomentumHovered(true)}
                onMouseLeave={() => setIsMomentumHovered(false)}
              >
                <h3 className="font-display font-semibold text-text mb-3 text-sm">Avg Momentum</h3>
                <div className="flex items-center justify-center mt-6 mb-4">
                  <div className="relative w-[140px] h-[140px]">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(124,92,252,0.3)]">
                      {/* Background Track */}
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                      {/* Animated Progress */}
                      <motion.circle 
                        cx="50" cy="50" r="40" fill="none" 
                        stroke={getMomentumColor(stats?.avg_momentum ?? 0)} 
                        strokeWidth="8" 
                        strokeLinecap="round"
                        initial={{ strokeDasharray: "0 251.3" }}
                        animate={{ 
                          strokeDasharray: isMomentumHovered 
                            ? ["0 251.3", `${((stats?.avg_momentum ?? 0) / 100) * 251.3} 251.3`] 
                            : `${((stats?.avg_momentum ?? 0) / 100) * 251.3} 251.3`
                        }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span 
                        animate={isMomentumHovered ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="font-display font-bold text-3xl neon-text" 
                        style={{ color: getMomentumColor(stats?.avg_momentum ?? 0) }}
                      >
                        {stats?.avg_momentum ?? 0}
                      </motion.span>
                      <span className="text-xs text-muted font-mono mt-1 opacity-70">/ 100</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Momentum history */}
            {momentum.length > 0 && (
              <Card>
                <h3 className="font-display font-semibold text-text mb-3 text-sm">30-Day Trend</h3>
                <ResponsiveContainer width="100%" height={90}>
                  <AreaChart data={momentum.slice(-14)}>
                    <defs>
                      <linearGradient id="mom" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="score" stroke="#7c5cfc" fill="url(#mom)" strokeWidth={2} />
                    <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#e2e2f0', fontSize: 11 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Streak */}
            <Card>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="font-display font-bold text-text text-xl">
                    {sessions.filter(s => s.status === 'completed').length}
                  </p>
                  <p className="text-xs text-muted font-mono">sessions completed</p>
                </div>
              </div>
            </Card>

            {/* Quick actions */}
            <Card>
              <h3 className="font-display font-semibold text-text mb-3 text-sm">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => openModal('new-session')}>
                  + New Session
                </Button>
                <Link to="/sessions">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    ◈ All Sessions
                  </Button>
                </Link>
                <Link to="/tab-history">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    ⊕ Tab History
                  </Button>
                </Link>
                <Link to="/timeline">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    ◎ Timeline
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Extension live status */}
            <ExtensionStatus sessionId={activeSession?.id} />

            {/* AI Focus Health — additive widget */}
            <FocusHealthWidget />

            {/* Focus DNA — personalization */}
            <FocusDNAWidget />

            {/* Distraction Cost Meter */}
            <DistractionCostMeter />
          </div>
        </div>
      </div>
    </PageShell>
  )
}
