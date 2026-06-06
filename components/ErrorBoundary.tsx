'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Replace with your logging service (Sentry, etc.) if you have one
    console.error(`[ErrorBoundary] ${this.props.sectionName ?? 'Section'} crashed:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
            {this.props.sectionName
              ? `${this.props.sectionName} failed to load`
              : 'Something went wrong'
            }
          </h3>
          <p className="text-xs text-red-600 dark:text-red-400 mb-4 text-center max-w-xs">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 text-xs font-medium text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}