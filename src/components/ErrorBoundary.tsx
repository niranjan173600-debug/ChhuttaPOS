/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled runtime exception caught by ChhuttaPOS Boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 font-sans text-gray-900 dark:text-gray-100">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-6">
              <AlertOctagon size={32} />
            </div>
            
            <h1 className="text-2xl font-semibold tracking-tight mb-2">
              Something went wrong
            </h1>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              ChhuttaPOS experienced a critical client runtime error. Your local database remains intact and safe.
            </p>

            {this.state.error && (
              <div className="text-left bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-6 font-mono text-xs overflow-auto max-h-32 text-red-600 dark:text-red-400 border border-gray-150 dark:border-gray-800">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors cursor-pointer gap-2"
            >
              <RotateCcw size={18} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
