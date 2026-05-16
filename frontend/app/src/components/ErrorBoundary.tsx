import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex h-[calc(100vh-3.75rem)] items-center justify-center bg-bg-ocean px-6">
        <div className="max-w-md rounded-2xl border border-border-subtle bg-bg-panel p-8 text-center shadow-panel">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-severity-critical-bg">
            <AlertTriangle className="size-6 text-status-alert" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            An unexpected error occurred. Try reloading the page.
          </p>
          {this.state.error && (
            <p className="mt-3 rounded-lg bg-bg-surface px-3 py-2 font-mono text-xs text-text-muted">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-accent hover:text-accent"
          >
            <RotateCcw className="size-4" />
            Reload
          </button>
        </div>
      </div>
    );
  }
}
