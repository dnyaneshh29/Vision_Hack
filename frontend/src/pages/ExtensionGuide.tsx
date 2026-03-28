import { motion } from 'framer-motion'
import { PageShell } from '../components/layout/PageShell'
import { Card } from '../components/ui/Card'

const steps = [
  {
    num: '1',
    title: 'Open Chrome Extensions',
    desc: 'In Chrome, go to the address bar and type:',
    code: 'chrome://extensions',
    tip: 'Or click the three-dot menu → More Tools → Extensions',
  },
  {
    num: '2',
    title: 'Enable Developer Mode',
    desc: 'In the top-right corner of the Extensions page, toggle on "Developer mode".',
    code: null,
    tip: 'You\'ll see new buttons appear: "Load unpacked", "Pack extension", "Update"',
  },
  {
    num: '3',
    title: 'Load the Extension',
    desc: 'Click "Load unpacked" and select the extension folder:',
    code: 'NeuroFlow-os/extension/',
    tip: 'Navigate to where you cloned this project and select the extension folder',
  },
  {
    num: '4',
    title: 'Sign In from the Popup',
    desc: 'Click the NeuroFlow icon in your toolbar. Enter your email and password directly in the popup — no need to open the web app first.',
    code: null,
    tip: 'The extension has a built-in login form. Your credentials are sent directly to the backend.',
  },
  {
    num: '5',
    title: 'Start a Session',
    desc: 'Create a session from the Dashboard or pick a paused session from the extension popup. Tab tracking starts automatically.',
    code: null,
    tip: 'The badge on the extension icon shows how many tabs have been logged in the current session.',
  },
]

const features = [
  { icon: '⊕', title: 'Auto Tab Logging', desc: 'Every tab you visit is logged with time spent, domain, and title.' },
  { icon: '◎', title: 'Domain Analytics', desc: 'See which domains you spent the most time on, with distraction detection.' },
  { icon: '⚠', title: 'Drift Detection', desc: 'After 8 minutes of inactivity, you get a Chrome notification to resume focus.' },
  { icon: '◈', title: 'Session Picker', desc: 'Resume any paused session directly from the extension popup.' },
  { icon: '⊞', title: 'Open Tab Count', desc: 'See how many tabs are open right now — fewer tabs = better focus.' },
  { icon: '↺', title: 'Tab Restore', desc: 'Restore all tabs from a previous session with one click.' },
]

export function ExtensionGuide() {
  return (
    <PageShell>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="font-display font-bold text-2xl text-text mb-2">
              Chrome Extension Setup
            </h1>
            <p className="text-sm text-muted font-body">
              The NeuroFlow extension tracks every tab you visit and syncs it to your sessions automatically.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Card className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-accent font-display font-bold text-sm">{step.num}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-text mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-2 font-body mb-2">{step.desc}</p>
                    {step.code && (
                      <div className="bg-bg-subtle border border-[rgba(255,255,255,0.07)] rounded-md px-3 py-2 mb-2">
                        <code className="text-xs font-mono text-accent">{step.code}</code>
                      </div>
                    )}
                    <p className="text-xs text-muted font-body">{step.tip}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* What it tracks */}
          <h2 className="font-display font-bold text-lg text-text mb-4">What the extension tracks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
            {features.map((f) => (
              <Card key={f.title} className="flex gap-3">
                <span className="text-accent text-lg flex-shrink-0">{f.icon}</span>
                <div>
                  <h4 className="font-display font-semibold text-text text-sm mb-0.5">{f.title}</h4>
                  <p className="text-xs text-muted font-body">{f.desc}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Distraction domains */}
          <Card className="mb-6">
            <h3 className="font-display font-semibold text-text mb-3">Detected Distraction Sites</h3>
            <p className="text-xs text-muted font-body mb-3">
              These domains are automatically flagged as distractions and reduce your momentum score:
            </p>
            <div className="flex flex-wrap gap-2">
              {['twitter.com', 'x.com', 'reddit.com', 'youtube.com', 'facebook.com',
                'instagram.com', 'tiktok.com', 'netflix.com', 'twitch.tv', 'discord.com',
                'whatsapp.com', 'telegram.org', 'linkedin.com'].map((d) => (
                <span key={d} className="px-2 py-0.5 rounded bg-amber/10 border border-amber/20 text-amber text-xs font-mono">
                  {d}
                </span>
              ))}
            </div>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <h3 className="font-display font-semibold text-text mb-3">Troubleshooting</h3>
            <div className="space-y-3">
              {[
                {
                  q: 'Extension not connecting to the API?',
                  a: 'Make sure the backend is running on http://localhost:8000. Click the extension icon → Settings to update the API URL.',
                },
                {
                  q: 'Tabs not being logged?',
                  a: 'You need an active session. Start a session from the dashboard first, then the extension will begin tracking.',
                },
                {
                  q: 'Extension shows "Not signed in"?',
                  a: 'Sign in at http://localhost:5173/login. The extension reads your auth token from the web app automatically.',
                },
                {
                  q: 'Changes not reflecting after reload?',
                  a: 'Go to chrome://extensions and click the refresh icon on the NeuroFlow extension card.',
                },
              ].map((item) => (
                <div key={item.q} className="border-b border-[rgba(255,255,255,0.05)] pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-text font-body mb-1">{item.q}</p>
                  <p className="text-xs text-muted font-body">{item.a}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </PageShell>
  )
}
