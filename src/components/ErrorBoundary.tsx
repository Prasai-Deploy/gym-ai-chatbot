import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          color: 'white', background: '#09090b', height: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '12px', padding: '20px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', color: '#10b981', marginBottom: '8px' }}>Something went wrong</h2>
          <pre style={{
            color: '#f87171', fontSize: '12px', maxWidth: '600px',
            overflow: 'auto', background: '#18181b', padding: '16px',
            borderRadius: '8px', border: '1px solid #27272a', textAlign: 'left'
          }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <button 
            onClick={() => window.location.href = '/login'}
            style={{
              background: '#10b981', color: 'black', border: 'none',
              padding: '12px 24px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 'bold', marginTop: '16px'
            }}
          >
            Back to Login
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
