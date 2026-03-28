import { apiClient } from './client'

export const aiApi = {
  getSessionSummary: (sessionId: string) =>
    apiClient.get(`/ai/sessions/${sessionId}/summary`),

  getNextActions: (sessionId: string) =>
    apiClient.get(`/ai/sessions/${sessionId}/next-actions`),

  getFocusHealth: () =>
    apiClient.get('/ai/focus-health'),

  getFocusDNA: () =>
    apiClient.get('/analytics/focus-dna'),

  getDistractionCost: (date?: string) =>
    apiClient.get('/analytics/distraction-cost', { params: date ? { target_date: date } : {} }),
}
