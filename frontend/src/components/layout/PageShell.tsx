import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { Abstract3DModel } from '../ui/Abstract3DModel'
import { ErrorBoundary } from '../ui/ErrorBoundary'

interface PageShellProps {
  children: ReactNode
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="flex h-screen bg-bg-base overflow-hidden relative">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-lighten">
        <ErrorBoundary>
          <Abstract3DModel />
        </ErrorBoundary>
      </div>
      
      <div className="relative z-10 flex h-full w-full">
        <Sidebar className="glass-panel border-r-0" />
        <motion.main
          key={typeof window !== 'undefined' ? window.location.pathname : ''}
          initial={{ opacity: 0, y: 10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 overflow-y-auto pb-16 md:pb-0 relative z-10"
        >
          {children}
        </motion.main>
        <BottomNav />
      </div>
    </div>
  )
}
