// ═══════════════════════════════════════════════════════════
// NeuroFlow — Content Script (all pages except localhost:5173)
// Reports user activity to background so drift detection works.
// ═══════════════════════════════════════════════════════════

let lastActivity = Date.now()

function onActivity() { lastActivity = Date.now() }

document.addEventListener('mousemove', onActivity, { passive: true })
document.addEventListener('keydown',   onActivity, { passive: true })
document.addEventListener('click',     onActivity, { passive: true })
document.addEventListener('scroll',    onActivity, { passive: true })

// Report activity every 30s if user was active in last 60s
setInterval(() => {
  if ((Date.now() - lastActivity) < 60000) {
    chrome.runtime.sendMessage({ type: 'ACTIVITY' }).catch(() => {})
  }
}, 30000)

// Handle tab restore message
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === 'RESTORE_TAB' && msg.url) {
    window.location.href = msg.url
    reply({ ok: true })
  }
})
