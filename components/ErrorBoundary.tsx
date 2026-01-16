
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };
  public props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 cyber-grid opacity-20 animate-[grid-move_2s_linear_infinite]"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-black via-red-900/50 to-black opacity-70"></div>
            
            <div className="relative z-10 bg-surface-card/80 backdrop-blur-md border-2 border-red-500/50 p-8 max-w-lg w-full shadow-[0_0_50px_rgba(219,36,227,0.15)]">
                <h1 className="text-4xl font-black text-red-500 mb-4 italic tracking-tighter font-display">
                    SYSTEM ANOMALY DETECTED
                </h1>
                <p className="text-gray-400 mb-6 font-bold uppercase tracking-wide text-xs">
                    The visual engine encountered a critical error. Reboot is required.
                </p>
                <div className="bg-surface-elevated p-4 border border-surface-border-light mb-6 text-left w-full overflow-auto max-h-40">
                    <p className="text-red-400 text-[10px] font-mono mb-1">ERR_STACK_TRACE:</p>
                    <code className="text-gray-300 text-xs font-mono break-all">
                        {this.state.error?.message || 'Unknown Critical Error'}
                    </code>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-red-600 text-white font-black py-4 px-8 hover:bg-red-500 transition-colors uppercase italic tracking-widest text-sm shadow-[0_0_20px_rgba(239,68,68,0.4)] btn-sakuga border-red-400"
                >
                    <span className="skew-x-[10deg]">INITIATE REBOOT</span>
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
