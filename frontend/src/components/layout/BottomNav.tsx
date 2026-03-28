import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../../store'

const navItems = [
  { label: 'Home', path: '/dashboard', icon: '⬡' },
  { label: 'Sessions', path: '/sessions', icon: '◈' },
  { label: 'Tabs', path: '/tab-history', icon: '⊕' },
  { label: 'Timeline', path: '/timeline', icon: '◎' },
]

export function BottomNav() {
  const location = useLocation()
  const { openModal } = useStore()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-raised border-t border-[rgba(255,255,255,0.07)] flex items-center z-30">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`
            flex-1 flex flex-col items-center py-3 gap-1 text-xs font-body transition-colors
            ${location.pathname === item.path ? 'text-accent' : 'text-muted'}
          `}
        >
          <span className="text-lg">{item.icon}</span>
          {item.label}
        </Link>
      ))}
      <button
        onClick={() => openModal('new-session')}
        className="flex-1 flex flex-col items-center py-3 gap-1 text-xs font-body text-accent"
      >
        <span className="text-lg">+</span>
        New
      </button>
    </nav>
  )
}
