import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Landing } from './pages/Landing'
import { Login, Signup } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { Sessions } from './pages/Sessions'
import { SessionDetail } from './pages/SessionDetail'
import { Timeline } from './pages/Timeline'
import { Stats } from './pages/Stats'
import { ExtensionGuide } from './pages/ExtensionGuide'
import { TabHistory } from './pages/TabHistory'
import { FlowMode } from './pages/FlowMode'
import { NewSessionModal } from './components/features/NewSessionModal'
import { ResumePacketModal } from './components/features/ResumePacketModal'
import { FocusDriftAlert } from './components/features/FocusDriftAlert'
import { CursorGlow } from './components/ui/CursorGlow'
import { useStore } from './store'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const { loadUser, isAuthenticated } = useStore()

  useEffect(() => {
    if (isAuthenticated) {
      loadUser()
    }
  }, [isAuthenticated, loadUser])

  return (
    <BrowserRouter>
      <CursorGlow />
      <FocusDriftAlert />
      <NewSessionModal />
      <ResumePacketModal />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#111118',
            color: '#e2e2f0',
            border: '1px solid rgba(255,255,255,0.07)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
        <Route path="/sessions/:id" element={<ProtectedRoute><SessionDetail /></ProtectedRoute>} />
        <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
        <Route path="/extension" element={<ProtectedRoute><ExtensionGuide /></ProtectedRoute>} />
        <Route path="/tab-history" element={<ProtectedRoute><TabHistory /></ProtectedRoute>} />
        <Route path="/flow" element={<ProtectedRoute><FlowMode /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
