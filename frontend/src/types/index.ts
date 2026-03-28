export type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned'

export type EventType =
  | 'start'
  | 'pause'
  | 'resume'
  | 'complete'
  | 'tab_open'
  | 'note_added'
  | 'task_done'
  | 'drift_detected'
  | 'intent_set'

export interface User {
  id: string
  email: string
  username: string
  avatar_url: string | null
  timezone: string
  preferences: Record<string, unknown>
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  title: string
  description: string | null
  intent: string | null
  outcome: string | null
  status: SessionStatus
  color: string | null
  tags: string[] | null
  momentum_score: number
  focus_time_secs: number
  drift_count: number
  started_at: string | null
  paused_at: string | null
  resumed_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  session_id: string
  user_id: string
  content: string
  pinned: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  session_id: string
  text: string
  done: boolean
  priority: number
  position: number
  created_at: string
  updated_at: string
}

export interface Link {
  id: string
  session_id: string
  url: string
  title: string | null
  favicon: string | null
  visited_at: string | null
  created_at: string
}

export interface TabLog {
  id: string
  session_id: string
  user_id: string
  url: string
  title: string | null
  domain: string | null
  duration_secs: number
  is_distraction: boolean
  logged_at: string
}

export interface SessionEvent {
  id: string
  session_id: string
  user_id: string
  type: EventType
  payload: Record<string, unknown>
  timestamp: string
}

export interface MomentumScore {
  date: string
  score: number
  focus_pct: number
  tasks_done: number
  drift_events: number
  session_id: string
}

export interface DashboardStats {
  total_sessions: number
  sessions_this_week: number
  total_focus_hours: number
  avg_momentum: number
  tasks_completed: number
}

export interface CreateSessionDTO {
  title: string
  intent?: string
  description?: string
  color?: string
  tags?: string[]
}

export interface ApiResponse<T> {
  data: T
  meta: {
    timestamp: string
    request_id: string
  }
}
