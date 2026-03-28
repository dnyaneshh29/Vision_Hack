export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return '#22d3a0'
    case 'paused': return '#fbbf24'
    case 'completed': return '#7c5cfc'
    case 'abandoned': return '#f87171'
    default: return '#6b6b80'
  }
}

export function getMomentumColor(score: number): string {
  if (score >= 80) return '#22d3a0'
  if (score >= 60) return '#7c5cfc'
  if (score >= 40) return '#fbbf24'
  return '#f87171'
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export const SESSION_COLORS = [
  '#7c5cfc', '#c084fc', '#06b6d4', '#22d3a0',
  '#fbbf24', '#f87171', '#fb923c', '#34d399',
]
