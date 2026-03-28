import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth'
import { sessionsApi } from '../api/sessions'
import type { User, Session, CreateSessionDTO } from '../types'

type ActiveModal = 'new-session' | 'resume-packet' | 'complete' | null

interface NeuroFlowStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>

  sessions: Session[]
  activeSession: Session | null
  loadingSessions: boolean
  fetchSessions: () => Promise<void>
  createSession: (data: CreateSessionDTO) => Promise<Session>
  pauseSession: (id: string) => Promise<void>
  resumeSession: (id: string) => Promise<void>
  completeSession: (id: string, outcome: string) => Promise<void>

  // Focus timer — tracks elapsed seconds for the CURRENT active segment
  // focusStartTime: when the current active segment started (ms timestamp)
  // focusBaseSeconds: accumulated seconds from previous segments (before last resume)
  focusStartTime: number | null
  focusBaseSeconds: number
  focusTimeSeconds: number   // total = base + current segment
  driftDetected: boolean
  startFocusTimer: (baseSeconds?: number) => void
  stopFocusTimer: () => void
  checkForDrift: () => void
  dismissDrift: () => void

  sidebarCollapsed: boolean
  activeModal: ActiveModal
  selectedSessionId: string | null
  toggleSidebar: () => void
  openModal: (modal: ActiveModal, sessionId?: string) => void
  closeModal: () => void
}

let driftInterval: ReturnType<typeof setInterval> | null = null
let focusInterval: ReturnType<typeof setInterval> | null = null
let heartbeatInterval: ReturnType<typeof setInterval> | null = null

function clearAllTimers() {
  if (focusInterval) { clearInterval(focusInterval); focusInterval = null }
  if (driftInterval) { clearInterval(driftInterval); driftInterval = null }
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null }
}

export const useStore = create<NeuroFlowStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const resp = await authApi.login({ email, password })
        const { access_token, refresh_token, user } = resp.data.data
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        set({ user, token: access_token, isAuthenticated: true })
      },

      register: async (email, username, password) => {
        const resp = await authApi.register({ email, username, password })
        const { access_token, refresh_token, user } = resp.data.data
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        set({ user, token: access_token, isAuthenticated: true })
      },

      logout: () => {
        authApi.logout().catch(() => {})
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        clearAllTimers()
        set({
          user: null, token: null, isAuthenticated: false,
          sessions: [], activeSession: null,
          focusStartTime: null, focusBaseSeconds: 0, focusTimeSeconds: 0,
          activeModal: null, selectedSessionId: null,
        })
      },

      loadUser: async () => {
        try {
          const resp = await authApi.me()
          set({ user: resp.data.data, isAuthenticated: true })
        } catch {
          set({ user: null, isAuthenticated: false })
        }
      },

      sessions: [],
      activeSession: null,
      loadingSessions: false,

      fetchSessions: async () => {
        set({ loadingSessions: true })
        try {
          const resp = await sessionsApi.list()
          const sessions = resp.data.data
          const active = sessions.find((s) => s.status === 'active') ?? null
          set({ sessions, activeSession: active, loadingSessions: false })

          // If there's an active session and no timer running, restart timer
          // using the persisted focus_time_secs from the DB as the base
          if (active && !get().focusStartTime) {
            get().startFocusTimer(active.focus_time_secs)
          }
        } catch {
          set({ loadingSessions: false })
          toast.error('Failed to load sessions')
        }
      },

      createSession: async (data) => {
        const resp = await sessionsApi.create(data)
        const session = resp.data.data
        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSession: session,
        }))
        window.dispatchEvent(new CustomEvent('NeuroFlow:session', { detail: { sessionId: session.id } }))
        get().startFocusTimer(0)
        return session
      },

      pauseSession: async (id) => {
        const currentFocusSecs = get().focusTimeSeconds
        clearAllTimers()

        try {
          const resp = await sessionsApi.pause(id, currentFocusSecs)
          const updated = resp.data.data
          set((state) => ({
            sessions: state.sessions.map((s) => (s.id === id ? updated : s)),
            activeSession: state.activeSession?.id === id ? null : state.activeSession,
            focusStartTime: null,
            focusBaseSeconds: 0,
            focusTimeSeconds: 0,
          }))
          window.dispatchEvent(new CustomEvent('NeuroFlow:session', { detail: { sessionId: null } }))
        } catch {
          toast.error('Failed to pause session')
        }
      },

      resumeSession: async (id) => {
        try {
          const resp = await sessionsApi.resume(id)
          const updated = resp.data.data
          set((state) => ({
            sessions: state.sessions.map((s) => (s.id === id ? updated : s)),
            activeSession: updated,
          }))
          // Resume timer from where the DB says we left off
          get().startFocusTimer(updated.focus_time_secs)
        } catch {
          toast.error('Failed to resume session')
        }
      },

      completeSession: async (id, outcome) => {
        const currentFocusSecs = get().focusTimeSeconds
        clearAllTimers()

        try {
          const resp = await sessionsApi.complete(id, outcome, currentFocusSecs)
          const updated = resp.data.data
          set((state) => ({
            sessions: state.sessions.map((s) => (s.id === id ? updated : s)),
            activeSession: state.activeSession?.id === id ? null : state.activeSession,
            focusStartTime: null,
            focusBaseSeconds: 0,
            focusTimeSeconds: 0,
          }))
          toast.success(`Session complete! Momentum: ${updated.momentum_score}`)
        } catch {
          toast.error('Failed to complete session')
        }
      },

      // Focus timer
      focusStartTime: null,
      focusBaseSeconds: 0,
      focusTimeSeconds: 0,
      driftDetected: false,

      startFocusTimer: (baseSeconds = 0) => {
        clearAllTimers()
        const start = Date.now()
        set({ focusStartTime: start, focusBaseSeconds: baseSeconds, driftDetected: false })

        // Tick every second — total = base + elapsed since start
        focusInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - start) / 1000)
          set({ focusTimeSeconds: baseSeconds + elapsed })
        }, 1000)

        // Drift check every minute
        driftInterval = setInterval(() => {
          get().checkForDrift()
        }, 60000)

        // Heartbeat every 30s — persist focus time to backend
        heartbeatInterval = setInterval(async () => {
          const { activeSession, focusTimeSeconds } = get()
          if (!activeSession) return
          try {
            await sessionsApi.heartbeat(activeSession.id, focusTimeSeconds)
            // Update local session with confirmed DB value
            set((state) => ({
              sessions: state.sessions.map((s) =>
                s.id === activeSession.id
                  ? { ...s, focus_time_secs: focusTimeSeconds }
                  : s
              ),
              activeSession: state.activeSession?.id === activeSession.id
                ? { ...state.activeSession, focus_time_secs: focusTimeSeconds }
                : state.activeSession,
            }))
          } catch {
            // Heartbeat failure is non-critical — silently ignore
          }
        }, 30000)
      },

      stopFocusTimer: () => {
        clearAllTimers()
        set({ focusStartTime: null, focusBaseSeconds: 0, focusTimeSeconds: 0 })
      },

      checkForDrift: () => {
        const { focusStartTime, focusBaseSeconds } = get()
        if (!focusStartTime) return
        const totalMins = (focusBaseSeconds + Math.floor((Date.now() - focusStartTime) / 1000)) / 60
        if (totalMins >= 8) {
          set({ driftDetected: true })
        }
      },

      dismissDrift: () => {
        set({ driftDetected: false })
      },

      sidebarCollapsed: false,
      activeModal: null,
      selectedSessionId: null,

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      openModal: (modal, sessionId) => set({ activeModal: modal, selectedSessionId: sessionId ?? null }),
      closeModal: () => set({ activeModal: null, selectedSessionId: null }),
    }),
    {
      name: 'NeuroFlow-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)
