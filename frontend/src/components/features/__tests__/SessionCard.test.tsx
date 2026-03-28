import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SessionCard } from '../SessionCard'
import type { Session } from '../../../types'

const mockSession: Session = {
  id: 'test-id',
  user_id: 'user-id',
  title: 'Test Session',
  description: null,
  intent: 'Finish the feature',
  outcome: null,
  status: 'paused',
  color: '#7c5cfc',
  tags: ['backend', 'focus'],
  momentum_score: 72,
  focus_time_secs: 3600,
  drift_count: 1,
  started_at: new Date().toISOString(),
  paused_at: new Date().toISOString(),
  resumed_at: null,
  completed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const renderCard = (session = mockSession, onResume?: () => void) =>
  render(
    <MemoryRouter>
      <SessionCard session={session} onResume={onResume} />
    </MemoryRouter>
  )

describe('SessionCard', () => {
  it('renders session data', () => {
    renderCard()
    expect(screen.getByText('Test Session')).toBeInTheDocument()
    expect(screen.getByText('Finish the feature')).toBeInTheDocument()
  })

  it('shows correct status pill', () => {
    renderCard()
    expect(screen.getByText('paused')).toBeInTheDocument()
  })

  it('resume button visible for paused sessions', () => {
    renderCard()
    expect(screen.getByText('Resume →')).toBeInTheDocument()
  })

  it('does not show resume button for active sessions', () => {
    renderCard({ ...mockSession, status: 'active' })
    expect(screen.queryByText('Resume →')).not.toBeInTheDocument()
  })

  it('calls onResume on click', () => {
    const onResume = vi.fn()
    renderCard(mockSession, onResume)
    fireEvent.click(screen.getByText('Resume →'))
    expect(onResume).toHaveBeenCalledWith('test-id')
  })
})
