import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Aurora } from '../components/ui/Aurora'
import { FloatingParticles } from '../components/ui/FloatingParticles'
import { Card3D } from '../components/ui/Card3D'
import { CountUp } from '../components/ui/CountUp'
import { Button } from '../components/ui/Button'
import { Abstract3DModel } from '../components/ui/Abstract3DModel'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'

// ─── Typing animation hook ────────────────────────────────────────────────────
function useTypewriter(words: string[], speed = 80, pause = 2000) {
  const [display, setDisplay] = useState('')
  const [wordIdx, setWordIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const word = words[wordIdx]
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(word.slice(0, charIdx + 1))
        if (charIdx + 1 === word.length) {
          setTimeout(() => setDeleting(true), pause)
        } else {
          setCharIdx(c => c + 1)
        }
      } else {
        setDisplay(word.slice(0, charIdx - 1))
        if (charIdx - 1 === 0) {
          setDeleting(false)
          setWordIdx(i => (i + 1) % words.length)
          setCharIdx(0)
        } else {
          setCharIdx(c => c - 1)
        }
      }
    }, deleting ? speed / 2 : speed)
    return () => clearTimeout(timeout)
  }, [charIdx, deleting, wordIdx, words, speed, pause])

  return display
}



// ─── Animated grid lines ──────────────────────────────────────────────────────
function GridLines() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(124,92,252,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,92,252,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }}
      />
    </div>
  )
}

// ─── Floating mockup card ─────────────────────────────────────────────────────
function FloatingMockup() {
  const y = useSpring(0, { stiffness: 60, damping: 15 })

  useEffect(() => {
    let t = 0
    const interval = setInterval(() => {
      t += 0.02
      y.set(Math.sin(t) * 12)
    }, 16)
    return () => clearInterval(interval)
  }, [y])

  return (
    <motion.div style={{ y }} className="relative">
      {/* Glow under card */}
      <div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-8 rounded-full"
        style={{ background: 'rgba(124,92,252,0.3)', filter: 'blur(20px)' }}
      />

      <Card3D intensity={6} className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-xl p-5 max-w-sm shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
          <span className="text-xs font-mono text-muted">Resume Packet</span>
          <span className="ml-auto text-xs font-mono text-muted">2h ago</span>
        </div>

        <h3 className="font-display font-bold text-text mb-1">API Layer Refactor</h3>

        <div className="bg-accent/8 border border-accent/20 rounded-lg p-2.5 mb-3">
          <p className="text-xs text-accent font-mono mb-0.5">Intent</p>
          <p className="text-xs text-text">Finish auth endpoints and write tests</p>
        </div>

        <div className="space-y-1.5 mb-4">
          {[
            { done: true, text: 'Write JWT middleware' },
            { done: false, text: 'Add refresh token endpoint' },
            { done: false, text: 'Write auth tests' },
          ].map((t, i) => (
            <motion.div
              key={t.text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className="flex items-center gap-2 text-xs"
            >
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${t.done ? 'bg-green border-green' : 'border-[rgba(255,255,255,0.15)]'}`}>
                {t.done && <span className="text-bg-base text-xs">✓</span>}
              </div>
              <span className={t.done ? 'line-through text-muted' : 'text-muted-2'}>{t.text}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="bg-accent rounded-lg py-2 text-center text-xs font-semibold text-white cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Continue Session →
        </motion.div>
      </Card3D>
    </motion.div>
  )
}

// ─── Feature card with 3D tilt ────────────────────────────────────────────────
const features = [
  { icon: '◈', title: 'Resume Packet', desc: 'Instantly restore your mental context — intent, notes, tabs, and tasks — exactly where you left off.', color: '#7c5cfc' },
  { icon: '◎', title: 'Memory Replay', desc: 'Replay your entire session timeline. See every decision, tab, and note in chronological order.', color: '#06b6d4' },
  { icon: '◇', title: 'Momentum Score', desc: 'A real-time score that measures your focus quality, task completion, and drift resistance.', color: '#22d3a0' },
  { icon: '⬡', title: 'Intent vs Outcome', desc: 'Set your intent before you start. Compare it to what you actually achieved.', color: '#c084fc' },
  { icon: '⚠', title: 'Focus Drift Alert', desc: "Get notified when you've been away from your flow for more than 8 minutes.", color: '#fbbf24' },
  { icon: '◉', title: 'Context Graph', desc: 'Visualize your cognitive load across deep work, shallow work, and distraction over time.', color: '#f87171' },
]

const testimonials = [
  { name: 'Alex R.', role: 'Senior Engineer', text: 'I used to lose 30 minutes every time I switched contexts. NeuroFlow fixed that completely.' },
  { name: 'Maya K.', role: 'Product Designer', text: 'The Resume Packet is like having a second brain. I can pick up exactly where I left off, every time.' },
  { name: 'Jordan T.', role: 'Indie Hacker', text: 'My momentum score went from 42 to 87 in two weeks. The drift alerts are a game changer.' },
]

const typewriterWords = ['your focus.', 'your context.', 'your momentum.', 'your flow state.']

export function Landing() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const typed = useTypewriter(typewriterWords)

  return (
    <div className="min-h-screen bg-bg-base text-text font-body overflow-x-hidden" style={{ position: 'relative' }}>
      {/* Background layers */}
      <Aurora />
      <FloatingParticles count={35} />
      <GridLines />

      {/* ── Nav ── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-[rgba(255,255,255,0.06)] bg-bg-base/70 backdrop-blur-xl"
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ duration: 0.4 }}
            className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center"
            style={{ boxShadow: '0 0 20px rgba(124,92,252,0.4)' }}
          >
            <span className="text-white font-display font-bold text-sm">N</span>
          </motion.div>
          <span className="font-display font-bold text-text">NeuroFlow</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link to="/signup">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Button size="sm" style={{ boxShadow: '0 0 20px rgba(124,92,252,0.3)' }}>
                Get Started
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center px-4 sm:px-8 pt-8 pb-20 overflow-hidden">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 text-center max-w-5xl mx-auto">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/8 text-accent text-xs font-mono mb-8"
            style={{ boxShadow: '0 0 30px rgba(124,92,252,0.15)' }}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-accent"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            Save/load system for the brain
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-display font-bold text-5xl sm:text-6xl md:text-8xl text-text leading-[1.05] mb-4"
          >
            We preserve
            <br />
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #7c5cfc 0%, #c084fc 50%, #06b6d4 100%)' }}
            >
              {typed}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-block w-0.5 h-[0.9em] bg-accent ml-1 align-middle"
              />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-base sm:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Every context switch costs <span className="text-amber font-semibold">23 minutes</span> of deep focus.
            NeuroFlow gives them back — preserving every session, note, and tab exactly where you left off.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex items-center justify-center gap-4 flex-wrap mb-16"
          >
            <Link to="/signup">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(124,92,252,0.5)' }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-3.5 rounded-lg bg-accent text-white font-semibold text-sm transition-all"
                style={{ boxShadow: '0 0 25px rgba(124,92,252,0.35)' }}
              >
                Start Free →
              </motion.button>
            </Link>
            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.03, borderColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-3.5 rounded-lg border border-[rgba(255,255,255,0.1)] text-muted-2 font-semibold text-sm hover:text-text transition-all"
              >
                Sign In
              </motion.button>
            </Link>
          </motion.div>

          {/* Floating mockup */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center"
          >
            <FloatingMockup />
          </motion.div>
        </motion.div>

        {/* 3D Background */}
        <div className="absolute inset-0 z-0">
          <ErrorBoundary>
            <Abstract3DModel />
          </ErrorBoundary>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="relative z-10 border-y border-[rgba(255,255,255,0.06)] py-12 sm:py-16 bg-bg-raised/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: 23, suffix: ' min', label: 'Avg context switch cost', color: '#fbbf24' },
            { value: 87, suffix: '%', label: 'Momentum improvement', color: '#22d3a0' },
            { value: 0, suffix: 's', label: 'Session resume time', color: '#7c5cfc' },
            { value: 100, suffix: '%', label: 'Context preserved', color: '#c084fc' },
          ].map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="font-display font-bold text-3xl sm:text-4xl mb-1" style={{ color: s.color }}>
                <CountUp to={s.value} suffix={s.suffix} duration={1.8} />
              </p>
              <p className="text-xs text-muted font-body">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-text mb-4">
            Built for{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #7c5cfc, #06b6d4)' }}>
              deep workers
            </span>
          </h2>
          <p className="text-muted text-sm sm:text-base max-w-xl mx-auto">
            Every feature is designed around one goal: eliminating the 23-minute context switch tax.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <Card3D
                intensity={10}
                className="h-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 hover:border-[rgba(255,255,255,0.12)] transition-colors"
              >
                {/* Colored top accent */}
                <div className="h-0.5 w-12 rounded-full mb-4" style={{ backgroundColor: f.color }} />
                <div className="text-2xl mb-3" style={{ color: f.color }}>{f.icon}</div>
                <h3 className="font-display font-semibold text-text mb-2">{f.title}</h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">{f.desc}</p>
              </Card3D>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How it works — 3D timeline ── */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-20">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display font-bold text-3xl sm:text-4xl text-text text-center mb-14"
        >
          How it works
        </motion.h2>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent/30 to-transparent" />

          {[
            { step: '01', title: 'Start a session', desc: 'Name your task, set your intent. The timer starts and context capture begins.', icon: '▶', color: '#7c5cfc' },
            { step: '02', title: 'Work with full context', desc: 'Add notes, tasks, and links as you go. The extension tracks every tab automatically.', icon: '◈', color: '#06b6d4' },
            { step: '03', title: 'Pause anytime', desc: 'Hit pause. Your entire context — notes, tasks, tabs, intent — is preserved instantly.', icon: '⏸', color: '#fbbf24' },
            { step: '04', title: 'Resume with zero friction', desc: 'Get a Resume Packet showing exactly where you left off. Back in flow in seconds, not minutes.', icon: '◎', color: '#22d3a0' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`relative flex items-start gap-6 mb-12 ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'} flex-row`}
            >
              {/* Step dot */}
              <div className="relative z-10 flex-shrink-0">
                <motion.div
                  whileInView={{ scale: [0.5, 1.2, 1] }}
                  transition={{ duration: 0.4, delay: i * 0.1 + 0.2 }}
                  viewport={{ once: true }}
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center font-display font-bold text-sm"
                  style={{ borderColor: item.color, color: item.color, backgroundColor: `${item.color}15`, boxShadow: `0 0 20px ${item.color}30` }}
                >
                  {item.icon}
                </motion.div>
              </div>

              <Card3D intensity={5} className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono" style={{ color: item.color }}>{item.step}</span>
                  <h3 className="font-display font-semibold text-text">{item.title}</h3>
                </div>
                <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
              </Card3D>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-16">
        <p className="text-center text-xs font-mono text-muted uppercase tracking-widest mb-10">
          What deep workers say
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <Card3D intensity={8} className="h-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
                {/* Stars */}
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="text-amber text-xs">★</span>
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-muted-2 leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-text">{t.name}</p>
                  <p className="text-xs text-muted font-mono">{t.role}</p>
                </div>
              </Card3D>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 max-w-2xl mx-auto px-4 sm:px-8 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* Glowing orb behind CTA */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(124,92,252,0.15), transparent)',
              filter: 'blur(40px)',
            }}
          />

          <h2 className="font-display font-bold text-3xl sm:text-5xl text-text mb-4 relative">
            Stop losing{' '}
            <span className="text-amber">23 minutes</span>
            <br />every context switch.
          </h2>
          <p className="text-muted font-body mb-10 text-sm sm:text-base relative">
            Join deep workers who never lose their place again.
          </p>
          <Link to="/signup" className="relative">
            <motion.button
              whileHover={{ scale: 1.06, boxShadow: '0 0 60px rgba(124,92,252,0.6)' }}
              whileTap={{ scale: 0.97 }}
              className="px-10 sm:px-14 py-4 rounded-xl bg-accent text-white font-display font-bold text-base sm:text-lg transition-all"
              style={{ boxShadow: '0 0 35px rgba(124,92,252,0.4)' }}
            >
              Start Free — No credit card
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-[rgba(255,255,255,0.06)] px-4 sm:px-8 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-accent flex items-center justify-center">
              <span className="text-white font-display font-bold text-xs">N</span>
            </div>
            <span className="text-xs text-muted font-body">NeuroFlow</span>
          </div>
          <p className="text-xs text-muted font-body text-center">
            We don't track tasks — we preserve human focus and memory.
          </p>
          <div className="flex gap-4">
            <Link to="/login" className="text-xs text-muted hover:text-text transition-colors">Sign In</Link>
            <Link to="/signup" className="text-xs text-muted hover:text-text transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
