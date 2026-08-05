/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SubscriptionPlan, SubscriptionStatus, SubscriptionState, SubscriptionHistoryEntry } from '../types';
import { billingRepository } from '../repositories/billing.repository';
import { SUBSCRIPTION_PLANS_CONFIG, GRACE_PERIOD_DAYS, PLAN_DURATIONS, PLAN_PRICES, PROMO_CAMPAIGNS } from '../config/subscription';

export interface PromoCode {
  code: string;
  discountPercentage?: number;
  bonusDays?: number;
}

export class SubscriptionRenewalEngine {
  /**
   * Calculates the new expiry date based on the current state and purchased plan.
   * If current subscription is ACTIVE: New Expiry = Current Expiry + Duration
   * If current subscription has already EXPIRED: New Expiry = Today + Duration
   */
  static calculateNewExpiry(
    currentExpiryDateStr: string | null | undefined,
    durationDays: number,
    bonusDays = 0
  ): Date {
    const totalDaysToAdd = durationDays + bonusDays;
    const now = new Date();

    if (currentExpiryDateStr) {
      const currentExpiry = new Date(currentExpiryDateStr);
      // If active (expiry date is in the future), extend from the current expiry
      if (currentExpiry > now) {
        const newExpiry = new Date(currentExpiry);
        newExpiry.setDate(newExpiry.getDate() + totalDaysToAdd);
        return newExpiry;
      }
    }

    // Otherwise, start extending from today
    const newExpiry = new Date(now);
    newExpiry.setDate(newExpiry.getDate() + totalDaysToAdd);
    return newExpiry;
  }

  /**
   * Retrieves all subscription history records stored locally.
   */
  static getHistory(): SubscriptionHistoryEntry[] {
    try {
      const historyStr = localStorage.getItem('chhuta_subscription_history');
      return historyStr ? JSON.parse(historyStr) : [];
    } catch (e) {
      console.error('Failed to parse subscription history:', e);
      return [];
    }
  }

  /**
   * Adds a successful transaction to the subscription history log.
   */
  static addHistoryEntry(entry: SubscriptionHistoryEntry): void {
    try {
      const history = this.getHistory();
      const updated = [entry, ...history];
      localStorage.setItem('chhuta_subscription_history', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save subscription history:', e);
    }
  }

  /**
   * Executes the renewal process, updating the local state and adding a history record.
   */
  static async processRenewal(params: {
    userId: string;
    plan: SubscriptionPlan;
    amountPaid: number;
    razorpayPaymentId: string;
    renewedBy: string;
    promoCode?: string;
    referralCode?: string;
    extraBonusDays?: number;
    renewalType?: 'MANUAL' | 'AUTOMATIC';
  }): Promise<SubscriptionState> {
    const {
      plan,
      amountPaid,
      razorpayPaymentId,
      renewedBy,
      promoCode,
      extraBonusDays = 0,
      renewalType = 'MANUAL',
    } = params;

    // 1. Get current subscription state
    const currentSubscription = await billingRepository.getLocalSubscription();
    
    // 2. Resolve durations (base duration + default bonus days + extensible features like promo bonus days)
    const planConfig = SUBSCRIPTION_PLANS_CONFIG[plan] || SUBSCRIPTION_PLANS_CONFIG[SubscriptionPlan.MONTHLY];
    const baseDuration = planConfig.baseDuration;
    const defaultBonusDays = planConfig.bonusDays;
    
    // Extensible logic: Look up promocode for bonus days from centralized configuration
    let promoBonusDays = 0;
    if (promoCode) {
      const normalizedPromo = promoCode.trim().toUpperCase();
      const campaign = PROMO_CAMPAIGNS.find(c => c.code.trim().toUpperCase() === normalizedPromo && c.enabled);
      if (campaign) {
        promoBonusDays = campaign.bonusDays;
      }
    }

    const totalBonusDays = defaultBonusDays + promoBonusDays + extraBonusDays;
    const totalDuration = baseDuration + totalBonusDays;

    // 3. Compute new expiry date using clean date arithmetic
    const currentExpiryStr = currentSubscription?.expiryDate;
    const newExpiryDate = this.calculateNewExpiry(currentExpiryStr, baseDuration, totalBonusDays);

    // 4. Calculate new offline grace period ends (2 days grace limit)
    const newGraceEnds = new Date(newExpiryDate);
    newGraceEnds.setDate(newGraceEnds.getDate() + GRACE_PERIOD_DAYS);

    const isAutoRenewOn = currentSubscription?.autoRenewEnabled ?? false;
    let nextBillingDateStr: string | undefined = undefined;
    if (isAutoRenewOn) {
      const billing = new Date(newExpiryDate);
      billing.setDate(billing.getDate() - 1); // Renew 1 day before expiry
      nextBillingDateStr = billing.toISOString();
    }

    const nowIso = new Date().toISOString();
    // 5. Build updated subscription state
    const updatedState: SubscriptionState = {
      ...currentSubscription,
      plan,
      status: SubscriptionStatus.ACTIVE,
      subscription_status: 'active',
      subscription_start: nowIso,
      subscription_end: newExpiryDate.toISOString(),
      expiryDate: newExpiryDate.toISOString(),
      lastVerificationTime: nowIso,
      verificationToken: razorpayPaymentId || `v_tok_rzp_${Math.random().toString(36).substr(2, 10)}`,
      offlineGracePeriodEnds: newGraceEnds.toISOString(),
      gracePeriodExpiry: newGraceEnds.toISOString(),
      autoRenewEnabled: isAutoRenewOn,
      nextBillingDate: nextBillingDateStr,
      baseDuration,
      bonusDays: totalBonusDays,
      graceDays: GRACE_PERIOD_DAYS,
      updatedAt: nowIso,
    };

    // 6. Save updated state to local database repository
    await billingRepository.saveSubscription(updatedState);

    // 7. Store complete subscription history entry
    const historyEntry: SubscriptionHistoryEntry = {
      id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      planName: `${plan.replace('_', ' ')} Plan`,
      purchaseDate: new Date().toISOString(),
      expiryDate: newExpiryDate.toISOString(),
      duration: baseDuration, // Store base duration separately
      amountPaid,
      razorpayPaymentId,
      paymentStatus: 'SUCCESS',
      renewedBy,
      createdAt: new Date().toISOString(),
      promoApplied: promoCode,
      bonusDays: totalBonusDays > 0 ? totalBonusDays : undefined,
      renewalType,
    };

    this.addHistoryEntry(historyEntry);

    // Clean developmental expired state testing flags
    localStorage.removeItem('chhuta_test_expired');

    return updatedState;
  }

  /**
   * Toggles Auto Renew and saves changes locally
   */
  static async toggleAutoRenew(enabled: boolean): Promise<SubscriptionState> {
    const currentSubscription = await billingRepository.getLocalSubscription();
    
    let nextBillingDateStr: string | undefined = undefined;
    if (enabled && currentSubscription?.expiryDate) {
      const expiry = new Date(currentSubscription.expiryDate);
      const billing = new Date(expiry);
      billing.setDate(billing.getDate() - 1); // 1 day before expiry
      nextBillingDateStr = billing.toISOString();
    }

    const updatedState: SubscriptionState = {
      ...currentSubscription,
      autoRenewEnabled: enabled,
      nextBillingDate: nextBillingDateStr,
    };

    await billingRepository.saveSubscription(updatedState);
    return updatedState;
  }
}
