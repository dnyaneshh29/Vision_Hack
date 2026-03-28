import { apiClient } from './client'
import type { ApiResponse, Session, CreateSessionDTO } from '../types'

export const sessionsApi = {
  list: (params?: { status?: string; limit?: number; offset?: number }) =>
    apiClient.get<ApiResponse<Session[]>>('/sessions', { params }),

  get: (id: string) => apiClient.get<ApiResponse<Session>>(`/sessions/${id}`),

  create: (data: CreateSessionDTO) =>
    apiClient.post<ApiResponse<Session>>('/sessions', data),

  update: (id: string, data: Partial<Session>) =>
    apiClient.patch<ApiResponse<Session>>(`/sessions/${id}`, data),

  delete: (id: string) => apiClient.delete(`/sessions/${id}`),

  // Persist live focus time every 30s
  heartbeat: (id: string, focusTimeSecs: number) =>
    apiClient.post<ApiResponse<{ focus_time_secs: number }>>(`/sessions/${id}/heartbeat`, {
      focus_time_secs: focusTimeSecs,
    }),

  pause: (id: string, focusTimeSecs: number) =>
    apiClient.post<ApiResponse<Session>>(`/sessions/${id}/pause`, {
      focus_time_secs: focusTimeSecs,
    }),

  resume: (id: string) =>
    apiClient.post<ApiResponse<Session>>(`/sessions/${id}/resume`),

  complete: (id: string, outcome: string, focusTimeSecs: number) =>
    apiClient.post<ApiResponse<Session>>(`/sessions/${id}/complete`, {
      outcome,
      focus_time_secs: focusTimeSecs,
    }),
}
