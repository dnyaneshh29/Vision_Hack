import { useState, useEffect, useCallback } from 'react'
import { dashboardApi } from '../api/dashboard'
import type { MomentumScore, DashboardStats } from '../types'

interface DashboardData {
  stats: DashboardStats | null
  momentum: MomentumScore[]
  cognitive: Record<string, { deep: number; shallow: number; distraction: number }>
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboard(): DashboardData {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [momentum, setMomentum] = useState<MomentumScore[]>([])
  const [cognitive, setCognitive] = useState<Record<string, { deep: number; shallow: number; distraction: number }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, m, c] = await Promise.all([
        dashboardApi.stats(),
        dashboardApi.momentum(),
        dashboardApi.cognitive(),
      ])
      setStats(s.data.data)
      setMomentum(m.data.data)
      setCognitive(c.data.data)
    } catch {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Refresh stats every 60s so numbers update as sessions progress
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [load])

  return { stats, momentum, cognitive, loading, error, refetch: load }
}
