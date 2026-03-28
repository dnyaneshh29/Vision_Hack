import { apiClient } from './client'
import type { ApiResponse, Link } from '../types'

export const linksApi = {
  list: (sessionId: string) =>
    apiClient.get<ApiResponse<Link[]>>(`/sessions/${sessionId}/links`),

  create: (sessionId: string, data: { url: string; title?: string; favicon?: string }) =>
    apiClient.post<ApiResponse<Link>>(`/sessions/${sessionId}/links`, data),

  delete: (id: string) => apiClient.delete(`/links/${id}`),
}
