import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useStore } from '../../store'
import { SESSION_COLORS } from '../../utils'

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  intent: z.string().min(1, 'Intent is required').max(1000),
  tags: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function NewSessionModal() {
  const { activeModal, closeModal, createSession } = useStore()
  const navigate = useNavigate()
  const [selectedColor, setSelectedColor] = useState(SESSION_COLORS[0])
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const session = await createSession({
        title: data.title,
        intent: data.intent,
        color: selectedColor,
        tags: data.tags
          ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      })
      reset()
      closeModal()
      navigate(`/sessions/${session.id}`)
      toast.success('Session started!')
    } catch {
      toast.error('Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={activeModal === 'new-session'} onClose={closeModal}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="font-display font-bold text-text text-xl">New Session</h2>
          <p className="text-sm text-muted font-body mt-1">
            Set your intent before you begin.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-2 font-body">
                Session Title <span className="text-red">*</span>
              </label>
              <input
                type="text"
                placeholder="What are you working on?"
                autoFocus
                className={`
                  w-full bg-bg-subtle border rounded-md px-3 py-2.5 text-sm text-text
                  placeholder:text-muted font-body outline-none transition-colors
                  focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                  ${errors.title ? 'border-red/50' : 'border-[rgba(255,255,255,0.07)]'}
                `}
                {...register('title')}
              />
              {errors.title && (
                <p className="text-xs text-red font-body">{errors.title.message}</p>
              )}
            </div>

            {/* Intent */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-2 font-body">
                Intent <span className="text-red">*</span>
              </label>
              <textarea
                placeholder="What do you want to achieve in this session?"
                rows={3}
                className={`
                  w-full bg-bg-subtle border rounded-md px-3 py-2.5 text-sm text-text
                  placeholder:text-muted font-body outline-none transition-colors resize-none
                  focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                  ${errors.intent ? 'border-red/50' : 'border-[rgba(255,255,255,0.07)]'}
                `}
                {...register('intent')}
              />
              {errors.intent && (
                <p className="text-xs text-red font-body">{errors.intent.message}</p>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-2 font-body">
                Tags
                <span className="text-muted ml-1 font-normal">(comma separated)</span>
              </label>
              <input
                type="text"
                placeholder="backend, focus, deep-work"
                className="w-full bg-bg-subtle border border-[rgba(255,255,255,0.07)] rounded-md px-3 py-2.5 text-sm text-text placeholder:text-muted font-body outline-none transition-colors focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                {...register('tags')}
              />
            </div>

            {/* Color picker */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-2 font-body">Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {SESSION_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    aria-label={`Select color ${color}`}
                    className="w-7 h-7 rounded-full transition-all hover:scale-110 focus:outline-none"
                    style={{
                      backgroundColor: color,
                      boxShadow:
                        selectedColor === color
                          ? `0 0 0 2px #111118, 0 0 0 4px ${color}`
                          : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { reset(); closeModal() }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Start Session →
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
