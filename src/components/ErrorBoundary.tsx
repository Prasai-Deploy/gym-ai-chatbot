import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[STRIVA Member Shell] ErrorBoundary caught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  private handleReturnHome = () => {
    this.setState({ hasError: false });
    window.location.href = '/v3/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050608] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#090B10] border border-white/10 shadow-2xl flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white font-display">Something went wrong</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                An unexpected system issue occurred. You can retry the current action or return to the main dashboard.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-colors"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReturnHome}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm shadow-orange-500/25"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
