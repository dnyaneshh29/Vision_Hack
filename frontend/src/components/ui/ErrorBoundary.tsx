import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('3D Canvas error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            color: '#f87171',
            padding: '1rem',
            background: 'rgba(0,0,0,0.5)',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          <strong>3D render failed:</strong> {this.state.error?.message}
        </div>
      )
    }
    return this.props.children
  }
}
