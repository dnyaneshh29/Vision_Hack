import { apiClient } from './client'
import type { ApiResponse, SessionEvent } from '../types'

export const eventsApi = {
  list: (sessionId: string) =>
    apiClient.get<ApiResponse<SessionEvent[]>>(`/events/${sessionId}`),

  recordDrift: (sessionId: string, minutesAway: number) =>
    apiClient.post<ApiResponse<SessionEvent>>('/events/drift', {
      session_id: sessionId,
      minutes_away: minutesAway,
    }),
}
