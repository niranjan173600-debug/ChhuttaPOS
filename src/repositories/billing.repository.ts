/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseRepository } from './base.repository';
import { SubscriptionPlan, SubscriptionStatus, SubscriptionState } from '../types';
import { GRACE_PERIOD_DAYS } from '../config/subscription';

export class BillingRepository extends BaseRepository<any> {
  constructor() {
    super('subscriptions');
  }

  /**
   * Retrieves the current subscription details stored locally.
   * If none exists, returns a default 7-day Free Trial state.
   */
  async getLocalSubscription(): Promise<SubscriptionState> {
    try {
      const record = await this.getById('current_subscription');
      const records = await this.getAll();
      const active = record || (records && records.length > 0 ? records[0] : null);

      if (active) {
        const now = new Date();
        const graceDaysValue = active.graceDays ?? GRACE_PERIOD_DAYS;

        let status: SubscriptionStatus | string = active.status;
        let subStatus: 'trial' | 'active' | 'grace_period' | 'expired' | string = active.subscription_status || 'trial';

        // 1. Paid Subscription Evaluation
        if (active.subscription_start && active.subscription_end) {
          const subEnd = new Date(active.subscription_end);
          const graceEnds = active.gracePeriodExpiry || active.offlineGracePeriodEnds
            ? new Date(active.gracePeriodExpiry || active.offlineGracePeriodEnds)
            : new Date(subEnd.getTime() + graceDaysValue * 24 * 60 * 60 * 1000);

          if (now <= subEnd) {
            status = SubscriptionStatus.ACTIVE;
            subStatus = 'active';
          } else if (now <= graceEnds) {
            status = SubscriptionStatus.GRACE_PERIOD;
            subStatus = 'grace_period';
          } else {
            status = SubscriptionStatus.EXPIRED;
            subStatus = 'expired';
          }
        } 
        // 2. Free Trial Evaluation
        else if (active.trial_start_date && active.trial_end_date) {
          const trialEnd = new Date(active.trial_end_date);
          if (now <= trialEnd) {
            status = SubscriptionStatus.TRIAL;
            subStatus = 'trial';
          } else {
            status = SubscriptionStatus.EXPIRED;
            subStatus = 'expired';
          }
        } 
        // 3. Fallback Evaluation
        else if (active.expiryDate) {
          const expiry = new Date(active.expiryDate);
          const graceEnds = active.offlineGracePeriodEnds
            ? new Date(active.offlineGracePeriodEnds)
            : new Date(expiry.getTime() + graceDaysValue * 24 * 60 * 60 * 1000);

          if (now <= expiry) {
            status = active.plan === 'FREE' ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE;
            subStatus = active.plan === 'FREE' ? 'trial' : 'active';
          } else if (now <= graceEnds) {
            status = SubscriptionStatus.GRACE_PERIOD;
            subStatus = 'grace_period';
          } else {
            status = SubscriptionStatus.EXPIRED;
            subStatus = 'expired';
          }
        }

        return {
          plan: active.plan as SubscriptionPlan,
          status,
          subscription_status: subStatus,
          trial_start_date: active.trial_start_date,
          trial_end_date: active.trial_end_date,
          subscription_start: active.subscription_start,
          subscription_end: active.subscription_end,
          expiryDate: active.expiryDate,
          lastVerificationTime: active.lastVerificationTime,
          verificationToken: active.verificationToken,
          offlineGracePeriodEnds: active.offlineGracePeriodEnds,
          gracePeriodExpiry: active.gracePeriodExpiry,
          autoRenewEnabled: active.autoRenewEnabled ?? false,
          nextBillingDate: active.nextBillingDate,
          baseDuration: active.baseDuration,
          bonusDays: active.bonusDays,
          graceDays: graceDaysValue,
        };
      }
    } catch (e) {
      console.warn('Failed to retrieve subscription locally. Defaulting to Trial.', e);
    }

    // Default 7-day trial for new business
    const now = new Date();
    const trialStartIso = now.toISOString();
    const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const trialEndIso = expiry.toISOString();
    const grace = new Date(expiry.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const defaultTrial: SubscriptionState = {
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.TRIAL,
      subscription_status: 'trial',
      trial_start_date: trialStartIso,
      trial_end_date: trialEndIso,
      subscription_start: undefined,
      subscription_end: undefined,
      expiryDate: trialEndIso,
      lastVerificationTime: trialStartIso,
      verificationToken: 'TRIAL_TOKEN',
      offlineGracePeriodEnds: grace.toISOString(),
      gracePeriodExpiry: grace.toISOString(),
      autoRenewEnabled: false,
      baseDuration: 7,
      bonusDays: 0,
      graceDays: GRACE_PERIOD_DAYS,
    };

    await this.saveSubscription(defaultTrial);
    return defaultTrial;
  }

  /**
   * Safely updates or saves the subscription details locally.
   */
  async saveSubscription(state: SubscriptionState): Promise<void> {
    const record = {
      id: 'current_subscription',
      plan: state.plan,
      status: state.status,
      subscription_status: state.subscription_status,
      trial_start_date: state.trial_start_date,
      trial_end_date: state.trial_end_date,
      subscription_start: state.subscription_start,
      subscription_end: state.subscription_end,
      expiryDate: state.expiryDate,
      lastVerificationTime: state.lastVerificationTime,
      verificationToken: state.verificationToken,
      offlineGracePeriodEnds: state.offlineGracePeriodEnds,
      gracePeriodExpiry: state.gracePeriodExpiry,
      autoRenewEnabled: state.autoRenewEnabled ?? false,
      nextBillingDate: state.nextBillingDate,
      baseDuration: state.baseDuration,
      bonusDays: state.bonusDays,
      graceDays: state.graceDays ?? GRACE_PERIOD_DAYS,
    };
    await this.save(record);
  }

  /**
   * Clears the local subscription table on logout.
   */
  async clearAll(): Promise<void> {
    try {
      await this.table.clear();
    } catch (e) {
      console.error('Failed to clear subscription repository:', e);
    }
  }
}

export const billingRepository = new BillingRepository();
