import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ResumePacketModal } from '../ResumePacketModal'

// Mock the store
vi.mock('../../../store', () => ({
  useStore: vi.fn(() => ({
    activeModal: 'resume-packet',
    selectedSessionId: 'session-1',
    sessions: [{
      id: 'session-1',
      title: 'Test Session',
      intent: 'Build the feature',
      status: 'paused',
      color: '#7c5cfc',
      paused_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      momentum_score: 60,
      focus_time_secs: 1800,
      drift_count: 0,
    }],
    closeModal: vi.fn(),
    resumeSession: vi.fn(),
  })),
}))

// Mock API calls
vi.mock('../../../api/notes', () => ({
  notesApi: { list: vi.fn(() => Promise.resolve({ data: { data: [] } })) },
}))
vi.mock('../../../api/checklist', () => ({
  checklistApi: { list: vi.fn(() => Promise.resolve({ data: { data: [{ id: 't1', text: 'Write tests', done: false, priority: 0, position: 0, session_id: 'session-1', created_at: '', updated_at: '' }] } })) },
}))
vi.mock('../../../api/events', () => ({
  eventsApi: { list: vi.fn(() => Promise.resolve({ data: { data: [] } })) },
}))

describe('ResumePacketModal', () => {
  it('shows session intent', async () => {
    render(<MemoryRouter><ResumePacketModal /></MemoryRouter>)
    expect(await screen.findByText('Build the feature')).toBeInTheDocument()
  })

  it('lists pending tasks', async () => {
    render(<MemoryRouter><ResumePacketModal /></MemoryRouter>)
    expect(await screen.findByText('Write tests')).toBeInTheDocument()
  })

  it('shows continue session button', () => {
    render(<MemoryRouter><ResumePacketModal /></MemoryRouter>)
    expect(screen.getByText('Continue Session →')).toBeInTheDocument()
  })
})
