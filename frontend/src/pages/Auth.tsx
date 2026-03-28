import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Card3D } from '../components/ui/Card3D'
import { Abstract3DModel } from '../components/ui/Abstract3DModel'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { useStore } from '../store'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const signupSchema = z.object({
  username: z.string().min(3, 'At least 3 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type LoginForm = z.infer<typeof loginSchema>
type SignupForm = z.infer<typeof signupSchema>

function getApiError(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string }; detail?: string } } }
  return e?.response?.data?.error?.message ?? e?.response?.data?.detail ?? 'Something went wrong'
}

export function Login() {
  const { login } = useStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h2 className="font-display font-bold text-2xl text-text mb-1">Welcome back</h2>
      <p className="text-sm text-muted font-body mb-8">Resume your flow where you left off.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex justify-end">
          <button type="button" className="text-xs text-accent hover:underline font-body">
            Forgot password?
          </button>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Sign In
        </Button>
      </form>

      <p className="text-sm text-muted font-body mt-6 text-center">
        No account?{' '}
        <Link to="/signup" className="text-accent hover:underline font-medium">Create one</Link>
      </p>
    </AuthLayout>
  )
}

export function Signup() {
  const { register: registerUser } = useStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupForm) => {
    setLoading(true)
    try {
      await registerUser(data.email, data.username, data.password)
      navigate('/dashboard')
      toast.success('Welcome to NeuroFlow!')
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h2 className="font-display font-bold text-2xl text-text mb-1">Create your account</h2>
      <p className="text-sm text-muted font-body mb-8">Start preserving your focus and memory.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Username"
          placeholder="yourname"
          autoComplete="username"
          error={errors.username?.message}
          {...register('username')}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={loading} className="w-full">
          Create Account
        </Button>
      </form>

      <p className="text-sm text-muted font-body mt-6 text-center">
        Already have an account?{' '}
        <Link to="/login" className="text-accent hover:underline font-medium">Sign in</Link>
      </p>
    </AuthLayout>
  )
}

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col lg:flex-row relative overflow-hidden">
      {/* Immersive 3D Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50 mix-blend-lighten">
        <ErrorBoundary>
          <Abstract3DModel />
        </ErrorBoundary>
      </div>

      <div className="hidden lg:flex flex-col justify-center px-12 xl:px-20 w-5/12 xl:w-1/2 bg-bg-raised/40 backdrop-blur-3xl border-r border-[rgba(255,255,255,0.05)] relative z-10 flex-shrink-0 pb-16">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-accent-3/10 pointer-events-none mix-blend-overlay" />

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-3 mb-16"
          >
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shadow-[0_0_30px_rgba(124,92,252,0.5)]">
              <span className="text-white font-display font-bold text-xl">N</span>
            </div>
            <span className="font-display font-bold text-2xl text-text tracking-tight">NeuroFlow</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display font-bold text-5xl xl:text-6xl text-gradient mb-6 leading-[1.1] animate-pulse-slow tracking-tight"
          >
            Your brain has a<br />context menu.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-text/80 font-body mb-12 leading-relaxed text-base xl:text-lg max-w-md"
          >
            We don't track tasks — we preserve human focus and memory. Step into a world built tailored for deep work.
          </motion.p>
          <div className="space-y-4">
            {[
              { icon: '◈', text: 'Resume any session instantly with full context' },
              { icon: '◎', text: 'Replay your memory timeline event by event' },
              { icon: '◇', text: 'Track your momentum score across sessions' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-accent text-lg">{item.icon}</span>
                <span className="text-sm text-muted-2 font-body">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:hidden flex items-center gap-2 px-6 py-5 border-b border-[rgba(255,255,255,0.05)] bg-bg-raised/40 backdrop-blur-xl relative z-10">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-[0_0_20px_rgba(124,92,252,0.4)]">
          <span className="text-white font-display font-bold text-sm">N</span>
        </div>
        <span className="font-display font-bold text-text text-lg">NeuroFlow</span>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10"
      >
        <Card3D intensity={5} className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {children}
        </Card3D>
      </motion.div>
    </div>
  )
}
