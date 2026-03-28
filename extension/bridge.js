// ═══════════════════════════════════════════════════════════
// NeuroFlow — Bridge Script
// Runs ONLY on http://localhost:5173 (the web app).
// 1. Syncs localStorage tokens → chrome.storage (for background.js)
// 2. Injects extension ID into the page (for ExtensionStatus component)
// 3. Relays session events from the web app to background.js
// ═══════════════════════════════════════════════════════════

// Helper to safely check if extension context is valid
function isContextValid() {
  return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
}

// ─── 1. Inject extension ID so the web page can call chrome.runtime.sendMessage ──
if (isContextValid()) {
  window.__NeuroFlow_EXT_ID = chrome.runtime.id
}

// Also expose a helper function the web page can call directly
window.__NeuroFlowGetState = () => {
  return new Promise((resolve) => {
    if (!isContextValid()) return resolve(null);
    try {
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null)
        } else {
          resolve(response)
        }
      })
    } catch (e) {
      resolve(null);
    }
  })
}

// ─── 2. Sync localStorage tokens → chrome.storage ────────────────────────────
function syncTokens() {
  if (!isContextValid()) return;
  
  const accessToken = localStorage.getItem('access_token')
  const refreshToken = localStorage.getItem('refresh_token')

  try {
    if (accessToken) {
      chrome.storage.local.set({
        access_token: accessToken,
        refresh_token: refreshToken ?? '',
      })
    } else {
      chrome.storage.local.remove(['access_token', 'refresh_token'])
    }
  } catch (e) {
    // Context likely invalidated
  }
}

syncTokens()

// Re-sync session_id from storage on page load so background keeps pushing state
// NOTE: We do NOT send SET_SESSION here because that would reset tab tracking data.
// The background alarm (PUSH_ALARM) will pick up the session_id from storage automatically.
;(async () => {
  if (!isContextValid()) return
  try {
    const result = await new Promise(resolve =>
      chrome.storage.local.get(['session_id'], resolve)
    )
    // Just trigger a pushState cycle by sending a lightweight ping
    if (result.session_id) {
      chrome.runtime.sendMessage({ type: 'ACTIVITY' })
    }
  } catch (_) {}
})()

window.addEventListener('storage', (e) => {
  if (e.key === 'access_token' || e.key === 'refresh_token') {
    syncTokens()
  }
})

// Poll to catch Zustand persist writes
setInterval(syncTokens, 3000)

// ─── 3. Relay session events from web app → background ───────────────────────
window.addEventListener('NeuroFlow:session', (e) => {
  if (!isContextValid()) return;
  
  const detail = e.detail ?? {}
  try {
    if (detail.sessionId) {
      chrome.storage.local.set({ session_id: detail.sessionId })
      chrome.runtime.sendMessage({ type: 'SET_SESSION', sessionId: detail.sessionId })
    } else {
      chrome.storage.local.remove(['session_id'])
      chrome.runtime.sendMessage({ type: 'CLEAR_SESSION' })
    }
  } catch (err) {
    // Context invalidated
  }
})
