import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackRenderer?: (props: { error: Error; correlationId: string; reset: () => void }) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  correlationId: string;
}

/**
 * Global or domain-specific boundary to prevent application crashes
 */
export class ReactErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    correlationId: '',
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate correlation trace for React client crash reporting
    const correlationId = `react_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    return { hasError: true, error, correlationId };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Send telemetry to external observability layer (e.g., Sentry / Datadog)
    console.error('[React UI Exception Caught]', {
      error: error.message,
      stack: error.stack,
      errorInfo,
      correlationId: this.state.correlationId
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, correlationId: '' });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallbackRenderer) {
        return this.props.fallbackRenderer({
          error: this.state.error,
          correlationId: this.state.correlationId,
          reset: this.handleReset
        });
      }

      // Default premium error screen styles
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.text}>
              An unexpected application error prevented this page from displaying correctly.
            </p>
            <div style={styles.supportBox}>
              <span style={styles.label}>Support Ticket Reference:</span>
              <code style={styles.code}>{this.state.correlationId}</code>
            </div>
            <button onClick={this.handleReset} style={styles.button}>
              Reload Interface
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: '24px'
  },
  card: {
    maxWidth: '480px',
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    padding: '32px',
    textAlign: 'center' as const
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 12px 0'
  },
  text: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 24px 0',
    lineHeight: 1.5
  },
  supportBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center'
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '4px'
  },
  code: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#334155',
    fontWeight: 700
  },
  button: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  }
};
