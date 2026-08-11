/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Mail, 
  Lock, 
  ShieldAlert, 
  Key, 
  User, 
  Briefcase, 
  Users, 
  ArrowLeft, 
  Chrome, 
  Sparkles, 
  Building2,
  CheckCircle2
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login, staffLogin, loginWithGoogle, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect to home/dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Intercept browser back button to prevent reopening the dashboard
  useEffect(() => {
    if (!isAuthenticated) {
      // Push current login state into history to absorb the back action
      window.history.pushState(null, '', window.location.href);
      
      const handlePopState = () => {
        // Prevent going back by pushing login state again
        window.history.pushState(null, '', window.location.href);
      };
      
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isAuthenticated]);

  // Landing view states: 'landing' | 'owner' | 'staff'
  const [activeTab, setActiveTab] = useState<'landing' | 'owner' | 'staff'>('landing');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [staffBusinessId, setStaffBusinessId] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStaffLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await staffLogin(staffBusinessId, staffUsername, staffPassword);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Staff authentication failed. Please check business ID or credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Google Authentication failed.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 relative">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-xl bg-indigo-600 items-center justify-center text-white font-bold text-2xl shadow-md shadow-indigo-500/10 mb-3">
            C
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Chhutta<span className="text-indigo-600 dark:text-indigo-400">POS</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Offline-First Store & Business Console
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {location.state?.message && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-500" />
            <span>{location.state.message}</span>
          </div>
        )}

        {/* 1. LANDING TAB */}
        {activeTab === 'landing' && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Welcome to ChhuttaPOS</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Please select your access profile to enter the POS console</p>
            </div>

            <div className="space-y-3">
              {/* Owner Option */}
              <button
                onClick={() => setActiveTab('owner')}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all text-left flex items-start gap-3.5 cursor-pointer group"
                id="landing-owner-login-btn"
              >
                <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Briefcase size={18} />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Business Owner Login
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                    Manage registers, billing products, subscription licenses, and view analytics reports.
                  </p>
                </div>
              </button>

              {/* Staff Option */}
              <button
                onClick={() => setActiveTab('staff')}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all text-left flex items-start gap-3.5 cursor-pointer group"
                id="landing-staff-login-btn"
              >
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Users size={18} />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Staff Employee Login
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                    Access terminal screens, handle checkout POS bills, and sync transactions in real-time.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-3">
              <Link
                to="/signup"
                className="w-full min-h-[44px] inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-colors"
                id="landing-register-business-link"
              >
                Register Business Workspace
              </Link>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Register once, configure terminal and run offline forever.
              </p>
            </div>
          </div>
        )}

        {/* 2. OWNER LOGIN TAB */}
        {activeTab === 'owner' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setActiveTab('landing')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded font-bold uppercase">
                Owner Access
              </span>
            </div>

            {/* Google Authentication Section */}
            <div className="space-y-3">
              <button
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                id="owner-google-login-btn"
              >
                <Chrome size={16} className="text-red-500" />
                {isGoogleLoading ? 'Connecting Google Account...' : 'Continue with Google'}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
                <span className="flex-shrink mx-4 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">or email login</span>
                <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
              </div>
            </div>

            <form onSubmit={handleOwnerLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@store.com"
                    className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-500/10"
                id="owner-email-submit-btn"
              >
                {isSubmitting ? 'Authenticating Owner...' : 'Secure Owner Sign In'}
              </button>
            </form>
          </div>
        )}

        {/* 3. STAFF LOGIN TAB */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setActiveTab('landing')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">
                Staff Access
              </span>
            </div>

            <form onSubmit={handleStaffLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Business ID
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                    <Building2 size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={staffBusinessId}
                    onChange={(e) => setStaffBusinessId(e.target.value.toUpperCase())}
                    placeholder="e.g. CP-8X2K9Q"
                    className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all uppercase font-mono"
                  />
                </div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                  Provided by your business owner upon registration.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Username or Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    placeholder="e.g. manager_staff or staff_name"
                    className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-500/10"
                id="staff-submit-btn"
              >
                {isSubmitting ? 'Authenticating Counter...' : 'Secure Staff Login'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
