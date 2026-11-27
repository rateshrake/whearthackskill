"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Client-side React Error Boundary preventing isolated widget/physics exceptions
 * from crashing the full VayuShield dashboard.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.error("[VayuShield UI Boundary]", error.message);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs font-mono space-y-1">
              <strong className="block text-sm text-white">
                {this.props.fallbackTitle ?? "Panel Render Recovery"}
              </strong>
              <span>
                An unexpected calculation or display error occurred in this module.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-xl bg-rose-800 hover:bg-rose-700 text-white text-xs font-mono font-bold self-start sm:self-auto"
          >
            Retry Panel
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
