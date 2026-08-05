/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SubscriptionPlan } from '../types';

export interface PlanConfig {
  name: string;
  baseDuration: number;
  price: number;
  bonusDays: number;
  totalDuration: number; // baseDuration + bonusDays
  razorpayPlanId: string;
}

// Validation function helper
const getRequiredEnvString = (key: string, fallback: string): string => {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    console.warn(`[SubscriptionConfig] Missing required environment variable: ${key}. Using fallback: "${fallback}"`);
    return fallback;
  }
  return String(value).replace(/^"(.*)"$/, '$1'); // Strip quotes if any
};

const getRequiredEnvNumber = (key: string, fallback: number): number => {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    console.warn(`[SubscriptionConfig] Missing required environment variable: ${key}. Using fallback: ${fallback}`);
    return fallback;
  }
  const parsed = Number(value);
  if (isNaN(parsed)) {
    console.error(`[SubscriptionConfig] Invalid number for environment variable ${key}: "${value}". Using fallback: ${fallback}`);
    return fallback;
  }
  return parsed;
};

// Helper to determine if an environment value is still a placeholder
export const isPlaceholderValue = (val?: string): boolean => {
  if (!val) return true;
  const v = val.trim();
  return (
    v === '' ||
    v.includes('YOUR_') ||
    v.includes('your_') ||
    v.includes('placeholder') ||
    v === 'rzp_test_placeholder'
  );
};

// Razorpay Environment Variables
export const RAZORPAY_KEY_ID = getRequiredEnvString('VITE_RAZORPAY_KEY_ID', 'rzp_test_placeholder');

export const RAZORPAY_WEEKLY_PLAN_ID = getRequiredEnvString('VITE_RAZORPAY_WEEKLY_PLAN_ID', 'YOUR_WEEKLY_PLAN_ID');
export const RAZORPAY_MONTHLY_PLAN_ID = getRequiredEnvString('VITE_RAZORPAY_MONTHLY_PLAN_ID', 'YOUR_MONTHLY_PLAN_ID');
export const RAZORPAY_THREE_MONTH_PLAN_ID = getRequiredEnvString('VITE_RAZORPAY_3MONTH_PLAN_ID', 'YOUR_3MONTH_PLAN_ID');
export const RAZORPAY_SIX_MONTH_PLAN_ID = getRequiredEnvString('VITE_RAZORPAY_6MONTH_PLAN_ID', 'YOUR_6MONTH_PLAN_ID');

// Raw environment variable reads
export const WEEKLY_PLAN_NAME = getRequiredEnvString('VITE_WEEKLY_PLAN_NAME', 'Weekly Plan');
export const WEEKLY_PRICE = getRequiredEnvNumber('VITE_WEEKLY_PRICE', 70);
export const WEEKLY_DURATION = getRequiredEnvNumber('VITE_WEEKLY_DURATION', 7);
export const WEEKLY_BONUS_DAYS = getRequiredEnvNumber('VITE_WEEKLY_BONUS_DAYS', 0);

export const MONTHLY_PLAN_NAME = getRequiredEnvString('VITE_MONTHLY_PLAN_NAME', 'Monthly Plan');
export const MONTHLY_PRICE = getRequiredEnvNumber('VITE_MONTHLY_PRICE', 249);
export const MONTHLY_DURATION = getRequiredEnvNumber('VITE_MONTHLY_DURATION', 30);
export const MONTHLY_BONUS_DAYS = getRequiredEnvNumber('VITE_MONTHLY_BONUS_DAYS', 0);

export const THREE_MONTH_PLAN_NAME = getRequiredEnvString('VITE_THREE_MONTH_PLAN_NAME', '3 Months Plan');
export const THREE_MONTH_PRICE = getRequiredEnvNumber('VITE_THREE_MONTH_PRICE', 749);
export const THREE_MONTH_DURATION = getRequiredEnvNumber('VITE_THREE_MONTH_DURATION', 90);
export const THREE_MONTH_BONUS_DAYS = getRequiredEnvNumber('VITE_THREE_MONTH_BONUS_DAYS', 15);

export const SIX_MONTH_PLAN_NAME = getRequiredEnvString('VITE_SIX_MONTH_PLAN_NAME', '6 Months Plan');
export const SIX_MONTH_PRICE = getRequiredEnvNumber('VITE_SIX_MONTH_PRICE', 1499);
export const SIX_MONTH_DURATION = getRequiredEnvNumber('VITE_SIX_MONTH_DURATION', 180);
export const SIX_MONTH_BONUS_DAYS = getRequiredEnvNumber('VITE_SIX_MONTH_BONUS_DAYS', 30);

export const GRACE_PERIOD_DAYS = getRequiredEnvNumber('VITE_GRACE_PERIOD_DAYS', 2);
export const DEFAULT_CURRENCY = getRequiredEnvString('VITE_DEFAULT_CURRENCY', 'INR');
export const SUPPORT_EMAIL = getRequiredEnvString('VITE_SUPPORT_EMAIL', 'chhuttapos@gmail.com');
export const SUPPORT_WHATSAPP = getRequiredEnvString('VITE_SUPPORT_WHATSAPP', '9449963055');

// Main plans configuration map
export const SUBSCRIPTION_PLANS_CONFIG: Record<SubscriptionPlan, PlanConfig> = {
  [SubscriptionPlan.FREE]: {
    name: 'Free Trial',
    baseDuration: 7,
    price: 0,
    bonusDays: 0,
    totalDuration: 7,
    razorpayPlanId: '',
  },
  [SubscriptionPlan.WEEKLY]: {
    name: WEEKLY_PLAN_NAME,
    baseDuration: WEEKLY_DURATION,
    price: WEEKLY_PRICE,
    bonusDays: WEEKLY_BONUS_DAYS,
    totalDuration: WEEKLY_DURATION + WEEKLY_BONUS_DAYS,
    razorpayPlanId: RAZORPAY_WEEKLY_PLAN_ID,
  },
  [SubscriptionPlan.MONTHLY]: {
    name: MONTHLY_PLAN_NAME,
    baseDuration: MONTHLY_DURATION,
    price: MONTHLY_PRICE,
    bonusDays: MONTHLY_BONUS_DAYS,
    totalDuration: MONTHLY_DURATION + MONTHLY_BONUS_DAYS,
    razorpayPlanId: RAZORPAY_MONTHLY_PLAN_ID,
  },
  [SubscriptionPlan.THREE_MONTHS]: {
    name: THREE_MONTH_PLAN_NAME,
    baseDuration: THREE_MONTH_DURATION,
    price: THREE_MONTH_PRICE,
    bonusDays: THREE_MONTH_BONUS_DAYS,
    totalDuration: THREE_MONTH_DURATION + THREE_MONTH_BONUS_DAYS,
    razorpayPlanId: RAZORPAY_THREE_MONTH_PLAN_ID,
  },
  [SubscriptionPlan.SIX_MONTHS]: {
    name: SIX_MONTH_PLAN_NAME,
    baseDuration: SIX_MONTH_DURATION,
    price: SIX_MONTH_PRICE,
    bonusDays: SIX_MONTH_BONUS_DAYS,
    totalDuration: SIX_MONTH_DURATION + SIX_MONTH_BONUS_DAYS,
    razorpayPlanId: RAZORPAY_SIX_MONTH_PLAN_ID,
  },
};

// Compatibility/Helper records for simple queries
export const PLAN_DURATIONS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: SUBSCRIPTION_PLANS_CONFIG[SubscriptionPlan.FREE].baseDuration,
  [SubscriptionPlan.WEEKLY]: SUBSCRIPTION_PLANS_CONFIG[SubscriptionPlan.WEEKLY].baseDuration,
  [SubscriptionPlan.MONTHLY]: SUBSCRIPTION_PLANS_CONFIG[SubscriptionPlan.MONTHLY].baseDuration,
  [SubscriptionPlan.THREE_MONTHS]: SUBSCRIPTION_PLANS_CONFIG[SubscriptionPlan.THREE_MONTHS].baseDuration,
  [SubscriptionPlan.SIX_MONTHS]: SUBSCRIPTION_PLANS_CONFIG[SubscriptionPlan.SIX_MONTHS].baseDuration,
};

export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: SUBSCRIPTION_PLANS_CONFIG[SubscriptionPlan.FREE].price,
  [SubscriptionPlan.WEEKLY]: SUBSCRIPTION_PLANS_CONFIG[SubscriptionPlan.WEEKLY].price,
  [SubscriptionPlan.MONTHLY]: SUBSCRIPTION_PLANS_CONFIG[SubscriptionPlan.MONTHLY].price,
  [SubscriptionPlan.THREE_MONTHS]: SUBSCRIPTION_PLANS_CONFIG[SubscriptionPlan.THREE_MONTHS].price,
  [SubscriptionPlan.SIX_MONTHS]: SUBSCRIPTION_PLANS_CONFIG[SubscriptionPlan.SIX_MONTHS].price,
};

export const CURRENCY_SYMBOL = getRequiredEnvString('VITE_CURRENCY_SYMBOL', '₹');

export const formatPrice = (amount: number): string => {
  return `${CURRENCY_SYMBOL}${amount}`;
};

// -------------------------------------------------------------
// CENTRALIZED PROMOTIONAL CONFIGURATION (Req 1-5, Promo Refactoring)
// -------------------------------------------------------------
export const DEFAULT_PROMO_CODE = getRequiredEnvString('VITE_DEFAULT_PROMO_CODE', 'FESTIVAL12');
export const DEFAULT_PROMO_DISCOUNT_PERCENT = getRequiredEnvNumber('VITE_DEFAULT_PROMO_DISCOUNT_PERCENT', 12);
export const DEFAULT_PROMO_TITLE = getRequiredEnvString('VITE_DEFAULT_PROMO_TITLE', 'Festival Offer');
export const DEFAULT_PROMO_DESCRIPTION = getRequiredEnvString('VITE_DEFAULT_PROMO_DESCRIPTION', 'Get 12% off on manual renewals.');
export const DEFAULT_PROMO_ENABLED = getRequiredEnvString('VITE_DEFAULT_PROMO_ENABLED', 'true') === 'true';

export interface PromoCampaign {
  code: string;
  discountPercent: number;
  bonusDays: number;
  title: string;
  description: string;
  enabled: boolean;
}

export const PROMO_CAMPAIGNS: PromoCampaign[] = [
  {
    code: DEFAULT_PROMO_CODE,
    discountPercent: DEFAULT_PROMO_DISCOUNT_PERCENT,
    bonusDays: 0,
    title: DEFAULT_PROMO_TITLE,
    description: DEFAULT_PROMO_DESCRIPTION,
    enabled: DEFAULT_PROMO_ENABLED,
  },
  {
    code: 'WELCOME5',
    discountPercent: 0,
    bonusDays: 5,
    title: 'Welcome Bonus',
    description: 'Get 5 additional bonus days on manual renewals.',
    enabled: true,
  },
  {
    code: 'BONUS10',
    discountPercent: 0,
    bonusDays: 10,
    title: 'Streak Saver Bonus',
    description: 'Get 10 extra bonus days on manual renewals.',
    enabled: true,
  }
];

// -------------------------------------------------------------
// SOCIAL CHANNELS FOR NON-ACTIVE CALL-TO-ACTION (Req 11, CTA Follow Section)
// -------------------------------------------------------------
export const INSTAGRAM_URL = getRequiredEnvString('VITE_INSTAGRAM_URL', 'https://instagram.com/chhuttapos');
export const FACEBOOK_URL = getRequiredEnvString('VITE_FACEBOOK_URL', 'https://facebook.com/chhuttapos');
export const YOUTUBE_URL = getRequiredEnvString('VITE_YOUTUBE_URL', 'https://youtube.com/chhuttapos');
export const WHATSAPP_CHANNEL_URL = getRequiredEnvString('VITE_WHATSAPP_CHANNEL_URL', 'https://whatsapp.com/channel/chhuttapos');


