// ═══════════════════════════════════════════════════════════
// NeuroFlow Popup
// Handles: login form, session display, tab stats, domain bars
// ═══════════════════════════════════════════════════════════

const APP_URL = 'http://localhost:5173'
let API_BASE = 'http://localhost:8000/api/v1'

const DISTRACTION_DOMAINS = [
  'twitter.com','x.com','reddit.com','youtube.com','facebook.com',
  'instagram.com','tiktok.com','netflix.com','twitch.tv','discord.com',
  'whatsapp.com','telegram.org',
]

// ─── Storage ──────────────────────────────────────────────────────────────────
const store = d => new Promise(r => chrome.storage.local.set(d, r))
const load  = k => new Promise(r => chrome.storage.local.get(k, r))

async function getToken() {
  const d = await load(['access_token'])
  return d.access_token || null
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function apiGet(path) {
  const token = await getToken()
  if (!token) return null
  try {
    const r = await fetch(API_BASE + path, {
      headers: { Authorization: 'Bearer ' + token },
    })
    if (r.status === 401) { await store({ access_token: null }); return null }
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

async function apiPost(path, body = {}) {
  const token = await getToken()
  if (!token) return null
  try {
    const r = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(body),
    })
    if (r.status === 401) { await store({ access_token: null }); return null }
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

function bg(msg) {
  return new Promise(r => chrome.runtime.sendMessage(msg, r))
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmtSecs(s) {
  if (s < 60) return s + 's'
  if (s < 3600) return Math.floor(s/60) + 'm'
  return Math.floor(s/3600) + 'h ' + Math.floor((s%3600)/60) + 'm'
}
function fmtTimer(s) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
  if (h > 0) return h+':'+pad(m)+':'+pad(sec)
  return pad(m)+':'+pad(sec)
}
function pad(n) { return String(n).padStart(2,'0') }
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
function favicon(d) { return d ? `https://www.google.com/s2/favicons?domain=${d}&sz=16` : '' }
function isDistraction(d) { return DISTRACTION_DOMAINS.includes((d||'').toLowerCase()) }

let timerInterval = null

// ─── VIEW: Login form ─────────────────────────────────────────────────────────
function renderLogin(errorMsg) {
  setDot('')
  setApp(`
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-size:22px;margin-bottom:6px;">◈</div>
      <div style="font-weight:700;font-size:13px;color:var(--text);">Sign in to NeuroFlow</div>
      <div style="font-size:11px;color:var(--muted);margin-top:3px;">Track your focus sessions</div>
    </div>

    ${errorMsg ? `<div class="error-msg">${esc(errorMsg)}</div>` : ''}

    <div class="form-group">
      <label class="form-label">Email</label>
      <input id="inp-email" type="email" class="form-input" placeholder="you@example.com" autocomplete="email" />
    </div>
    <div class="form-group">
      <label class="form-label">Password</label>
      <input id="inp-pass" type="password" class="form-input" placeholder="••••••••" autocomplete="current-password" />
    </div>

    <button class="btn btn-primary" id="btn-login" style="width:100%;margin-top:4px;">Sign In</button>

    <div style="text-align:center;margin-top:10px;">
      <span style="font-size:11px;color:var(--muted);">No account? </span>
      <a id="link-signup" style="font-size:11px;color:var(--accent);cursor:pointer;text-decoration:none;">Create one ↗</a>
    </div>
  `)

  const emailEl = document.getElementById('inp-email')
  const passEl  = document.getElementById('inp-pass')
  const btnEl   = document.getElementById('btn-login')

  async function doLogin() {
    const email = emailEl.value.trim()
    const pass  = passEl.value
    if (!email || !pass) { renderLogin('Email and password required'); return }

    btnEl.textContent = 'Signing in…'
    btnEl.disabled = true

    try {
      const r = await fetch(API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      })
      const data = await r.json()
      if (!r.ok) {
        renderLogin(data?.error?.message || 'Invalid credentials')
        return
      }
      
      // FIX: The backend wraps the response in a 'data' object
      const loginData = data.data
      const token = loginData.access_token
      
      console.log('Login successful, storing tokens...')
      await store({ 
        access_token: token, 
        refresh_token: loginData.refresh_token || '',
        user: loginData.user
      })
      render()
    } catch (err) {
      console.error('Extension Login Error:', err)
      renderLogin('Cannot reach server. Is the backend running?')
    }
  }

  btnEl.addEventListener('click', doLogin)
  passEl.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin() })
  document.getElementById('link-signup').addEventListener('click', () => {
    chrome.tabs.create({ url: APP_URL + '/signup' })
  })

  emailEl.focus()
}

// ─── VIEW: No active session ──────────────────────────────────────────────────
async function renderNoSession(sessions) {
  setDot('')
  const bgState = await bg({ type: 'GET_STATE' })
  const resumable = (sessions || []).filter(s => s.status === 'active' || s.status === 'paused').slice(0, 5)

  let pickerHtml = ''
  if (resumable.length > 0) {
    pickerHtml = `
      <div class="section-title" style="margin-top:10px;">Resume a session</div>
      ${resumable.map(s => `
        <div class="session-pick-item" data-id="${s.id}" data-status="${s.status}">
          <div class="session-pick-dot" style="background:${s.color||'#7c5cfc'}"></div>
          <span class="session-pick-title">${esc(s.title)}</span>
          <span class="session-pick-status">${s.status}</span>
        </div>
      `).join('')}
    `
  }

  setApp(`
    <div style="text-align:center;padding:16px 0 10px;">
      <div style="font-size:22px;margin-bottom:6px;">◈</div>
      <div style="font-weight:600;font-size:13px;color:var(--text);">No active session</div>
      <div style="font-size:11px;color:var(--muted);margin-top:3px;line-height:1.5;">
        Start a session to begin tracking tabs.
      </div>
    </div>
    ${pickerHtml}
    <div class="btn-row" style="margin-top:10px;">
      <button class="btn btn-primary" id="btn-new">+ New Session</button>
      <button class="btn btn-ghost" id="btn-dash">Dashboard</button>
    </div>
    ${bgState?.openTabCount > 0 ? `
      <div class="divider"></div>
      <div class="section-title">${bgState.openTabCount} tabs open right now</div>
    ` : ''}
    <div class="btn-row" style="margin-top:8px;">
      <button class="btn btn-ghost" id="btn-signout" style="font-size:10px;">Sign out</button>
    </div>
  `)

  document.getElementById('btn-new').onclick = () => chrome.tabs.create({ url: APP_URL + '/dashboard' })
  document.getElementById('btn-dash').onclick = () => chrome.tabs.create({ url: APP_URL + '/dashboard' })
  document.getElementById('btn-signout').onclick = async () => {
    await store({ access_token: null, refresh_token: null, session_id: null })
    render()
  }

  document.querySelectorAll('.session-pick-item').forEach(el => {
    el.addEventListener('click', async () => {
      const id = el.dataset.id
      const status = el.dataset.status
      el.style.opacity = '0.5'
      el.style.pointerEvents = 'none'

      if (status === 'paused') {
        const result = await apiPost(`/sessions/${id}/resume`)
        if (result) {
          await store({ session_id: id })
          await bg({ type: 'SET_SESSION', sessionId: id })
          // Render with the resumed session directly
          const bgState = await bg({ type: 'GET_STATE' })
          await renderSession(result.data, bgState)
          return
        }
      }
      await store({ session_id: id })
      await bg({ type: 'SET_SESSION', sessionId: id })
      render()
    })
  })
}

// ─── VIEW: Active session ─────────────────────────────────────────────────────
async function renderSession(session, bgState) {
  setDot(session.status === 'active' ? 'active' : 'paused')

  const elapsed = session.started_at
    ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
    : 0

  const idleMins = bgState?.lastActivity
    ? Math.floor((Date.now() - bgState.lastActivity) / 60000)
    : 0
  const drifting = idleMins >= 8

  const domainStats = bgState?.domainStats || {}
  const domains = Object.entries(domainStats)
    .sort((a,b) => b[1].totalSecs - a[1].totalSecs)
    .slice(0, 5)
  const maxSecs = domains[0]?.[1]?.totalSecs || 1

  const tabsLogged = (bgState?.sessionTabLog || []).length
  const openTabs   = bgState?.openTabCount || 0
  const curDomain  = bgState?.activeTabDomain || ''
  const curTitle   = bgState?.activeTabTitle  || ''

  let html = ''

  // Drift banner
  if (drifting) {
    html += `
      <div class="drift-warning">
        <span class="drift-icon">⚠</span>
        <span class="drift-text">Idle ${idleMins}m — focus drift!</span>
        <button class="btn btn-ghost" id="btn-back" style="flex:0;padding:3px 7px;font-size:10px;">I'm back</button>
      </div>
    `
  }

  // Session card
  html += `
    <div class="session-card">
      <div class="session-color-bar" style="background:${session.color||'#7c5cfc'}"></div>
      <div class="session-card-inner">
        <div class="session-title">${esc(session.title)}</div>
        ${session.intent ? `<div class="session-intent">${esc(session.intent)}</div>` : ''}
        <div class="session-stats">
          <div class="stat-item">
            <div class="stat-value" id="tmr">${fmtTimer(elapsed)}</div>
            <div class="stat-label">Elapsed</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${tabsLogged}</div>
            <div class="stat-label">Logged</div>
          </div>
          <div class="stat-item">
            <div class="stat-value ${openTabs > 10 ? 'amber' : ''}">${openTabs}</div>
            <div class="stat-label">Open</div>
          </div>
          <div class="stat-item">
            <div class="stat-value ${session.momentum_score >= 70 ? 'green' : ''}">${session.momentum_score}</div>
            <div class="stat-label">Score</div>
          </div>
        </div>
      </div>
    </div>
  `

  // Current tab
  if (curDomain) {
    html += `
      <div class="section-title">Now viewing</div>
      <div class="current-tab">
        <img class="current-tab-favicon" src="${favicon(curDomain)}" onerror="this.style.display='none'" />
        <div class="current-tab-info">
          <div class="current-tab-title">${esc(curTitle || curDomain)}</div>
          <div class="current-tab-domain">${esc(curDomain)}</div>
        </div>
        ${isDistraction(curDomain) ? '<span class="distraction-badge">distraction</span>' : ''}
      </div>
    `
  }

  // Domain bars
  if (domains.length > 0) {
    html += `<div class="section-title">Domains this session</div><div class="domain-list">`
    for (const [d, st] of domains) {
      const pct = Math.round((st.totalSecs / maxSecs) * 100)
      html += `
        <div class="domain-row">
          <img class="domain-favicon" src="${favicon(d)}" onerror="this.style.display='none'" />
          <span class="domain-name">${esc(d)}</span>
          <div class="domain-bar-wrap">
            <div class="domain-bar ${isDistraction(d)?'distraction':''}" style="width:${pct}%"></div>
          </div>
          <span class="domain-time">${fmtSecs(st.totalSecs)}</span>
          <span class="domain-visits">${st.visits}×</span>
        </div>
      `
    }
    html += '</div>'
  }

  // Buttons
  html += `<div class="btn-row">`
  if (session.status === 'active') {
    html += `<button class="btn btn-danger" id="btn-pause">⏸ Pause</button>`
  } else {
    html += `<button class="btn btn-green" id="btn-resume">▶ Resume</button>`
  }
  html += `
    <button class="btn btn-ghost" id="btn-open">Open ↗</button>
    <button class="btn btn-ghost" id="btn-tabs">Tabs (${openTabs})</button>
  </div>`

  setApp(html)

  // Timer
  if (timerInterval) clearInterval(timerInterval)
  if (session.status === 'active' && session.started_at) {
    timerInterval = setInterval(() => {
      const el = document.getElementById('tmr')
      if (!el) return clearInterval(timerInterval)
      el.textContent = fmtTimer(Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000))
    }, 1000)
  }

  // Handlers
  document.getElementById('btn-back')?.addEventListener('click', async () => {
    await bg({ type: 'ACTIVITY' }); render()
  })
  document.getElementById('btn-pause')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-pause')
    if (btn) { btn.textContent = 'Pausing…'; btn.disabled = true }
    await apiPost(`/sessions/${session.id}/pause`)
    await store({ session_id: null })
    await bg({ type: 'CLEAR_SESSION' })
    render()
  })
  document.getElementById('btn-resume')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-resume')
    if (btn) { btn.textContent = 'Resuming…'; btn.disabled = true }
    const result = await apiPost(`/sessions/${session.id}/resume`)
    if (result) {
      // Store session_id so render() finds it
      await store({ session_id: session.id })
      await bg({ type: 'SET_SESSION', sessionId: session.id })
      // Re-render with the updated session data directly (don't re-fetch)
      await renderSession(result.data, bgState)
    } else {
      render()
    }
  })
  document.getElementById('btn-open').addEventListener('click', () => {
    chrome.tabs.create({ url: `${APP_URL}/sessions/${session.id}` })
  })
  document.getElementById('btn-tabs').addEventListener('click', () => renderTabsList(session.id))
}

// ─── VIEW: Open tabs list ─────────────────────────────────────────────────────
function renderTabsList(sessionId) {
  chrome.tabs.query({}, tabs => {
    const real = tabs.filter(t => t.url && !/^(chrome|chrome-extension|about):/.test(t.url))

    let html = `
      <div class="btn-row" style="margin-bottom:8px;">
        <button class="btn btn-ghost" id="btn-back2">← Back</button>
        <button class="btn btn-primary" id="btn-log-all">Log All (${real.length})</button>
      </div>
      <div class="section-title">${real.length} open tabs</div>
      <div class="open-tabs-list">
    `
    for (const t of real) {
      const d = t.url ? new URL(t.url).hostname.replace(/^www\./,'') : ''
      html += `
        <div class="open-tab-row" data-id="${t.id}">
          <img class="open-tab-favicon" src="${favicon(d)}" onerror="this.style.display='none'" />
          <span class="open-tab-title ${t.active?'open-tab-active':''}">${esc(t.title||t.url||'')}</span>
          ${isDistraction(d) ? '<span class="distraction-badge">⚠</span>' : ''}
        </div>
      `
    }
    html += '</div>'
    setApp(html)

    document.getElementById('btn-back2').onclick = () => render()
    document.getElementById('btn-log-all').onclick = async () => {
      for (const t of real.slice(0, 20)) {
        const d = t.url ? new URL(t.url).hostname.replace(/^www\./,'') : ''
        await apiPost('/tabs/log', {
          session_id: sessionId,
          url: t.url || '',
          title: t.title || '',
          domain: d,
          duration_secs: 0,
        })
      }
      render()
    }
    document.querySelectorAll('.open-tab-row').forEach(row => {
      row.addEventListener('click', () => {
        chrome.tabs.update(parseInt(row.dataset.id), { active: true })
      })
    })
  })
}

// ─── Main render ──────────────────────────────────────────────────────────────
async function render() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }

  // Load API base from storage (user may have changed it)
  const cfg = await load(['api_base_url'])
  if (cfg.api_base_url) API_BASE = cfg.api_base_url

  const token = await getToken()
  if (!token) { renderLogin(); return }

  const bgState = await bg({ type: 'GET_STATE' })

  // Check for session_id in storage (set by background or web app bridge)
  const stored = await load(['session_id'])
  const sessionId = bgState?.sessionId || stored.session_id || null

  // Fetch sessions
  const sessResp = await apiGet('/sessions?limit=10')
  if (!sessResp) { renderLogin('Session expired. Please sign in again.'); return }
  const sessions = sessResp.data || []

  if (!sessionId) { await renderNoSession(sessions); return }

  const sessResp2 = await apiGet(`/sessions/${sessionId}`)
  if (!sessResp2?.data) {
    await store({ session_id: null })
    await bg({ type: 'CLEAR_SESSION' })
    await renderNoSession(sessions)
    return
  }

  await renderSession(sessResp2.data, bgState)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setApp(html) { document.getElementById('app').innerHTML = html }
function setDot(cls) {
  const el = document.getElementById('status-dot')
  el.className = 'status-dot' + (cls ? ' ' + cls : '')
}

// ─── Footer ───────────────────────────────────────────────────────────────────
document.getElementById('open-dashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: APP_URL + '/dashboard' })
})
document.getElementById('open-settings').addEventListener('click', async () => {
  const cur = await load(['api_base_url'])
  const val = prompt('Backend API URL:', cur.api_base_url || API_BASE)
  if (val) { await store({ api_base_url: val }); API_BASE = val }
})

// ─── Boot ─────────────────────────────────────────────────────────────────────
render()
