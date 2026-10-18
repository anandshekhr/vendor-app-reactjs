import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: unknown }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Hook for an error-monitoring service (see README → Monitoring).
    console.error('UI error', error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: unknown }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto mt-16 max-w-md rounded-lg border border-line bg-surface p-6 text-center shadow-card">
        <AlertOctagon className="mx-auto h-8 w-8 text-red-600" aria-hidden />
        <h2 className="mt-3 text-base font-semibold">This page failed to load</h2>
        <p className="mt-1 text-sm text-ink-muted">An unexpected error occurred. Your data on the server is unaffected.</p>
        <Button className="mt-4" onClick={() => this.setState({ error: null })}>
          Reload section
        </Button>
      </div>
    );
  }
}
