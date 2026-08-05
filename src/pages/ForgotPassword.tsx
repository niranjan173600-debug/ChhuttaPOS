/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabaseService } from '../services/supabase';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await supabaseService.resetPassword(email);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Email recovery failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 font-sans text-gray-900 dark:text-gray-150 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-150 dark:border-gray-800 p-6 md:p-8">
        
        {/* Back navigation */}
        <Link 
          to="/login" 
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 font-medium mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Login
        </Link>

        {isSubmitted ? (
          <div className="text-center py-4">
            <div className="inline-flex w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 items-center justify-center rounded-full mb-4">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-lg font-bold">Reset link sent!</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              We have dispatched a workspace recovery token to <strong>{email}</strong>. Please check your spam folder if it doesn't arrive in 2 minutes.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex w-full min-h-[48px] items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold tracking-tight">Recover Workspace</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Provide your registered business email and we will issue a secure workspace reset link to recover your ChhuttaPOS access.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@store.com"
                    className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[48px] inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Requesting link...' : 'Send Recovery Link'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
