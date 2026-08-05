/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SubscriptionState, SubscriptionStatus, SubscriptionPlan, BillingDetails } from '../types';
import { subscriptionService } from '../services/subscription';
import { supabaseService } from '../services/supabase';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  subscription: SubscriptionState | null;
  status: string;
  isTrial: boolean;
  isActive: boolean;
  isGracePeriod: boolean;
  isExpired: boolean;
  daysRemaining: number;
  trialDaysRemaining: number;
  graceDaysRemaining: number;
  isLoading: boolean;
  revalidate: () => Promise<void>;
  purchasePlan: (plan: SubscriptionPlan, amount: number, promoApplied?: string) => Promise<void>;
  toggleAutoRenew: (enabled: boolean) => Promise<void>;
  setSandboxExpired: (expired: boolean) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, business } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchState = async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const bizId = user.businessId;
      const state = await subscriptionService.getSubscriptionState(user.id, bizId);
      setSubscription(state);
    } catch (e) {
      console.error('Failed to resolve subscription state:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, [user]);

  // Network listening to trigger automated revalidation when internet connectivity resumes
  useEffect(() => {
    const handleOnline = () => {
      console.log('App is online. Triggering automatic license revalidation...');
      fetchState();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user]);

  const revalidate = async () => {
    setIsLoading(true);
    await fetchState();
  };

  const purchasePlan = async (plan: SubscriptionPlan, amount: number, promoApplied?: string) => {
    if (!user) throw new Error('Must be logged in to renew subscription.');
    setIsLoading(true);
    try {
      const activeBusinessId = business?.id || user.businessId || supabaseService.getCurrentUser()?.businessId;
      if (!activeBusinessId) {
        throw new Error('No authenticated business found. Please complete business setup before purchasing a plan.');
      }
      const details: BillingDetails = {
        plan,
        amount,
        currency: 'INR',
        gateway: 'RAZORPAY',
      };
      const renewedBy = user.fullName || user.email;
      const newState = await subscriptionService.processBillingPayment(user.id, details, renewedBy, 'MANUAL', promoApplied, activeBusinessId);
      setSubscription(newState);
    } catch (error) {
      console.error('Subscription processing failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAutoRenew = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      const activeBusinessId = business?.id || user?.businessId || supabaseService.getCurrentUser()?.businessId;
      if (!activeBusinessId) {
        throw new Error('No authenticated business found to update auto-renew settings.');
      }
      const newState = await subscriptionService.toggleAutoRenew(enabled, activeBusinessId);
      setSubscription(newState);
    } catch (error) {
      console.error('Failed to toggle auto renew:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetSandboxExpired = async (expired: boolean) => {
    subscriptionService.setSandboxExpired(expired);
    await revalidate();
  };

  const rawStatus = (subscription?.subscription_status || subscription?.status || '').toString().toLowerCase();
  const rawStatusUpper = (subscription?.status || '').toString().toUpperCase();

  const isTrial = rawStatus === 'trial' || rawStatusUpper === 'TRIAL';
  const isActive = rawStatus === 'active' || rawStatusUpper === 'ACTIVE';
  const isGracePeriod = rawStatus === 'grace_period' || rawStatusUpper === 'GRACE_PERIOD';
  const isExpired = rawStatus === 'expired' || rawStatusUpper === 'EXPIRED';

  // Effective expiry calculation
  const getEffectiveExpiryDate = (sub: SubscriptionState | null): Date | null => {
    if (!sub) return null;
    const dateStr = sub.expiryDate || sub.subscription_end || sub.trial_end_date;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const effectiveExpiry = getEffectiveExpiryDate(subscription);

  let daysRemaining = 0;
  if (effectiveExpiry) {
    const msDiff = effectiveExpiry.getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
  }

  // Compute trial days remaining
  let trialDaysRemaining = 0;
  if (subscription?.trial_end_date) {
    const end = new Date(subscription.trial_end_date).getTime();
    if (!isNaN(end)) {
      trialDaysRemaining = Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
    }
  } else if (isTrial && effectiveExpiry) {
    trialDaysRemaining = daysRemaining;
  }

  // Compute grace days remaining
  let graceDaysRemaining = 0;
  if (subscription?.gracePeriodExpiry || subscription?.offlineGracePeriodEnds) {
    const end = new Date(subscription.gracePeriodExpiry || subscription.offlineGracePeriodEnds!).getTime();
    if (!isNaN(end)) {
      graceDaysRemaining = Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
    }
  } else if (isGracePeriod && effectiveExpiry) {
    const graceDays = subscription?.graceDays || 2;
    const end = effectiveExpiry.getTime() + graceDays * 24 * 60 * 60 * 1000;
    graceDaysRemaining = Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        status: rawStatus,
        isTrial,
        isActive,
        isGracePeriod,
        isExpired,
        daysRemaining,
        trialDaysRemaining,
        graceDaysRemaining,
        isLoading,
        revalidate,
        purchasePlan,
        toggleAutoRenew: handleToggleAutoRenew,
        setSandboxExpired: handleSetSandboxExpired,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
