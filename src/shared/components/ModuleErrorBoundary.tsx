import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ModuleErrorBoundaryProps {
  children: ReactNode
}

interface ModuleErrorBoundaryState {
  hasError: boolean
  message: string
}

export class ModuleErrorBoundary extends Component<ModuleErrorBoundaryProps, ModuleErrorBoundaryState> {
  constructor(props: ModuleErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): ModuleErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Module failed to render.',
    }
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Intentionally silent in UI; avoid crashing full app on feature-specific errors.
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <section className="rounded-2xl border border-rose-300/30 bg-rose-400/10 p-6 text-zinc-100 backdrop-blur">
        <h3 className="text-lg font-semibold">Module Error</h3>
        <p className="mt-2 text-sm text-zinc-200">{this.state.message}</p>
        <button
          type="button"
          onClick={this.handleReset}
          className="mt-4 rounded-lg border border-white/20 px-3 py-2 text-xs"
        >
          Retry Module
        </button>
      </section>
    )
  }
}
