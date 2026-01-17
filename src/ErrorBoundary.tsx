import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CRITICAL_FAULT:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center font-mono">
          {/* Glassmorphism Panel */}
          <div className="bg-black/40 backdrop-blur-xl border border-red-500/50 p-8 rounded-sm shadow-[0_0_30px_rgba(255,0,0,0.1)]">
            <h1 className="text-red-500 font-black text-xl mb-4 uppercase italic animate-pulse">
              System_Critical_Fault
            </h1>
            <p className="text-zinc-600 text-[10px] mb-6 uppercase tracking-[0.3em]">
              The neural link has been severed. Check system logs.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="relative overflow-hidden px-6 py-3 bg-red-500/10 border border-red-500/50 text-red-500 font-black uppercase tracking-[0.3em] text-[10px] hover:bg-red-500 hover:text-black transition-all"
            >
              Reboot Terminal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
