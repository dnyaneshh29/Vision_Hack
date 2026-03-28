import { apiClient } from './client'
import type { ApiResponse, ChecklistItem } from '../types'

export const checklistApi = {
  list: (sessionId: string) =>
    apiClient.get<ApiResponse<ChecklistItem[]>>(`/sessions/${sessionId}/checklist`),

  create: (sessionId: string, data: { text: string; priority?: number }) =>
    apiClient.post<ApiResponse<ChecklistItem>>(`/sessions/${sessionId}/checklist`, data),

  update: (id: string, data: Partial<ChecklistItem>) =>
    apiClient.patch<ApiResponse<ChecklistItem>>(`/checklist/${id}`, data),

  delete: (id: string) => apiClient.delete(`/checklist/${id}`),
}
