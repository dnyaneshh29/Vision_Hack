import { apiClient } from './client'

export const aiApi = {
  getSessionSummary: (sessionId: string) =>
    apiClient.get(`/ai/sessions/${sessionId}/summary`),

  getNextActions: (sessionId: string) =>
    apiClient.get(`/ai/sessions/${sessionId}/next-actions`),

  getFocusHealth: () =>
    apiClient.get('/ai/focus-health'),
}
