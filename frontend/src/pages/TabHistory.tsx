import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { PageShell } from '../components/layout/PageShell'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { tabsApi, type DayHistory, type TabHistoryResponse } from '../api/tabs'
import { formatDuration } from '../utils'
import type { TabLog } from '../types'

const RANGE_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
]

// ─── Screenshot / preview helpers ────────────────────────────────────────────
// Uses free screenshot APIs — no API key needed for basic usage
function getScreenshotUrl(url: string): string {
  try {
    const encoded = encodeURIComponent(url)
    // miniature.io — free, no key, returns 320x240 screenshot
    return `https://api.miniature.io/?width=320&height=200&screen=1280x800&url=${encoded}`
  } catch {
    return ''
  }
}

function getFaviconLarge(domain: string): string {
  // Google's favicon service — returns up to 64px
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

function getFavicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`
}

function getDomainColor(domain: string): string {
  // Deterministic color from domain string
  let hash = 0
  for (let i = 0; i < domain.length; i++) hash = domain.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#7c5cfc', '#06b6d4', '#22d3a0', '#c084fc', '#f59e0b', '#3b82f6', '#ec4899']
  return colors[Math.abs(hash) % colors.length]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function truncateUrl(url: string, max = 60): string {
  try {
    const u = new URL(url)
    const display = u.hostname + u.pathname
    return display.length > max ? display.slice(0, max) + '…' : display
  } catch {
    return url.slice(0, max)
  }
}

function FocusBar({ pct }: { pct: number }) {
  const color = pct >= 70 ? '#22d3a0' : pct >= 50 ? '#7c5cfc' : '#fbbf24'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bg-subtle rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono flex-shrink-0" style={{ color }}>{pct}%</span>
    </div>
  )
}

// ─── Website Preview Card (hover tooltip) ────────────────────────────────────
function WebsitePreview({ tab, onClose }: { tab: TabLog; onClose: () => void }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const screenshotUrl = getScreenshotUrl(tab.url)
  const domain = tab.domain ?? ''
  const domainColor = getDomainColor(domain)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 left-0 top-full mt-2 w-80 bg-bg-overlay border border-[rgba(255,255,255,0.1)] rounded-lg shadow-2xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {/* Screenshot area */}
      <div className="relative w-full h-40 bg-bg-subtle overflow-hidden">
        {!imgError ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            )}
            <img
              src={screenshotUrl}
              alt={tab.title ?? domain}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          /* Fallback: colored domain card */
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${domainColor}20, ${domainColor}08)` }}
          >
            <img
              src={getFaviconLarge(domain)}
              className="w-10 h-10 rounded-lg"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              alt=""
            />
            <span className="text-sm font-mono text-muted-2">{domain}</span>
          </div>
        )}

        {/* Distraction overlay */}
        {tab.is_distraction && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-amber/20 border border-amber/40 text-amber text-xs font-mono">
            ⚠ distraction
          </div>
        )}

        {/* Duration badge */}
        {tab.duration_secs > 0 && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs font-mono">
            {formatDuration(tab.duration_secs)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {/* Favicon + domain */}
        <div className="flex items-center gap-2 mb-2">
          <img
            src={getFavicon(domain)}
            className="w-4 h-4 rounded flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            alt=""
          />
          <span
            className="text-xs font-mono font-semibold"
            style={{ color: domainColor }}
          >
            {domain}
          </span>
          <span className="text-xs text-muted font-mono ml-auto">{formatTime(tab.logged_at)}</span>
        </div>

        {/* Page title */}
        {tab.title && (
          <p className="text-sm font-medium text-text leading-snug mb-1.5 line-clamp-2">
            {tab.title}
          </p>
        )}

        {/* Full URL */}
        <p className="text-xs text-muted font-mono break-all leading-relaxed mb-3 line-clamp-2">
          {tab.url}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <a
            href={tab.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs py-1.5 rounded-md bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors font-body"
          >
            Open site ↗
          </a>
          <button
            onClick={onClose}
            className="px-3 text-xs py-1.5 rounded-md bg-bg-subtle text-muted border border-[rgba(255,255,255,0.07)] hover:text-text transition-colors font-body"
          >
            Close
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Single Tab Row with preview ─────────────────────────────────────────────
function TabRow({ tab }: { tab: TabLog }) {
  const [showPreview, setShowPreview] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const domain = tab.domain ?? ''

  // Close preview on outside click
  useEffect(() => {
    if (!showPreview) return
    const handler = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setShowPreview(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPreview])

  return (
    <div ref={rowRef} className="relative">
      <div
        className={`
          flex items-center gap-2 py-2 px-2 rounded-md transition-colors cursor-pointer group
          hover:bg-bg-subtle
          ${tab.is_distraction ? 'border-l-2 border-amber/40 pl-1.5' : ''}
          ${showPreview ? 'bg-bg-subtle' : ''}
        `}
        onClick={() => setShowPreview(p => !p)}
      >
        {/* Time */}
        <span className="text-xs font-mono text-muted flex-shrink-0 w-12">
          {formatTime(tab.logged_at)}
        </span>

        {/* Favicon */}
        <div className="relative flex-shrink-0">
          <img
            src={getFavicon(domain)}
            className="w-4 h-4 rounded"
            onError={e => {
              const el = e.target as HTMLImageElement
              el.style.display = 'none'
              el.nextElementSibling?.classList.remove('hidden')
            }}
            alt=""
          />
          {/* Fallback colored dot */}
          <div
            className="hidden w-4 h-4 rounded flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: getDomainColor(domain) }}
          >
            {domain[0]?.toUpperCase() ?? '?'}
          </div>
        </div>

        {/* Title + URL */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text truncate leading-tight font-medium">
            {tab.title || domain}
          </p>
          <p className="text-xs text-muted font-mono truncate">
            {truncateUrl(tab.url, 55)}
          </p>
        </div>

        {/* Duration */}
        <span className="text-xs font-mono text-muted flex-shrink-0 w-10 text-right">
          {tab.duration_secs > 0 ? formatDuration(tab.duration_secs) : '—'}
        </span>

        {/* Distraction */}
        {tab.is_distraction && (
          <span className="text-xs text-amber flex-shrink-0">⚠</span>
        )}

        {/* Preview hint */}
        <span className="text-xs text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {showPreview ? '▲' : '▼'}
        </span>
      </div>

      {/* Preview popup */}
      <AnimatePresence>
        {showPreview && (
          <WebsitePreview tab={tab} onClose={() => setShowPreview(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Domain card with screenshot thumbnail ────────────────────────────────────
function DomainCard({ domain, totalSecs, visits, isDistraction, maxSecs }: {
  domain: string
  totalSecs: number
  visits: number
  isDistraction: boolean
  maxSecs: number
}) {
  const [imgError, setImgError] = useState(false)
  const pct = Math.round((totalSecs / maxSecs) * 100)
  const color = isDistraction ? '#fbbf24' : getDomainColor(domain)
  const siteUrl = `https://${domain}`

  return (
    <div className="bg-bg-subtle border border-[rgba(255,255,255,0.07)] rounded-lg overflow-hidden hover:border-[rgba(255,255,255,0.12)] transition-colors group">
      {/* Mini screenshot */}
      <div className="relative h-20 bg-bg-overlay overflow-hidden">
        {!imgError ? (
          <img
            src={getScreenshotUrl(siteUrl)}
            alt={domain}
            className="w-full h-full object-cover object-top opacity-60 group-hover:opacity-80 transition-opacity"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}15, ${color}05)` }}
          >
            <img
              src={getFaviconLarge(domain)}
              className="w-8 h-8 rounded-md opacity-70"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              alt=""
            />
          </div>
        )}
        {isDistraction && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-amber/20 border border-amber/30 text-amber text-xs font-mono">
            ⚠
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <img
            src={getFavicon(domain)}
            className="w-3.5 h-3.5 rounded flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            alt=""
          />
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono truncate hover:underline"
            style={{ color }}
            onClick={e => e.stopPropagation()}
          >
            {domain}
          </a>
        </div>

        {/* Time bar */}
        <div className="w-full h-1 bg-bg-overlay rounded-full overflow-hidden mb-1.5">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-muted">{formatDuration(totalSecs)}</span>
          <span className="text-xs font-mono text-muted">{visits} visit{visits !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Day Card ─────────────────────────────────────────────────────────────────
function DayCard({ day, defaultOpen }: { day: DayHistory; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const [tabFilter, setTabFilter] = useState<'all' | 'focus' | 'distraction'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const filteredTabs = day.tabs.filter(t => {
    if (tabFilter === 'focus') return !t.is_distraction
    if (tabFilter === 'distraction') return t.is_distraction
    return true
  })

  const topDomains = day.domain_stats.slice(0, 8)
  const maxSecs = topDomains[0]?.total_secs ?? 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg overflow-hidden"
    >
      {/* Day header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-shrink-0 min-w-[90px]">
            <p className="font-display font-bold text-text text-sm">{formatDate(day.date)}</p>
            <p className="text-xs text-muted font-mono">{day.date}</p>
          </div>

          <div className="hidden sm:flex items-center gap-5 flex-1 min-w-0">
            <div className="text-center">
              <p className="font-mono font-bold text-text text-base">{day.tab_count}</p>
              <p className="text-xs text-muted">tabs</p>
            </div>
            <div className="text-center">
              <p className="font-mono font-bold text-text text-base">{day.unique_domain_count}</p>
              <p className="text-xs text-muted">sites</p>
            </div>
            <div className="text-center">
              <p className="font-mono font-bold text-text text-base">{formatDuration(day.total_secs)}</p>
              <p className="text-xs text-muted">tracked</p>
            </div>
            <div className="flex-1 max-w-28">
              <p className="text-xs text-muted mb-1">Focus</p>
              <FocusBar pct={day.focus_pct} />
            </div>
          </div>
        </div>

        <div className="sm:hidden flex items-center gap-3 mr-3">
          <span className="text-xs font-mono text-muted-2">{day.tab_count} tabs</span>
          <span className="text-xs font-mono" style={{ color: day.focus_pct >= 70 ? '#22d3a0' : '#fbbf24' }}>
            {day.focus_pct}%
          </span>
        </div>

        <span className="text-muted text-sm flex-shrink-0 ml-2">{open ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-[rgba(255,255,255,0.05)]">

              {/* Domain grid with screenshots */}
              {topDomains.length > 0 && (
                <div className="mt-4 mb-5">
                  <p className="text-xs text-muted font-mono uppercase tracking-wider mb-3">
                    Sites Visited
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {topDomains.map(d => (
                      <DomainCard
                        key={d.domain}
                        domain={d.domain}
                        totalSecs={d.total_secs}
                        visits={d.visits}
                        isDistraction={d.is_distraction}
                        maxSecs={maxSecs}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Tab timeline header */}
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="text-xs text-muted font-mono uppercase tracking-wider">
                  Tab Timeline ({filteredTabs.length})
                </p>
                <div className="flex items-center gap-2">
                  {/* Filter */}
                  <div className="flex gap-1">
                    {(['all', 'focus', 'distraction'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setTabFilter(f)}
                        className={`text-xs px-2 py-0.5 rounded font-mono capitalize transition-colors ${
                          tabFilter === f ? 'bg-accent/20 text-accent' : 'text-muted hover:text-text'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  {/* View toggle */}
                  <div className="flex gap-1 border border-[rgba(255,255,255,0.07)] rounded-md overflow-hidden">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-2 py-0.5 text-xs transition-colors ${viewMode === 'list' ? 'bg-accent/20 text-accent' : 'text-muted'}`}
                      title="List view"
                    >
                      ≡
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-2 py-0.5 text-xs transition-colors ${viewMode === 'grid' ? 'bg-accent/20 text-accent' : 'text-muted'}`}
                      title="Grid view"
                    >
                      ⊞
                    </button>
                  </div>
                </div>
              </div>

              {filteredTabs.length === 0 ? (
                <p className="text-xs text-muted font-body text-center py-4">No tabs match this filter</p>
              ) : viewMode === 'list' ? (
                /* List view — compact rows with click-to-preview */
                <div className="space-y-0.5 max-h-80 overflow-y-auto pr-1">
                  <p className="text-xs text-muted font-body mb-2 px-2">
                    Click any row to see website preview
                  </p>
                  {filteredTabs.map(tab => (
                    <TabRow key={tab.id} tab={tab} />
                  ))}
                </div>
              ) : (
                /* Grid view — screenshot cards */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                  {filteredTabs.map(tab => (
                    <GridTabCard key={tab.id} tab={tab} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Grid view tab card ───────────────────────────────────────────────────────
function GridTabCard({ tab }: { tab: TabLog }) {
  const [imgError, setImgError] = useState(false)
  const domain = tab.domain ?? ''
  const color = getDomainColor(domain)

  return (
    <a
      href={tab.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-bg-subtle border border-[rgba(255,255,255,0.07)] rounded-lg overflow-hidden hover:border-[rgba(255,255,255,0.14)] transition-colors group"
    >
      {/* Screenshot */}
      <div className="relative h-24 bg-bg-overlay overflow-hidden">
        {!imgError ? (
          <img
            src={getScreenshotUrl(tab.url)}
            alt={tab.title ?? domain}
            className="w-full h-full object-cover object-top opacity-70 group-hover:opacity-90 transition-opacity"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-1"
            style={{ background: `linear-gradient(135deg, ${color}15, ${color}05)` }}
          >
            <img
              src={getFaviconLarge(domain)}
              className="w-7 h-7 rounded"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              alt=""
            />
            <span className="text-xs font-mono text-muted">{domain}</span>
          </div>
        )}
        {tab.is_distraction && (
          <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-amber/20 border border-amber/30 text-amber text-xs font-mono">⚠</div>
        )}
        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs font-mono">
          {formatTime(tab.logged_at)}
        </div>
        {tab.duration_secs > 0 && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs font-mono">
            {formatDuration(tab.duration_secs)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <img
            src={getFavicon(domain)}
            className="w-3 h-3 rounded flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            alt=""
          />
          <span className="text-xs font-mono truncate" style={{ color }}>{domain}</span>
        </div>
        <p className="text-xs text-text truncate leading-tight">{tab.title || tab.url}</p>
        <p className="text-xs text-muted font-mono truncate mt-0.5">{truncateUrl(tab.url, 40)}</p>
      </div>
    </a>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function TabHistory() {
  const [range, setRange] = useState(30)
  const [data, setData] = useState<TabHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [domainFilter, setDomainFilter] = useState('')
  const [distractionOnly, setDistractionOnly] = useState(false)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await tabsApi.history(range, domainFilter || undefined, distractionOnly)
      setData(resp.data.data)
    } catch {
      setError('Failed to load tab history')
    } finally {
      setLoading(false)
    }
  }, [range, domainFilter, distractionOnly])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const chartData = data?.days.slice().reverse().map(d => ({
    date: d.date.slice(5),
    tabs: d.tab_count,
    focus: d.focus_pct,
    distraction: Math.round((d.distraction_secs / Math.max(d.total_secs, 1)) * 100),
  })) ?? []

  return (
    <PageShell>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-text">Tab History</h1>
            <p className="text-xs sm:text-sm text-muted font-body mt-1">
              Every website you visited — with previews, grouped by day
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  range === opt.value ? 'bg-accent text-white' : 'bg-bg-subtle text-muted hover:text-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
            {[
              { label: 'Total Tabs', value: data.summary.total_tabs.toLocaleString() },
              { label: 'Time Tracked', value: formatDuration(data.summary.total_secs) },
              { label: 'Focus Time', value: formatDuration(data.summary.focus_secs) },
              {
                label: 'Focus Rate',
                value: `${data.summary.focus_pct}%`,
                color: data.summary.focus_pct >= 70 ? '#22d3a0' : data.summary.focus_pct >= 50 ? '#fbbf24' : '#f87171',
              },
            ].map(s => (
              <Card key={s.label} className="p-3">
                <p className="text-xs text-muted font-mono mb-1">{s.label}</p>
                <p className="font-display font-bold text-xl sm:text-2xl" style={{ color: s.color ?? '#e2e2f0' }}>
                  {s.value}
                </p>
              </Card>
            ))}
          </div>
        )}

        {/* Charts */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Card>
              <p className="text-xs text-muted font-mono uppercase tracking-wider mb-3">Daily Tab Count</p>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={chartData} barSize={14}>
                  <XAxis dataKey="date" tick={{ fill: '#6b6b80', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b6b80', fontSize: 10 }} axisLine={false} tickLine={false} width={25} />
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#e2e2f0', fontSize: 11 }} formatter={(v: number) => [v, 'Tabs']} />
                  <Bar dataKey="tabs" radius={[3, 3, 0, 0]}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.distraction > 30 ? '#fbbf24' : '#7c5cfc'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <p className="text-xs text-muted font-mono uppercase tracking-wider mb-3">Focus vs Distraction</p>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={chartData} barSize={14}>
                  <XAxis dataKey="date" tick={{ fill: '#6b6b80', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#6b6b80', fontSize: 10 }} axisLine={false} tickLine={false} width={25} />
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#e2e2f0', fontSize: 11 }} formatter={(v: number, n: string) => [`${v}%`, n === 'focus' ? 'Focus' : 'Distraction']} />
                  <Bar dataKey="focus" stackId="a" fill="#7c5cfc" name="focus" />
                  <Bar dataKey="distraction" stackId="a" fill="#fbbf24" radius={[3, 3, 0, 0]} name="distraction" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent" /><span className="text-xs text-muted font-mono">Focus</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber" /><span className="text-xs text-muted font-mono">Distraction</span></div>
              </div>
            </Card>
          </div>
        )}

        {/* Top domains with screenshots */}
        {data && data.top_domains.length > 0 && (
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted font-mono uppercase tracking-wider">Top Sites ({range} days)</p>
              <button
                onClick={() => setDistractionOnly(d => !d)}
                className={`text-xs px-2 py-0.5 rounded font-mono transition-colors ${distractionOnly ? 'bg-amber/20 text-amber' : 'text-muted hover:text-text bg-bg-subtle'}`}
              >
                {distractionOnly ? '⚠ Distractions' : 'All sites'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {data.top_domains.slice(0, 10).map(d => (
                <DomainCard
                  key={d.domain}
                  domain={d.domain}
                  totalSecs={d.total_secs}
                  visits={d.visits}
                  isDistraction={d.is_distraction}
                  maxSecs={data.top_domains[0]?.total_secs ?? 1}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="Filter by domain…"
            value={domainFilter}
            onChange={e => setDomainFilter(e.target.value)}
            className="bg-bg-subtle border border-[rgba(255,255,255,0.07)] rounded-md px-3 py-1.5 text-xs text-text placeholder:text-muted font-mono outline-none focus:border-accent/50 w-48"
          />
          {domainFilter && (
            <button onClick={() => setDomainFilter('')} className="text-xs text-muted hover:text-text font-mono">✕ Clear</button>
          )}
          <span className="text-xs text-muted font-mono ml-auto">
            {data ? `${data.summary.total_tabs} tabs · ${data.summary.days_tracked} days` : ''}
          </span>
        </div>

        {/* Daily timeline */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : error ? (
          <Card className="text-center py-12">
            <p className="text-muted font-body text-sm">{error}</p>
            <button onClick={fetchHistory} className="text-accent text-sm mt-3 hover:underline font-body">Try again</button>
          </Card>
        ) : !data || data.days.length === 0 ? (
          <Card className="text-center py-16">
            <p className="text-3xl mb-4">⊕</p>
            <p className="font-display font-semibold text-text mb-2">No tab history yet</p>
            <p className="text-sm text-muted font-body max-w-sm mx-auto">
              Install the Chrome extension, sign in from the popup, start a session, and your tab history will appear here with website previews.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.days.map((day, i) => (
              <DayCard key={day.date} day={day} defaultOpen={i === 0} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
