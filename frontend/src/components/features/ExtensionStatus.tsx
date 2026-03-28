import { useEffect, useState } from 'react'
import { Card } from '../ui/Card'
import { extensionApi } from '../../api/extension'

interface ExtState {
  connected: boolean
  session_id: string | null
  open_tab_count: number
  tabs_logged: number
  active_tab_domain: string | null
  active_tab_title: string | null
  domain_stats: Record<string, { visits: number; totalSecs: number; isDistraction: boolean }>
  last_activity: number | null
}

function formatSecs(s: number): string {
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}

function getFavicon(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`
}

export function ExtensionStatus({ sessionId: _sessionId }: { sessionId?: string }) {
  const [ext, setExt] = useState<ExtState | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await extensionApi.getState()
        const data = res.data?.data
        if (data?.connected) {
          setExt(data as ExtState)
        } else {
          setExt(null)
        }
      } catch {
        setExt(null)
      } finally {
        setChecking(false)
      }
    }

    check()
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [])

  if (checking) return null

  // Extension not installed / not pushing state
  if (!ext) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">⊕</span>
          <h3 className="font-display font-semibold text-text text-sm">Tab Tracking</h3>
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-amber/10 text-amber font-mono border border-amber/20">
            inactive
          </span>
        </div>
        <p className="text-xs text-muted font-body mb-3 leading-relaxed">
          Install the Chrome extension to automatically track every tab you visit during a session.
        </p>
        <div className="space-y-1.5 mb-3">
          {[
            'Logs every tab with time spent',
            'Detects distraction sites',
            'Enables Tab History analytics',
          ].map(item => (
            <div key={item} className="flex items-center gap-2 text-xs text-muted-2 font-body">
              <span className="text-accent flex-shrink-0">✓</span>
              {item}
            </div>
          ))}
        </div>
        <a
          href="/extension"
          className="block w-full text-center text-xs py-2 rounded-md bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors font-body"
        >
          Setup Guide →
        </a>
      </Card>
    )
  }

  // Extension connected, no active session
  if (!ext.session_id) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
          <h3 className="font-display font-semibold text-text text-sm">Extension Connected</h3>
        </div>
        <p className="text-xs text-muted font-body">
          Start a session to begin tracking tabs automatically.
        </p>
        {ext.open_tab_count > 0 && (
          <p className="text-xs text-muted-2 font-mono mt-1">{ext.open_tab_count} tabs open now</p>
        )}
      </Card>
    )
  }

  // Extension connected + active session — live data
  const sortedDomains = Object.entries(ext.domain_stats)
    .sort((a, b) => b[1].totalSecs - a[1].totalSecs)
    .slice(0, 4)
  const maxSecs = sortedDomains[0]?.[1]?.totalSecs ?? 1
  const idleMins = ext.last_activity
    ? Math.floor((Date.now() - ext.last_activity) / 60000)
    : null

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
          <h3 className="font-display font-semibold text-text text-sm">Extension Live</h3>
        </div>
        <div className="flex gap-3 text-xs font-mono">
          <span className="text-muted-2">{ext.open_tab_count} open</span>
          <span className="text-muted-2">{ext.tabs_logged} logged</span>
        </div>
      </div>

      {idleMins !== null && idleMins >= 5 && (
        <div className="flex items-center gap-2 bg-amber/5 border border-amber/20 rounded-md p-2 mb-3">
          <span className="text-amber text-xs">⚠</span>
          <span className="text-xs text-amber font-mono">Idle {idleMins}m</span>
        </div>
      )}

      {ext.active_tab_domain && (
        <div className="flex items-center gap-2 bg-bg-subtle rounded-md p-2 mb-3">
          <img
            src={getFavicon(ext.active_tab_domain)}
            className="w-3.5 h-3.5 rounded flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            alt=""
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text truncate">{ext.active_tab_title ?? ext.active_tab_domain}</p>
            <p className="text-xs text-muted font-mono">{ext.active_tab_domain}</p>
          </div>
          <span className="text-xs text-muted font-mono flex-shrink-0">now</span>
        </div>
      )}

      {sortedDomains.length > 0 ? (
        <div className="space-y-1.5">
          {sortedDomains.map(([domain, stats]) => {
            const pct = Math.round((stats.totalSecs / maxSecs) * 100)
            return (
              <div key={domain} className="flex items-center gap-2">
                <img
                  src={getFavicon(domain)}
                  className="w-3 h-3 rounded flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  alt=""
                />
                <span className="text-xs font-mono text-muted-2 flex-1 truncate min-w-0">{domain}</span>
                <div className="w-14 h-1 bg-bg-subtle rounded-full overflow-hidden flex-shrink-0">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: stats.isDistraction ? '#fbbf24' : '#7c5cfc' }}
                  />
                </div>
                <span className="text-xs font-mono text-muted w-7 text-right flex-shrink-0">
                  {formatSecs(stats.totalSecs)}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-muted font-body text-center py-2">No tab activity yet</p>
      )}
    </Card>
  )
}
