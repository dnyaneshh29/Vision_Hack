import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import { Button } from '../ui/Button'
import { getStatusColor } from '../../utils'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '⬡' },
  { label: 'Sessions', path: '/sessions', icon: '◈' },
  { label: 'Tab History', path: '/tab-history', icon: '⊕' },
  { label: 'Timeline', path: '/timeline', icon: '◎' },
  { label: 'Stats', path: '/stats', icon: '◇' },
  { label: 'Flow Mode', path: '/flow', icon: '◉' },
  { label: 'Extension', path: '/extension', icon: '⊞' },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className = '' }: SidebarProps = {}) {
  const location = useLocation()
  const { user, sessions, sidebarCollapsed, toggleSidebar, openModal, logout } = useStore()
  const recentSessions = sessions.slice(0, 5)
  const [recentExpanded, setRecentExpanded] = useState(false)

  return (
    <AnimatePresence initial={false}>
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        className={`hidden md:flex flex-col h-screen bg-bg-raised/40 backdrop-blur-3xl border-r border-[rgba(255,255,255,0.04)] overflow-hidden flex-shrink-0 ${className}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-[rgba(255,255,255,0.07)] min-h-[57px]">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="w-8 h-8 rounded-md bg-accent flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(124,92,252,0.5)] cursor-pointer"
          >
            <span className="text-white font-display font-bold text-sm">N</span>
          </motion.div>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              className="font-display font-bold text-text text-sm whitespace-nowrap overflow-hidden"
            >
              NeuroFlow
            </motion.span>
          )}
        </div>

        {/* User */}
        {!sidebarCollapsed && user && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.07)]"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(124,92,252,0.2)]"
            >
              <span className="text-accent font-display font-bold text-xs">
                {user.username[0].toUpperCase()}
              </span>
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text truncate font-body">{user.username}</p>
              <p className="text-xs text-muted truncate font-mono">{user.email}</p>
            </div>
          </motion.div>
        )}

        {/* New Session */}
        <div className="p-3">
          <Button
            onClick={() => openModal('new-session')}
            className={`w-full ${sidebarCollapsed ? 'px-0 justify-center' : ''}`}
            size="sm"
          >
            {sidebarCollapsed ? '+' : '+ New Session'}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <Link
                key={item.path}
                to={item.path}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <motion.div
                  whileHover={{ x: sidebarCollapsed ? 0 : 3, backgroundColor: active ? undefined : 'rgba(255,255,255,0.04)' }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`
                    relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-body
                    transition-colors duration-150
                    ${active ? 'bg-accent/10 text-accent' : 'text-muted-2 hover:text-text'}
                  `}
                >
                  {/* Active pill indicator */}
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-full shadow-[0_0_8px_rgba(124,92,252,0.8)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="text-base flex-shrink-0 ml-1">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
                  )}
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* Recent Sessions */}
        {!sidebarCollapsed && recentSessions.length > 0 && (
          <div className="px-3 pb-2 border-t border-[rgba(255,255,255,0.07)] pt-3">
            <button
              onClick={() => setRecentExpanded(!recentExpanded)}
              className="w-full flex items-center justify-between text-xs text-muted hover:text-text font-mono uppercase tracking-wider mb-1 px-1 py-1 rounded transition-colors group"
            >
              <span>Recent</span>
              <motion.span
                animate={{ rotate: recentExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="opacity-50 group-hover:opacity-100"
              >
                ▼
              </motion.span>
            </button>
            <AnimatePresence>
              {recentExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="space-y-0.5 overflow-hidden"
                >
                  <div className="pt-1">
                    {recentSessions.map((s, i) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <Link
                          to={`/sessions/${s.id}`}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-bg-subtle transition-colors group"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getStatusColor(s.status) }}
                          />
                          <span className="text-xs text-muted-2 group-hover:text-text truncate font-body transition-colors">
                            {s.title}
                          </span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Bottom */}
        <div className="p-3 border-t border-[rgba(255,255,255,0.07)] flex items-center justify-between">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleSidebar}
            className="text-muted hover:text-text transition-colors text-sm p-1.5 rounded hover:bg-bg-subtle"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </motion.button>
          {!sidebarCollapsed && (
            <motion.button
              whileHover={{ scale: 1.05, color: '#f87171' }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="text-xs text-muted transition-colors font-body"
            >
              Sign out
            </motion.button>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}
