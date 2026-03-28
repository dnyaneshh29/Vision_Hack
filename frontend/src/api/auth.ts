import { apiClient } from './client'
import type { ApiResponse, User } from '../types'

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    apiClient.post<ApiResponse<TokenResponse>>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<ApiResponse<TokenResponse>>('/auth/login', data),

  refresh: (refresh_token: string) =>
    apiClient.post<ApiResponse<{ access_token: string }>>('/auth/refresh', { refresh_token }),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get<ApiResponse<User>>('/auth/me'),
}
