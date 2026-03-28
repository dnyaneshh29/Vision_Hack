import { apiClient } from './client'

export const extensionApi = {
  getState: () => apiClient.get('/extension/state'),
}
