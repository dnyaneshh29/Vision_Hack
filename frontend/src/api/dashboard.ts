import { apiClient } from './client'
import type { ApiResponse, MomentumScore, DashboardStats } from '../types'

export const dashboardApi = {
  timeline: (days = 7) =>
    apiClient.get<ApiResponse<Record<string, unknown[]>>>('/dashboard/timeline', { params: { days } }),

  momentum: () =>
    apiClient.get<ApiResponse<MomentumScore[]>>('/dashboard/momentum'),

  cognitive: () =>
    apiClient.get<ApiResponse<Record<string, { deep: number; shallow: number; distraction: number }>>>('/dashboard/cognitive'),

  stats: () =>
    apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats'),
}
