import { apiClient } from './client'
import type { ApiResponse, TabLog } from '../types'

export interface DomainStat {
  domain: string
  visits: number
  total_secs: number
  is_distraction: boolean
}

export interface DayHistory {
  date: string
  tabs: TabLog[]
  domain_stats: DomainStat[]
  total_secs: number
  distraction_secs: number
  focus_secs: number
  focus_pct: number
  tab_count: number
  unique_domain_count: number
}

export interface TabHistorySummary {
  total_tabs: number
  total_secs: number
  distraction_secs: number
  focus_secs: number
  focus_pct: number
  days_tracked: number
}

export interface TabHistoryResponse {
  days: DayHistory[]
  summary: TabHistorySummary
  top_domains: DomainStat[]
}

export const tabsApi = {
  list: (sessionId: string) =>
    apiClient.get<ApiResponse<TabLog[]>>(`/tabs/${sessionId}`),

  history: (days = 30, domain?: string, distractionOnly = false) =>
    apiClient.get<ApiResponse<TabHistoryResponse>>('/tabs/history/all', {
      params: { days, ...(domain ? { domain } : {}), distraction_only: distractionOnly },
    }),
}
