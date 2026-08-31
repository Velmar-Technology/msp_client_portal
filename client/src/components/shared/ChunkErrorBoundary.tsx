import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <div className="w-full flex items-center justify-center p-6 min-h-60">
          <div
            role="alert"
            aria-live="assertive"
            className="w-full max-w-md rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-foreground shadow-xs animate-fade-in flex flex-col items-center text-center space-y-3"
          >
            <div className="rounded-full bg-destructive/10 p-3 text-destructive shrink-0 inline-flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 min-w-0">
              <h3 className="text-sm font-semibold text-foreground font-heading">
                Unable to load section
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                A required module failed to load. This can happen following a software update or network interruption.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                onClick={this.resetErrorBoundary}
                className="gap-1.5 h-8 px-3 text-xs font-semibold cursor-pointer shadow-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retry Section
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={this.handleReload}
                className="gap-1.5 h-8 px-3 text-xs font-semibold cursor-pointer shadow-xs bg-card hover:bg-muted"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
