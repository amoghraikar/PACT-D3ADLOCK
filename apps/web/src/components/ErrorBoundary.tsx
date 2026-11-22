"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error("[PACT ErrorBoundary] Uncaught runtime exception:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-ink-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-ink-600 max-w-md mb-6">
            An unexpected error occurred while rendering this view. Our team has been notified.
          </p>
          {this.state.error && (
            <pre className="text-xs text-left bg-white border border-ice-200 p-3 rounded-lg max-w-lg overflow-x-auto text-red-600 mb-6 font-mono">
              {this.state.error.message}
            </pre>
          )}
          <Button
            variant="primary"
            size="default"
            onClick={this.handleReset}
            icon={<RotateCcw className="w-4 h-4" />}
          >
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
