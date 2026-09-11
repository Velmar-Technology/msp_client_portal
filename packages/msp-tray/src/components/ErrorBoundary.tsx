import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, FolderOpen } from 'lucide-react';
import { logClientEvent, openTrayLogDir } from '../services/tauri';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global React Error Boundary for the MSP Support Assistant tray application.
 * Catches unhandled render exceptions, logs the error and stack trace to the
 * persistent endpoint rolling log via Tauri IPC, and renders a localized recovery UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    const stack = `${error.stack ?? ''}\nComponentStack:\n${errorInfo.componentStack ?? ''}`;
    logClientEvent('error', `React Unhandled Exception: ${error.message}`, stack).catch(() => {});
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleOpenLogs = async (): Promise<void> => {
    await openTrayLogDir();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-[#070b14] text-slate-200 text-center select-none font-sans">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400 shadow-lg shadow-rose-500/10">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>

          <h2 className="text-base font-bold text-slate-100 mb-1 tracking-tight">
            Support Assistant Encountered an Error
          </h2>
          <p className="text-xs text-slate-400 max-w-[300px] mb-4 leading-relaxed">
            An unexpected error occurred in the desktop drawer. Diagnostic details have been recorded to the endpoint log.
          </p>

          <div className="w-full max-w-[340px] bg-[#0d1527] border border-[#1e2c4a] rounded-lg p-3 text-left mb-5">
            <div className="text-[11px] font-mono text-rose-300 break-words line-clamp-3">
              {this.state.error?.message || 'Unknown render exception'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={this.handleReload}
              className="px-3 py-1.5 rounded-lg bg-[#0084ff] hover:bg-[#0070da] text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-md shadow-[#0084ff]/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Drawer
            </button>
            <button
              onClick={this.handleOpenLogs}
              className="px-3 py-1.5 rounded-lg bg-[#141f36] hover:bg-[#1a2948] border border-[#233558] text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-all"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
              Open Logs
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
