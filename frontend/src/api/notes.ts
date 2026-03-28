import { apiClient } from './client'
import type { ApiResponse, Note } from '../types'

export const notesApi = {
  list: (sessionId: string) =>
    apiClient.get<ApiResponse<Note[]>>(`/sessions/${sessionId}/notes`),

  create: (sessionId: string, data: { content: string; pinned?: boolean }) =>
    apiClient.post<ApiResponse<Note>>(`/sessions/${sessionId}/notes`, data),

  update: (id: string, data: Partial<Note>) =>
    apiClient.patch<ApiResponse<Note>>(`/notes/${id}`, data),

  delete: (id: string) => apiClient.delete(`/notes/${id}`),
}
