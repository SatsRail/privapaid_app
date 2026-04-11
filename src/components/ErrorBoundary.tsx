"use client";

import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

const MAX_RETRIES = 3;

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
    Sentry.captureException(error, {
      tags: { context: "ErrorBoundary" },
      extra: { componentStack: info.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const canRetry = this.state.retryCount < MAX_RETRIES;

      return (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-sm font-medium text-red-400">
            Something went wrong loading this section.
          </p>
          {canRetry ? (
            <button
              onClick={() =>
                this.setState((prev) => ({
                  hasError: false,
                  error: null,
                  retryCount: prev.retryCount + 1,
                }))
              }
              className="mt-3 rounded-md bg-red-500/20 px-4 py-2 text-xs font-medium text-red-300 hover:bg-red-500/30"
            >
              Try again ({MAX_RETRIES - this.state.retryCount} left)
            </button>
          ) : (
            <p className="mt-3 text-xs text-red-400/70">
              This section failed to load after {MAX_RETRIES} attempts. Please
              reload the page.
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
