import { useState } from 'react'
import { Card } from '../ui/Card'
import type { TabLog } from '../../types'
import { formatDuration } from '../../utils'

interface DomainStat {
  domain: string
  totalSecs: number
  visits: number
  isDistraction: boolean
  isInternal: boolean
}

interface TabsPanelProps {
  tabs: TabLog[]
  sessionId: string
}

// Known distraction domains
const DISTRACTION_DOMAINS = new Set([
  'twitter.com', 'x.com', 'reddit.com', 'youtube.com',
  'facebook.com', 'instagram.com', 'tiktok.com', 'netflix.com',
  'twitch.tv', 'discord.com', 'whatsapp.com', 'telegram.org',
  'linkedin.com', 'news.ycombinator.com', 'pinterest.com',
  'snapchat.com', 'tumblr.com', 'buzzfeed.com',
])

// Internal/tool domains — exclude from focus calculation entirely
const INTERNAL_DOMAINS = new Set([
  'localhost', '127.0.0.1', '0.0.0.0', 'newtab',
  'extensions', 'chrome', 'about',
])

function isInternalDomain(domain: string): boolean {
  const d = domain.toLowerCase()
  return INTERNAL_DOMAINS.has(d) || d.startsWith('localhost:') || d === ''
}

function isDistractionDomain(domain: string): boolean {
  return DISTRACTION_DOMAINS.has(domain.toLowerCase())
}

function getFavicon(domain: string) {
  if (isInternalDomain(domain)) return ''
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`
}

function getFocusColor(pct: number): string {
  if (pct >= 80) return '#22d3a0'
  if (pct >= 60) return '#7c5cfc'
  if (pct >= 40) return '#fbbf24'
  return '#f87171'
}

function getFocusLabel(pct: number): string {
  if (pct >= 80) return 'Deep focus'
  if (pct >= 60) return 'Good focus'
  if (pct >= 40) return 'Moderate'
  return 'Distracted'
}

/**
 * Calculate a realistic focus score based on:
 * - Time spent on distraction sites (penalizes heavily)
 * - Tab switching frequency (too many switches = shallow work)
 * - Average time per tab (longer = deeper focus)
 * - Excludes localhost/internal tabs from calculation
 */
function calculateFocusMetrics(tabs: TabLog[]) {
  // Filter out internal tabs (localhost, chrome://, etc.)
  const externalTabs = tabs.filter(t => !isInternalDomain(t.domain ?? ''))

  if (externalTabs.length === 0) {
    return { focusPct: null, focusLabel: 'No external tabs', totalSecs: 0, distractionSecs: 0, avgSecsPerTab: 0, switchRate: 0 }
  }

  const totalSecs = externalTabs.reduce((s, t) => s + t.duration_secs, 0)
  const distractionSecs = externalTabs
    .filter(t => t.is_distraction || isDistractionDomain(t.domain ?? ''))
    .reduce((s, t) => s + t.duration_secs, 0)

  // Tab switching penalty: more than 10 switches/hour = shallow work
  const sessionHours = Math.max(totalSecs / 3600, 0.1)
  const switchesPerHour = externalTabs.length / sessionHours
  // Penalty: 0 at ≤10/hr, up to -20 at 60+/hr
  const switchPenalty = Math.min(20, Math.max(0, (switchesPerHour - 10) / 2.5))

  // Average time per tab (longer = deeper focus)
  const avgSecsPerTab = totalSecs > 0 ? totalSecs / externalTabs.length : 0

  // Base focus = time not on distractions
  const baseFocusPct = totalSecs > 0
    ? ((totalSecs - distractionSecs) / totalSecs) * 100
    : 100

  // Apply switch penalty
  const focusPct = Math.max(0, Math.min(100, Math.round(baseFocusPct - switchPenalty)))

  return {
    focusPct,
    focusLabel: getFocusLabel(focusPct),
    totalSecs,
    distractionSecs,
    avgSecsPerTab: Math.round(avgSecsPerTab),
    switchRate: Math.round(switchesPerHour),
    externalTabCount: externalTabs.length,
    internalTabCount: tabs.length - externalTabs.length,
  }
}

export function TabsPanel({ tabs }: TabsPanelProps) {
  const [view, setView] = useState<'domains' | 'all'>('domains')

  // Aggregate domain stats
  const domainMap = new Map<string, DomainStat>()
  for (const tab of tabs) {
    const domain = tab.domain ?? ''
    const existing = domainMap.get(domain)
    const internal = isInternalDomain(domain)
    const distraction = !internal && (tab.is_distraction || isDistractionDomain(domain))

    if (existing) {
      existing.totalSecs += tab.duration_secs
      existing.visits++
    } else {
      domainMap.set(domain, {
        domain,
        totalSecs: tab.duration_secs,
        visits: 1,
        isDistraction: distraction,
        isInternal: internal,
      })
    }
  }

  const sortedDomains = Array.from(domainMap.values())
    .sort((a, b) => b.totalSecs - a.totalSecs)

  const maxSecs = sortedDomains.filter(d => !d.isInternal)[0]?.totalSecs ?? 1
  const metrics = calculateFocusMetrics(tabs)

  if (tabs.length === 0) {
    return (
      <Card>
        <h3 className="font-display font-semibold text-text mb-3 text-sm">Tab Context</h3>
        <div className="text-center py-6">
          <p className="text-2xl mb-2">⊕</p>
          <p className="text-xs text-muted font-body">No tabs logged yet.</p>
          <p className="text-xs text-muted font-body mt-1">
            Install the Chrome extension to track tabs automatically.
          </p>
        </div>
      </Card>
    )
  }

  const focusColor = metrics.focusPct !== null ? getFocusColor(metrics.focusPct) : '#6b6b80'

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-text text-sm">Tab Context</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setView('domains')}
            className={`text-xs px-2 py-0.5 rounded font-mono transition-colors ${view === 'domains' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-text'}`}
          >
            Domains
          </button>
          <button
            onClick={() => setView('all')}
            className={`text-xs px-2 py-0.5 rounded font-mono transition-colors ${view === 'all' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-text'}`}
          >
            All ({tabs.length})
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-bg-subtle rounded-md p-2 text-center">
          <p className="font-mono font-bold text-text text-base">{tabs.length}</p>
          <p className="text-xs text-muted">tabs visited</p>
        </div>
        <div className="bg-bg-subtle rounded-md p-2 text-center">
          <p className="font-mono font-bold text-text text-base">
            {sortedDomains.filter(d => !d.isInternal).length}
          </p>
          <p className="text-xs text-muted">ext. domains</p>
        </div>
        <div className="bg-bg-subtle rounded-md p-2 text-center">
          {metrics.focusPct !== null ? (
            <>
              <p className="font-mono font-bold text-base" style={{ color: focusColor }}>
                {metrics.focusPct}%
              </p>
              <p className="text-xs text-muted">focus score</p>
            </>
          ) : (
            <>
              <p className="font-mono font-bold text-base text-muted">—</p>
              <p className="text-xs text-muted">focus score</p>
            </>
          )}
        </div>
      </div>

      {/* Focus breakdown explanation */}
      {metrics.focusPct !== null && (
        <div className="bg-bg-subtle rounded-md p-2.5 mb-3 space-y-1.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-muted font-mono uppercase tracking-wider">Focus breakdown</p>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${focusColor}20`, color: focusColor }}>
              {metrics.focusLabel}
            </span>
          </div>

          {/* Focus bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-2 w-24 flex-shrink-0">Focus time</span>
            <div className="flex-1 h-1.5 bg-bg-overlay rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${metrics.focusPct}%`, backgroundColor: focusColor }} />
            </div>
            <span className="text-xs font-mono flex-shrink-0" style={{ color: focusColor }}>{metrics.focusPct}%</span>
          </div>

          {/* Distraction bar */}
          {metrics.totalSecs > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-2 w-24 flex-shrink-0">Distraction</span>
              <div className="flex-1 h-1.5 bg-bg-overlay rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber"
                  style={{ width: `${Math.round((metrics.distractionSecs / metrics.totalSecs) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-amber flex-shrink-0">
                {formatDuration(metrics.distractionSecs)}
              </span>
            </div>
          )}

          {/* How it's calculated */}
          <div className="pt-1 border-t border-[rgba(255,255,255,0.05)]">
            <p className="text-xs text-muted font-mono mb-1">How calculated:</p>
            <div className="space-y-0.5 text-xs text-muted font-mono">
              <p>• Distraction sites (YouTube, Instagram etc.) reduce score</p>
              <p>• {metrics.switchRate}/hr tab switches
                {metrics.switchRate > 10
                  ? <span className="text-amber"> ⚠ &gt;10/hr penalizes focus</span>
                  : <span className="text-green"> ✓ good</span>
                }
              </p>
              {metrics.avgSecsPerTab > 0 && (
                <p>• Avg {formatDuration(metrics.avgSecsPerTab)}/tab
                  {metrics.avgSecsPerTab < 30
                    ? <span className="text-amber"> ⚠ very short</span>
                    : <span className="text-green"> ✓ good depth</span>
                  }
                </p>
              )}
              {(metrics.internalTabCount ?? 0) > 0 && (
                <p>• {metrics.internalTabCount} localhost/internal tabs excluded</p>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'domains' ? (
        <div className="space-y-2">
          {sortedDomains.map((d) => {
            const pct = d.isInternal ? 0 : Math.round((d.totalSecs / maxSecs) * 100)
            return (
              <div key={d.domain} className="flex items-center gap-2">
                {d.isInternal ? (
                  <span className="w-3.5 h-3.5 flex-shrink-0 text-xs text-muted text-center">⚙</span>
                ) : (
                  <img
                    src={getFavicon(d.domain)}
                    className="w-3.5 h-3.5 rounded flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    alt=""
                  />
                )}
                <span className={`text-xs font-mono flex-1 truncate min-w-0 ${d.isInternal ? 'text-muted' : 'text-muted-2'}`}>
                  {d.domain || 'unknown'}
                </span>
                {d.isDistraction && (
                  <span className="text-xs text-amber flex-shrink-0">⚠</span>
                )}
                {d.isInternal && (
                  <span className="text-xs text-muted flex-shrink-0 font-mono">internal</span>
                )}
                {!d.isInternal && (
                  <div className="w-16 h-1.5 bg-bg-subtle rounded-full overflow-hidden flex-shrink-0">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: d.isDistraction ? '#fbbf24' : '#7c5cfc',
                      }}
                    />
                  </div>
                )}
                <span className="text-xs font-mono text-muted w-8 text-right flex-shrink-0">
                  {formatDuration(d.totalSecs)}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {tabs.map((tab) => {
            const domain = tab.domain ?? ''
            const internal = isInternalDomain(domain)
            return (
              <div key={tab.id} className="flex items-center gap-2 py-1 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                {internal ? (
                  <span className="w-3 h-3 flex-shrink-0 text-xs text-muted">⚙</span>
                ) : (
                  <img
                    src={getFavicon(domain)}
                    className="w-3 h-3 rounded flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    alt=""
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${internal ? 'text-muted' : 'text-text'}`}>
                    {tab.title ?? tab.url}
                  </p>
                  <p className="text-xs text-muted font-mono">{domain}</p>
                </div>
                {(tab.is_distraction || isDistractionDomain(domain)) && (
                  <span className="text-xs text-amber flex-shrink-0">⚠</span>
                )}
                {internal && (
                  <span className="text-xs text-muted flex-shrink-0 font-mono">internal</span>
                )}
                <span className="text-xs font-mono text-muted flex-shrink-0">
                  {formatDuration(tab.duration_secs)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {tabs.length > 0 && (
        <button
          onClick={() => {
            const urls = tabs.filter(t => !isInternalDomain(t.domain ?? '')).map(t => t.url).filter(Boolean)
            if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
              chrome.runtime.sendMessage({ type: 'RESTORE_TABS', urls: urls.slice(0, 10) })
            }
          }}
          className="mt-3 w-full text-xs text-muted hover:text-text border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.12)] rounded-md py-1.5 transition-colors font-body"
        >
          Restore All Tabs in Extension
        </button>
      )}
    </Card>
  )
}
