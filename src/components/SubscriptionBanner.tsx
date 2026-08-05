/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, RefreshCw, Zap, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useNavigate } from 'react-router-dom';

export const SubscriptionBanner: React.FC = () => {
  const { 
    subscription, 
    isTrial, 
    isGracePeriod, 
    isExpired, 
    trialDaysRemaining, 
    graceDaysRemaining, 
    revalidate 
  } = useSubscription();
  const navigate = useNavigate();

  if (!subscription) return null;

  // 1. Expired Banner
  if (isExpired) {
    return (
      <div className="bg-red-600 text-white px-4 py-2 text-xs font-medium flex flex-wrap items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0 text-amber-300 animate-bounce" />
          <span>
            <strong>Free Trial / Subscription Expired:</strong> Customer billing, catalog modifications, worker management, and operational settings are restricted. Reports remain available.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/subscription')}
            className="px-3 py-1 bg-white text-red-700 hover:bg-red-50 rounded text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
          >
            Subscribe / Renew Now
          </button>
        </div>
      </div>
    );
  }

  // 2. Grace Period Banner
  if (isGracePeriod) {
    return (
      <div className="bg-amber-500 text-white px-4 py-2 text-xs font-medium flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="shrink-0 animate-pulse" />
          <span>
            <strong>Subscription Expired – Grace Period Active:</strong> {graceDaysRemaining} day{graceDaysRemaining !== 1 ? 's' : ''} remaining. All features are currently active, but please renew soon to avoid service interruption.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => revalidate()}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={12} />
            Verify
          </button>
          <button
            onClick={() => navigate('/subscription')}
            className="px-3 py-1 bg-white text-amber-700 hover:bg-amber-50 rounded text-[11px] font-bold transition-colors cursor-pointer"
          >
            Renew Subscription
          </button>
        </div>
      </div>
    );
  }

  // 3. Free Trial Banner
  if (isTrial) {
    return (
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 text-xs font-medium flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-amber-300 shrink-0" />
          <span>
            <strong>7-Day Free Trial Active:</strong> {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining. Enjoy unlimited access to all ChhutaPOS features.
          </span>
        </div>
        <button
          onClick={() => navigate('/subscription')}
          className="px-3 py-1 bg-white text-emerald-700 hover:bg-emerald-50 rounded text-[11px] font-bold transition-colors cursor-pointer"
        >
          Subscribe Now
        </button>
      </div>
    );
  }

  // 4. Dynamic warning if active but expires in 5 days or less
  const expiryDate = new Date(subscription.expiryDate);
  const now = new Date();
  const msDiff = expiryDate.getTime() - now.getTime();
  const daysDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

  if (daysDiff > 0 && daysDiff <= 5) {
    return (
      <div className="bg-indigo-600 text-white px-4 py-2 text-xs font-medium flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Zap size={14} className="animate-bounce text-amber-300" />
          <span>
            Your premium subscription expires in <strong>{daysDiff} days</strong> ({expiryDate.toLocaleDateString()}).
          </span>
        </div>
        <button
          onClick={() => navigate('/subscription')}
          className="px-2.5 py-1 bg-white text-indigo-700 hover:bg-indigo-50 rounded text-[11px] font-bold transition-colors cursor-pointer"
        >
          Renew License
        </button>
      </div>
    );
  }

  return null;
};
