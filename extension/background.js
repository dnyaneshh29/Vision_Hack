// NeuroFlow — Background Service Worker

const API_BASE = 'http://localhost:8000/api/v1'
const DRIFT_ALARM = 'fs-drift'
const PUSH_ALARM = 'fs-push'
const DRIFT_MINS = 8

const DISTRACTION_DOMAINS = [
  'twitter.com', 'x.com', 'reddit.com', 'youtube.com',
  'facebook.com', 'instagram.com', 'tiktok.com', 'netflix.com',
  'twitch.tv', 'discord.com', 'whatsapp.com', 'telegram.org',
  'linkedin.com', 'news.ycombinator.com',
]

function store(data) { return new Promise(r => chrome.storage.local.set(data, r)) }
function load(keys)  { return new Promise(r => chrome.storage.local.get(keys, r)) }

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}
function isInternal(url) {
  if (!url) return true
  return /^(chrome|chrome-extension|edge|moz-extension|about|data|blob):/.test(url)
}
function isDistraction(domain) {
  return DISTRACTION_DOMAINS.includes((domain || '').toLowerCase())
}

async function api(method, path, body) {
  const { access_token } = await load(['access_token'])
  if (!access_token) return null
  try {
    const res = await fetch(API_BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + access_token },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401) { await store({ access_token: null }); return null }
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

// Called ONLY when leaving a tab — writes one DB row per visit
async function flushTab() {
  const s = await load([
    'tab_url', 'tab_title', 'tab_domain', 'tab_start',
    'session_id', 'domain_stats', 'tab_log', 'tab_id',
  ])
  if (!s.tab_url || !s.tab_start || isInternal(s.tab_url)) return
  const secs = Math.floor((Date.now() - s.tab_start) / 1000)
  if (secs < 2) return

  let title = s.tab_title || ''
  if (s.tab_id && !title) {
    try { const t = await chrome.tabs.get(s.tab_id); if (t.title) title = t.title } catch (_) {}
  }

  const domain = s.tab_domain || ''
  const distract = isDistraction(domain)
  const stats = s.domain_stats || {}
  if (domain) {
    if (!stats[domain]) stats[domain] = { visits: 0, totalSecs: 0, isDistraction: distract }
    stats[domain].visits++
    stats[domain].totalSecs += secs
    delete stats[domain].__liveSecs
  }

  const log = s.tab_log || []
  log.push({ url: s.tab_url, title, domain, secs, isDistraction: distract, ts: Date.now() })

  // Reset tab_start so a race-condition second call won't double-count
  await store({ domain_stats: stats, tab_log: log, tab_start: Date.now() })

  if (s.session_id) {
    await api('POST', '/tabs/log', {
      session_id: s.session_id, url: s.tab_url, title, domain, duration_secs: secs,
    })
  }
}

// Called ONLY from onActivated — never from onUpdated
async function switchTab(tabId, url, title) {
  await flushTab()
  if (isInternal(url)) {
    await store({ tab_id: tabId, tab_url: null, tab_title: null, tab_domain: null, tab_start: null })
    return
  }
  const domain = getDomain(url)
  let resolvedTitle = title || ''
  if (!resolvedTitle) {
    try { const t = await chrome.tabs.get(tabId); resolvedTitle = t.title || '' } catch (_) {}
  }
  await store({
    tab_id: tabId, tab_url: url, tab_title: resolvedTitle,
    tab_domain: domain, tab_start: Date.now(),
    last_activity: Date.now(), drift_alerted: false,
  })
  await updateBadge()
}

async function updateBadge() {
  const { session_id, tab_log } = await load(['session_id', 'tab_log'])
  if (session_id) {
    chrome.action.setBadgeText({ text: (tab_log || []).length > 0 ? String((tab_log || []).length) : 'o' })
    chrome.action.setBadgeBackgroundColor({ color: '#7c5cfc' })
  } else {
    chrome.action.setBadgeText({ text: '' })
  }
}

// Updates __liveSecs in memory only — NO DB write, NO duplicate entries
async function updateLiveDomainStats() {
  const s = await load(['tab_url', 'tab_title', 'tab_domain', 'tab_start', 'domain_stats', 'tab_id'])
  if (!s.tab_url || !s.tab_start || isInternal(s.tab_url)) return
  const secs = Math.floor((Date.now() - s.tab_start) / 1000)
  if (secs < 1) return
  let title = s.tab_title || ''
  if (s.tab_id && !title) {
    try { const t = await chrome.tabs.get(s.tab_id); if (t.title) { title = t.title } } catch (_) {}
  }
  const domain = s.tab_domain || ''
  if (!domain) return
  const stats = s.domain_stats || {}
  if (!stats[domain]) stats[domain] = { visits: 0, totalSecs: 0, isDistraction: isDistraction(domain) }
  stats[domain].__liveSecs = secs
  await store({ domain_stats: stats, tab_title: title })
}

async function pushState() {
  const { session_id } = await load(['session_id'])
  if (session_id) await updateLiveDomainStats()

  const s = await load([
    'session_id', 'last_activity', 'tab_log', 'domain_stats',
    'tab_url', 'tab_title', 'tab_domain', 'tab_id',
  ])
  const openTabs = await new Promise(res =>
    chrome.tabs.query({}, ts => res(ts.filter(t => t.url && !isInternal(t.url)).length))
  )
  let activeTitle = s.tab_title || null
  if (s.tab_id && !activeTitle) {
    try { const t = await chrome.tabs.get(s.tab_id); if (t.title) activeTitle = t.title } catch (_) {}
  }
  const displayStats = {}
  for (const [d, stat] of Object.entries(s.domain_stats || {})) {
    displayStats[d] = { visits: stat.visits, totalSecs: stat.totalSecs + (stat.__liveSecs || 0), isDistraction: stat.isDistraction }
  }
  await api('POST', '/extension/state', {
    session_id: s.session_id || null, open_tab_count: openTabs,
    tabs_logged: (s.tab_log || []).length,
    active_tab_domain: s.tab_domain || null, active_tab_title: activeTitle,
    active_tab_url: s.tab_url || null, domain_stats: displayStats,
    last_activity: s.last_activity || null, is_active: !!s.session_id,
  })
}

async function checkDrift() {
  const { session_id, last_activity, drift_alerted } = await load(['session_id', 'last_activity', 'drift_alerted'])
  if (!session_id || !last_activity || drift_alerted) return
  const mins = (Date.now() - last_activity) / 60000
  if (mins < DRIFT_MINS) return
  await store({ drift_alerted: true })
  await api('POST', '/events/drift', { session_id, minutes_away: Math.floor(mins) })
  chrome.notifications.create('fs-drift', {
    type: 'basic', iconUrl: 'icons/icon48.png',
    title: 'NeuroFlow - Focus Drift Detected',
    message: `You have been away ${Math.floor(mins)} minutes. Resume your session?`,
    buttons: [{ title: "I'm back" }, { title: 'Pause session' }], priority: 2,
  })
}

// onActivated: user switched tabs — THE ONLY place switchTab is called
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (tab.url) await switchTab(tabId, tab.url, tab.title || '')
  } catch (_) {}
})

// onUpdated: NEVER calls switchTab — only updates title or handles SPA navigation
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.active) return
  const { tab_id, tab_url } = await load(['tab_id', 'tab_url'])
  // Only care about the tab we are currently tracking
  if (tabId !== tab_id) return
  // Title resolved — update without touching the timer
  if (info.title) await store({ tab_title: info.title })
  // SPA navigation: same tab, URL changed
  if (info.status === 'complete' && tab.url && tab.url !== tab_url) {
    await switchTab(tabId, tab.url, tab.title || info.title || '')
  }
})

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { tab_id } = await load(['tab_id'])
  if (tabId === tab_id) {
    await flushTab()
    await store({ tab_id: null, tab_url: null, tab_start: null })
  }
})

chrome.windows.onFocusChanged.addListener(async (winId) => {
  if (winId !== chrome.windows.WINDOW_ID_NONE) await store({ last_activity: Date.now(), drift_alerted: false })
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === DRIFT_ALARM) await checkDrift()
  if (alarm.name === PUSH_ALARM) await pushState()
})

chrome.notifications.onButtonClicked.addListener(async (id, btnIdx) => {
  if (id !== 'fs-drift') return
  if (btnIdx === 0) {
    await store({ last_activity: Date.now(), drift_alerted: false })
  } else {
    const { session_id } = await load(['session_id'])
    if (session_id) {
      await api('POST', `/sessions/${session_id}/pause`)
      await store({ session_id: null, tab_log: [], domain_stats: {} })
      await updateBadge()
    }
  }
  chrome.notifications.clear(id)
})

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  ;(async () => {
    switch (msg.type) {
      case 'SET_SESSION': {
        await flushTab()
        const existing = await load(['session_id'])
        const isNew = existing.session_id !== msg.sessionId
        await store({
          session_id: msg.sessionId,
          ...(isNew ? { tab_log: [], domain_stats: {} } : {}),
          last_activity: Date.now(), drift_alerted: false,
        })
        await updateBadge()
        reply({ ok: true })
        break
      }
      case 'CLEAR_SESSION': {
        await flushTab()
        await store({ session_id: null, tab_log: [], domain_stats: {}, drift_alerted: false })
        await updateBadge()
        reply({ ok: true })
        break
      }
      case 'ACTIVITY': {
        await store({ last_activity: Date.now(), drift_alerted: false })
        reply({ ok: true })
        break
      }
      case 'GET_STATE': {
        const s = await load(['session_id', 'last_activity', 'tab_log', 'domain_stats', 'tab_url', 'tab_title', 'tab_domain'])
        const tabs = await new Promise(res =>
          chrome.tabs.query({}, ts => res(ts.filter(t => t.url && !isInternal(t.url)).length))
        )
        reply({
          sessionId: s.session_id || null, lastActivity: s.last_activity || null,
          sessionTabLog: s.tab_log || [], domainStats: s.domain_stats || {},
          openTabCount: tabs, activeTabUrl: s.tab_url || null,
          activeTabTitle: s.tab_title || null, activeTabDomain: s.tab_domain || null,
        })
        break
      }
      case 'RESTORE_TABS': {
        for (const url of (msg.urls || []).slice(0, 15)) chrome.tabs.create({ url, active: false })
        reply({ ok: true })
        break
      }
      case 'GET_OPEN_TABS': {
        chrome.tabs.query({}, tabs => {
          reply(tabs.filter(t => t.url && !isInternal(t.url))
            .map(t => ({ id: t.id, url: t.url, title: t.title, active: t.active, domain: getDomain(t.url || '') })))
        })
        return true
      }
      default: reply({ ok: false })
    }
  })()
  return true
})

chrome.alarms.clearAll(() => {
  chrome.alarms.create(DRIFT_ALARM, { periodInMinutes: 1 })
  chrome.alarms.create(PUSH_ALARM, { periodInMinutes: 0.17 })
})

chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
  if (tab && tab.url && !isInternal(tab.url)) {
    const { tab_url } = await load(['tab_url'])
    if (!tab_url) {
      await store({
        tab_id: tab.id, tab_url: tab.url, tab_title: tab.title || '',
        tab_domain: getDomain(tab.url), tab_start: Date.now(), last_activity: Date.now(),
      })
    }
  }
  await updateBadge()
})
