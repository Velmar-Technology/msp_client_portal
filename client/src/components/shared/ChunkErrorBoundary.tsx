import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

export interface ChunkErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => ReactNode);
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ChunkErrorBoundary extends Component<ChunkErrorBoundaryProps, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("[ChunkErrorBoundary] Dynamic chunk rendering failed:", error, errorInfo);
    }
  }

  public resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  public handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback({
            error: this.state.error,
            resetErrorBoundary: this.resetErrorBoundary,
          });
        }
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="my-6 mx-auto w-full max-w-lg rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-foreground shadow-xs animate-fade-in"
        >
          <div className="flex items-start gap-3.5">
            <div className="rounded-lg bg-destructive/10 p-2 text-destructive shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                Unable to load section
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A required module failed to load. This can happen following a software update or network interruption.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={this.resetErrorBoundary}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry Section
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh Application
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
