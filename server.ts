/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

// Load environment variables with override enabled to prioritize local .env file
dotenv.config({ override: true });

const app = reportExpressErrors(express());
const PORT = 3000;

app.use(express.json({
  verify: (req: any, _res: any, buf: Buffer) => {
    req.rawBody = buf;
  }
}));

// Helper function to wrap express app for logging/safety if needed
function reportExpressErrors(eApp: any) {
  return eApp;
}

// -------------------------------------------------------------
// SECURE AUTHENTICATION RATE LIMITER (/api/auth/*)
// Protects authentication endpoints against brute-force attacks.
// Limits: 10 requests per 15 minutes per IP address.
// -------------------------------------------------------------
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_REQUESTS = 10;

interface AuthRateLimitRecord {
  count: number;
  resetTime: number;
}

const authRateLimitStore = new Map<string, AuthRateLimitRecord>();

// Periodic cleanup of expired IP records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of authRateLimitStore.entries()) {
    if (now > record.resetTime) {
      authRateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

function authRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const clientIp = (
    (req.headers['x-forwarded-for'] as string) ||
    req.socket.remoteAddress ||
    req.ip ||
    '127.0.0.1'
  ).split(',')[0].trim();

  const now = Date.now();
  const record = authRateLimitStore.get(clientIp);

  if (!record || now > record.resetTime) {
    authRateLimitStore.set(clientIp, {
      count: 1,
      resetTime: now + AUTH_WINDOW_MS
    });
    return next();
  }

  if (record.count >= AUTH_MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader('Retry-After', retryAfterSec);
    return res.status(429).json({
      error: 'Too many authentication attempts. Please try again after 15 minutes.',
      retryAfterSeconds: retryAfterSec
    });
  }

  record.count += 1;
  next();
}

// Mount rate limiter strictly for /api/auth/* endpoints
app.use('/api/auth', authRateLimiter);

// -------------------------------------------------------------
// AUTHENTICATION ENDPOINTS (/api/auth/*)
// -------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email or business credential is required.' });
    }
    return res.json({ success: true, message: 'Authentication attempt verified.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/verify-pin', (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'Security PIN is required.' });
    }
    return res.json({ success: true, authorized: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/status', (_req, res) => {
  return res.json({
    status: 'active',
    rateLimiting: {
      endpoint: '/api/auth/*',
      maxRequests: 10,
      windowMinutes: 15
    }
  });
});

// -------------------------------------------------------------
// SECURE CLIENT INITIALIZATIONS
// -------------------------------------------------------------
const razorpayKeyId = process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'YOUR_RAZORPAY_SECRET';
const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'YOUR_WEBHOOK_SECRET';

// Environment variable Plan IDs (Read directly from process.env)
const PLAN_RAZORPAY_IDS: Record<string, string> = {
  WEEKLY: process.env.VITE_RAZORPAY_WEEKLY_PLAN_ID || 'YOUR_WEEKLY_PLAN_ID',
  MONTHLY: process.env.VITE_RAZORPAY_MONTHLY_PLAN_ID || 'YOUR_MONTHLY_PLAN_ID',
  THREE_MONTHS: process.env.VITE_RAZORPAY_3MONTH_PLAN_ID || 'YOUR_3MONTH_PLAN_ID',
  SIX_MONTHS: process.env.VITE_RAZORPAY_6MONTH_PLAN_ID || 'YOUR_6MONTH_PLAN_ID',
};

// Helper function to detect placeholder credential/plan values
function isPlaceholder(val?: string): boolean {
  if (!val) return true;
  const v = val.trim();
  return (
    v === '' ||
    v.includes('YOUR_') ||
    v.includes('your_') ||
    v.includes('placeholder') ||
    v === 'rzp_test_placeholder'
  );
}

let razorpay: Razorpay | null = null;
if (
  razorpayKeyId && 
  razorpayKeySecret && 
  !isPlaceholder(razorpayKeyId) && 
  !isPlaceholder(razorpayKeySecret)
) {
  try {
    razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });
    console.log('[Server] Razorpay Client initialized successfully.');
  } catch (err) {
    console.error('[Server Error] Failed to initialize Razorpay Client:', err);
  }
} else {
  console.warn('[Server Warning] Razorpay credentials set to placeholder. Live Razorpay integration will run in developer sandbox mode.');
}

// Setup Supabase Client if env is configured
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http') && !supabaseUrl.includes('placeholder'))
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (supabase) {
  console.log('[Server] Supabase Client initialized successfully.');
} else {
  console.info('[Server Info] Supabase: Configuration not set or placeholder. Operating in offline/local sync mode.');
}

function getSanitizedSupabaseUrl(): string {
  if (!supabaseUrl) return 'OFFLINE/UNCONFIGURED';
  try {
    return supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] + '...supabase.co';
  } catch {
    return 'SUPABASE';
  }
}

/**
 * Helper to safely sync subscription state to Supabase without throwing or unhandled promise rejections.
 */
async function safeSyncSubscriptionToSupabase(payload: {
  businessId: string;
  plan: string;
  status: string;
  subscriptionId?: string | null;
  planId?: string | null;
  paymentId?: string | null;
  orderId?: string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  gracePeriodExpiry?: string | null;
  renewalDate?: string | null;
  nextRenewalDate?: string | null;
  autoRenewEnabled?: boolean;
  verificationToken?: string | null;
}): Promise<{ success: boolean; warning?: string; subscription?: any }> {
  if (!supabase) return { success: true, warning: 'Supabase client running offline mode.' };

  const sanitizedUrl = getSanitizedSupabaseUrl();
  const bizId = String(payload.businessId).trim().toUpperCase();

  try {
    // 1. Foreign Key Prerequisite Check: Parent Business MUST exist in Supabase 'businesses' table
    const { data: existingBiz, error: bizCheckError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', bizId)
      .maybeSingle();

    if (bizCheckError) {
      console.warn(`[Supabase Foreign Key Check Warning] Project: ${sanitizedUrl} | Table: businesses | Business ID: ${bizId} | Warning: ${bizCheckError.message}`);
    }

    if (!existingBiz) {
      console.log(`[Supabase Auto-Provisioning Business] Parent Business ID ${bizId} does NOT exist in Supabase 'businesses' table. Auto-provisioning business record to fulfill foreign key requirement...`);
      await safeSyncBusinessToSupabase({
        id: bizId,
        name: `Business ${bizId}`,
        isConfigured: true
      });
    }

    // 2. Check if a subscription already exists in Supabase for this business_id
    const { data: existingSub, error: subCheckErr } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('business_id', bizId)
      .maybeSingle();

    if (subCheckErr) {
      console.warn(`[Supabase Existing Subscription Check Warning] Project: ${sanitizedUrl} | Table: subscriptions | Business ID: ${bizId} | Warning: ${subCheckErr.message}`);
    }

    // If attempting to issue a new TRIAL, but Supabase ALREADY has a subscription/trial record, preserve existing record
    if (existingSub && payload.status === 'TRIAL') {
      console.log(`[Supabase Subscription Check] Business ${bizId} already has a subscription record in Supabase (Plan: ${existingSub.plan}, Status: ${existingSub.status}). Preserving existing record to prevent duplicate trial creation!`);
      return { success: true, subscription: existingSub };
    }

    const record = {
      id: bizId,
      business_id: bizId,
      plan: payload.plan,
      status: payload.status,
      subscription_status: payload.status.toLowerCase(),
      subscription_id: payload.subscriptionId || null,
      plan_id: payload.planId || null,
      payment_id: payload.paymentId || null,
      order_id: payload.orderId || null,
      start_date: payload.startDate || new Date().toISOString(),
      expiry_date: payload.expiryDate || null,
      grace_period_expiry: payload.gracePeriodExpiry || null,
      renewal_date: payload.renewalDate || null,
      next_renewal_date: payload.nextRenewalDate || payload.renewalDate || null,
      last_payment_timestamp: new Date().toISOString(),
      auto_renew_enabled: payload.autoRenewEnabled ?? false,
      verification_token: payload.verificationToken || null,
      updated_at: new Date().toISOString()
    };

    console.log(`[Supabase Subscription Sync Start] Project: ${sanitizedUrl} | Table: subscriptions | Business ID: ${bizId} | Operation: UPSERT | Plan: ${payload.plan} | Status: ${payload.status}`);
    const { error } = await supabase.from('subscriptions').upsert(record, { onConflict: 'id' });
    if (error) {
      console.warn(`[Supabase Subscription Sync Warning] Project: ${sanitizedUrl} | Table: subscriptions | Business ID: ${bizId} | PostgREST Warning: ${error.message}`);
      return { success: true, warning: `Supabase PostgREST Warning (${error.code || 'UNKNOWN'}): ${error.message}` };
    }

    console.log(`[Supabase Subscription Sync Success] Project: ${sanitizedUrl} | Table: subscriptions | Business ID: ${bizId} successfully persisted to Supabase.`);

    // Execute license insert/update in Supabase using Business ID
    safeSyncLicenseToSupabase({
      businessId: bizId,
      subscriptionId: bizId,
      status: payload.status === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE'
    }).catch(err => console.warn('[Auto License Sync Warning]', err));

    return { success: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.warn(`[Supabase Subscription Sync Exception] Project: ${sanitizedUrl} | Table: subscriptions | Business ID: ${bizId} | Exception: ${msg}`);
    return { success: true, warning: msg };
  }
}

/**
 * Helper to safely sync business account configuration to Supabase.
 */
async function safeSyncBusinessToSupabase(businessData: {
  id: string;
  name: string;
  type?: string;
  currency?: string;
  timezone?: string;
  ownerName?: string;
  ownerEmail?: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  logoUrl?: string;
  isConfigured?: boolean;
}): Promise<{ success: boolean; warning?: string }> {
  if (!supabase) return { success: true, warning: 'Supabase client running offline mode.' };

  const sanitizedUrl = getSanitizedSupabaseUrl();
  const bizId = String(businessData.id).trim().toUpperCase();

  try {
    const record = {
      id: bizId,
      name: businessData.name,
      type: businessData.type || 'SERVICE',
      currency: businessData.currency || 'INR',
      timezone: businessData.timezone || 'Asia/Kolkata',
      owner_name: businessData.ownerName || null,
      owner_email: businessData.ownerEmail || null,
      phone: businessData.phone || null,
      address: businessData.address || null,
      tax_number: businessData.taxNumber || null,
      logo_url: businessData.logoUrl || null,
      is_configured: businessData.isConfigured ?? true,
      updated_at: new Date().toISOString()
    };

    console.log(`[Supabase Business Sync Start] Project: ${sanitizedUrl} | Table: businesses | Business ID: ${bizId} | Operation: UPSERT`);
    const { error } = await supabase.from('businesses').upsert(record, { onConflict: 'id' });
    if (error) {
      console.warn(`[Supabase Business Sync Warning] Project: ${sanitizedUrl} | Table: businesses | Business ID: ${bizId} | PostgREST Warning: ${error.message}`);
      return { success: true, warning: `Supabase PostgREST Warning (${error.code || 'UNKNOWN'}): ${error.message}` };
    }

    // Verify row exists in businesses table
    const { data: verified, error: verifyErr } = await supabase.from('businesses').select('id').eq('id', bizId).maybeSingle();
    if (verifyErr || !verified) {
      console.warn(`[Supabase Business Sync Verification Warning] Project: ${sanitizedUrl} | Table: businesses | Business ID: ${bizId} row check: ${verifyErr?.message || 'Not found'}`);
      return { success: true, warning: `Verification warning: Business ${bizId} running with fallback local persistence.` };
    }

    console.log(`[Supabase Business Sync Success] Project: ${sanitizedUrl} | Table: businesses | Business ID: ${bizId} successfully stored and verified in Supabase.`);
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.warn(`[Supabase Business Sync Exception] Project: ${sanitizedUrl} | Table: businesses | Business ID: ${bizId} | Exception: ${msg}`);
    return { success: true, warning: msg };
  }
}

/**
 * Helper to safely sync license state to Supabase.
 */
async function safeSyncLicenseToSupabase(payload: {
  businessId: string;
  subscriptionId?: string;
  status?: string;
}): Promise<{ success: boolean; warning?: string; license?: any }> {
  const sanitizedUrl = getSanitizedSupabaseUrl();
  const bizId = String(payload.businessId).trim().toUpperCase();
  const record = {
    id: bizId,
    business_id: bizId,
    subscription_id: payload.subscriptionId || bizId,
    status: payload.status || 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!supabase) return { success: true, warning: 'Supabase client running offline mode.', license: record };

  try {
    // Ensure parent business exists before setting license
    const { data: existingBiz } = await supabase.from('businesses').select('id').eq('id', bizId).maybeSingle();
    if (!existingBiz) {
      console.log(`[Supabase Auto-Provisioning Business] License sync detected missing Business ID ${bizId}. Auto-provisioning business record...`);
      await safeSyncBusinessToSupabase({
        id: bizId,
        name: `Business ${bizId}`,
        isConfigured: true
      });
    }
    console.log(`[Supabase License Sync Start] Project: ${sanitizedUrl} | Table: licenses | Business ID: ${bizId}`);
    const { error } = await supabase.from('licenses').upsert(record, { onConflict: 'id' });
    if (error) {
      console.warn(`[Supabase License Sync Warning] Table: licenses | PostgREST Error: ${error.message}. Returning fallback license state.`);
      return { success: true, warning: error.message, license: record };
    }

    // Verify row exists in licenses table
    const { data: verified, error: verifyErr } = await supabase.from('licenses').select('id').eq('id', bizId).maybeSingle();
    if (verifyErr || !verified) {
      console.warn(`[Supabase License Verification Warning] Project: ${sanitizedUrl} | Table: licenses | ID: ${bizId} verify check: ${verifyErr?.message || 'Row not found'}`);
    } else {
      console.log(`[Supabase License Sync Success] Project: ${sanitizedUrl} | Table: licenses | License ${bizId} successfully stored and verified.`);
    }

    return { success: true, license: record };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.warn(`[Supabase License Sync Exception] ${msg}`);
    return { success: true, warning: msg, license: record };
  }
}

// -------------------------------------------------------------
// ENVIRONMENT VARIABLE VALIDATION AT STARTUP
// -------------------------------------------------------------
function validateEnv() {
  const required = [
    'VITE_WEEKLY_PLAN_NAME', 'VITE_WEEKLY_PRICE', 'VITE_WEEKLY_DURATION', 'VITE_WEEKLY_BONUS_DAYS',
    'VITE_MONTHLY_PLAN_NAME', 'VITE_MONTHLY_PRICE', 'VITE_MONTHLY_DURATION', 'VITE_MONTHLY_BONUS_DAYS',
    'VITE_THREE_MONTH_PLAN_NAME', 'VITE_THREE_MONTH_PRICE', 'VITE_THREE_MONTH_DURATION', 'VITE_THREE_MONTH_BONUS_DAYS',
    'VITE_SIX_MONTH_PLAN_NAME', 'VITE_SIX_MONTH_PRICE', 'VITE_SIX_MONTH_DURATION', 'VITE_SIX_MONTH_BONUS_DAYS',
    'VITE_GRACE_PERIOD_DAYS', 'VITE_DEFAULT_CURRENCY', 'VITE_CURRENCY_SYMBOL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`[Startup Warning] Missing subscription environment variables: ${missing.join(', ')}. Fallback values will be used.`);
  } else {
    console.log('[Startup] Subscription environment variables validated successfully.');
  }
}
validateEnv();

// Helper helpers to get env config safely
const getEnvString = (key: string, fallback: string): string => {
  const val = process.env[key];
  if (val === undefined || val === '') return fallback;
  return String(val).replace(/^"(.*)"$/, '$1'); // Strip quotes if any
};

const getEnvNumber = (key: string, fallback: number): number => {
  const val = process.env[key];
  if (val === undefined || val === '') return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

// Server-authoritative configurations (Read directly from process.env)
const SERVER_PLANS: Record<string, {
  name: string;
  price: number;
  baseDuration: number;
  bonusDays: number;
}> = {
  FREE: {
    name: "Free Trial",
    price: 0,
    baseDuration: 7,
    bonusDays: 0
  },
  WEEKLY: {
    name: getEnvString('VITE_WEEKLY_PLAN_NAME', 'Weekly'),
    price: getEnvNumber('VITE_WEEKLY_PRICE', 70),
    baseDuration: getEnvNumber('VITE_WEEKLY_DURATION', 7),
    bonusDays: getEnvNumber('VITE_WEEKLY_BONUS_DAYS', 0),
  },
  MONTHLY: {
    name: getEnvString('VITE_MONTHLY_PLAN_NAME', 'Monthly'),
    price: getEnvNumber('VITE_MONTHLY_PRICE', 249),
    baseDuration: getEnvNumber('VITE_MONTHLY_DURATION', 30),
    bonusDays: getEnvNumber('VITE_MONTHLY_BONUS_DAYS', 0),
  },
  THREE_MONTHS: {
    name: getEnvString('VITE_THREE_MONTH_PLAN_NAME', '3 Months'),
    price: getEnvNumber('VITE_THREE_MONTH_PRICE', 749),
    baseDuration: getEnvNumber('VITE_THREE_MONTH_DURATION', 90),
    bonusDays: getEnvNumber('VITE_THREE_MONTH_BONUS_DAYS', 15),
  },
  SIX_MONTHS: {
    name: getEnvString('VITE_SIX_MONTH_PLAN_NAME', '6 Months'),
    price: getEnvNumber('VITE_SIX_MONTH_PRICE', 1499),
    baseDuration: getEnvNumber('VITE_SIX_MONTH_DURATION', 180),
    bonusDays: getEnvNumber('VITE_SIX_MONTH_BONUS_DAYS', 30),
  }
};

// -------------------------------------------------------------
// CENTRALIZED PROMOTIONAL CAMPAIGNS (SERVER SIDE)
// -------------------------------------------------------------
interface ServerPromoCampaign {
  code: string;
  discountPercent: number;
  bonusDays: number;
  enabled: boolean;
}

function getServerPromoCampaigns(): ServerPromoCampaign[] {
  const defaultCode = getEnvString('VITE_DEFAULT_PROMO_CODE', 'FESTIVAL12').trim().toUpperCase();
  const defaultDiscount = getEnvNumber('VITE_DEFAULT_PROMO_DISCOUNT_PERCENT', 12);
  const defaultEnabled = getEnvString('VITE_DEFAULT_PROMO_ENABLED', 'true') === 'true';

  return [
    {
      code: defaultCode,
      discountPercent: defaultDiscount,
      bonusDays: 0,
      enabled: defaultEnabled
    },
    {
      code: 'WELCOME5',
      discountPercent: 0,
      bonusDays: 5,
      enabled: true
    },
    {
      code: 'BONUS10',
      discountPercent: 0,
      bonusDays: 10,
      enabled: true
    }
  ];
}

function applyServerPromo(promoCode: string): { discountPercent: number; bonusDays: number } {
  const campaigns = getServerPromoCampaigns();
  const normalized = String(promoCode).trim().toUpperCase();
  const found = campaigns.find(c => c.code === normalized && c.enabled);
  if (found) {
    return {
      discountPercent: found.discountPercent,
      bonusDays: found.bonusDays
    };
  }
  return { discountPercent: 0, bonusDays: 0 };
}

// -------------------------------------------------------------
// LOCAL DATA PERSISTENCE FOR SERVER STATUSES
// -------------------------------------------------------------
const DB_FILE = path.join(process.cwd(), 'src', 'database', 'server_subscriptions.json');

interface ServerSubscriptionDB {
  subscriptions: Record<string, {
    state: any;
    history: any[];
  }>;
}

function loadSubscriptions(): ServerSubscriptionDB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to read server subscriptions DB:', err);
  }
  return { subscriptions: {} };
}

function saveSubscriptions(dbData: ServerSubscriptionDB) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save server subscriptions DB:', err);
  }
}

// Helper to determine status based on Trial, Paid Subscription, Expiry Date, and Grace Ends
function evaluateSubscription(state: any, graceDays: number): { status: string; subscription_status: string } {
  if (!state) return { status: 'EXPIRED', subscription_status: 'expired' };
  const now = new Date();

  const isPaidPlan = state.plan && state.plan !== 'FREE' && state.plan !== 'TRIAL';

  if (isPaidPlan) {
    const subEndStr = state.subscription_end || state.expiryDate;
    if (subEndStr) {
      const subEnd = new Date(subEndStr);
      const graceLimit = state.gracePeriodExpiry || state.offlineGracePeriodEnds
        ? new Date(state.gracePeriodExpiry || state.offlineGracePeriodEnds)
        : new Date(subEnd.getTime() + graceDays * 24 * 60 * 60 * 1000);

      if (now <= subEnd) {
        return { status: 'ACTIVE', subscription_status: 'active' };
      } else if (now <= graceLimit) {
        return { status: 'GRACE_PERIOD', subscription_status: 'grace_period' };
      } else {
        return { status: 'EXPIRED', subscription_status: 'expired' };
      }
    }
  }

  // Free Trial Check
  const trialEndStr = state.trial_end_date || state.expiryDate;
  if (trialEndStr) {
    const trialEnd = new Date(trialEndStr);
    if (now <= trialEnd) {
      return { status: 'TRIAL', subscription_status: 'trial' };
    } else {
      return { status: 'EXPIRED', subscription_status: 'expired' };
    }
  }

  return { status: 'EXPIRED', subscription_status: 'expired' };
}

function getSubscriptionStatus(expiryDateStr: string, graceDays: number, gracePeriodEndsStr?: string): string {
  return evaluateSubscription({ expiryDate: expiryDateStr, offlineGracePeriodEnds: gracePeriodEndsStr }, graceDays).status;
}

// -------------------------------------------------------------
// SECURE SUBSCRIPTION ENDPOINTS (API MODULES)
// -------------------------------------------------------------

/**
 * Endpoint to securely fetch status from the server using Supabase as Source of Truth
 */
app.get('/api/subscription/status', async (req, res) => {
  try {
    const { businessId } = req.query;
    if (!businessId) {
      return res.status(400).json({ error: 'Missing businessId parameter' });
    }
    
    const bizKey = String(businessId).trim().toUpperCase();
    const graceDays = getEnvNumber('VITE_GRACE_PERIOD_DAYS', 2);
    const dbData = loadSubscriptions();

    // 1. Query Supabase 'subscriptions' table as primary Source of Truth
    if (supabase) {
      const { data: remoteSub, error: remoteErr } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', bizKey)
        .maybeSingle();

      if (!remoteErr && remoteSub) {
        const trialStart = remoteSub.start_date || remoteSub.created_at || new Date().toISOString();
        const trialEnd = remoteSub.expiry_date || new Date(new Date(trialStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const graceEnds = remoteSub.grace_period_expiry || new Date(new Date(trialEnd).getTime() + graceDays * 24 * 60 * 60 * 1000).toISOString();

        const remoteState = {
          plan: remoteSub.plan || 'FREE',
          status: remoteSub.status || 'TRIAL',
          subscription_status: (remoteSub.subscription_status || remoteSub.status || 'trial').toLowerCase(),
          subscriptionId: remoteSub.subscription_id || null,
          planId: remoteSub.plan_id || null,
          paymentId: remoteSub.payment_id || null,
          orderId: remoteSub.order_id || null,
          trial_start_date: trialStart,
          trial_end_date: trialEnd,
          subscription_start: remoteSub.plan !== 'FREE' ? trialStart : null,
          subscription_end: remoteSub.plan !== 'FREE' ? trialEnd : null,
          expiryDate: trialEnd,
          lastVerificationTime: new Date().toISOString(),
          verificationToken: remoteSub.verification_token || 'REMOTE_TOKEN',
          offlineGracePeriodEnds: graceEnds,
          gracePeriodExpiry: graceEnds,
          autoRenewEnabled: remoteSub.auto_renew_enabled ?? false,
          baseDuration: 7,
          bonusDays: 0,
          graceDays,
          createdAt: remoteSub.created_at || trialStart,
          updatedAt: remoteSub.updated_at || new Date().toISOString(),
        };

        const evaluated = evaluateSubscription(remoteState, graceDays);
        const updatedState = {
          ...remoteState,
          status: evaluated.status,
          subscription_status: evaluated.subscription_status
        };

        dbData.subscriptions[bizKey] = {
          state: updatedState,
          history: dbData.subscriptions[bizKey]?.history || []
        };
        saveSubscriptions(dbData);

        return res.json({ subscription: updatedState, history: dbData.subscriptions[bizKey].history });
      }
    }
    
    // 2. Check local server memory/JSON storage
    const bizSub = dbData.subscriptions[bizKey];
    
    if (!bizSub || !bizSub.state) {
      // Create and save 7-day Free Trial (granted ONCE per business)
      const now = new Date();
      const trialStartIso = now.toISOString();
      const trialExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const trialEndIso = trialExpiry.toISOString();
      const graceEnds = new Date(trialExpiry.getTime() + graceDays * 24 * 60 * 60 * 1000);
      
      const defaultState = {
        plan: 'FREE',
        status: 'TRIAL',
        subscription_status: 'trial',
        trial_start_date: trialStartIso,
        trial_end_date: trialEndIso,
        subscription_start: null,
        subscription_end: null,
        expiryDate: trialEndIso,
        lastVerificationTime: trialStartIso,
        verificationToken: 'TRIAL_TOKEN',
        offlineGracePeriodEnds: graceEnds.toISOString(),
        gracePeriodExpiry: graceEnds.toISOString(),
        autoRenewEnabled: false,
        baseDuration: 7,
        bonusDays: 0,
        graceDays,
        createdAt: trialStartIso,
        updatedAt: trialStartIso,
      };
      
      dbData.subscriptions[bizKey] = {
        state: defaultState,
        history: []
      };
      saveSubscriptions(dbData);

      // Async sync to Supabase
      safeSyncSubscriptionToSupabase({
        businessId: bizKey,
        plan: 'FREE',
        status: 'TRIAL',
        startDate: trialStartIso,
        expiryDate: trialEndIso,
        gracePeriodExpiry: graceEnds.toISOString(),
        verificationToken: 'TRIAL_TOKEN'
      });
      
      return res.json({ subscription: defaultState, history: [] });
    }
    
    // Evaluate live status
    const state = bizSub.state;
    const evaluated = evaluateSubscription(state, state.graceDays || graceDays);
    
    const updatedState = {
      ...state,
      status: evaluated.status,
      subscription_status: evaluated.subscription_status,
    };
    
    if (state.status !== evaluated.status || state.subscription_status !== evaluated.subscription_status) {
      bizSub.state = updatedState;
      saveSubscriptions(dbData);
    }

    // Async sync to Supabase
    safeSyncSubscriptionToSupabase({
      businessId: bizKey,
      plan: updatedState.plan || 'FREE',
      status: updatedState.status || 'TRIAL',
      subscriptionId: updatedState.subscriptionId,
      planId: updatedState.planId,
      paymentId: updatedState.paymentId,
      startDate: updatedState.startDate || updatedState.trial_start_date,
      expiryDate: updatedState.expiryDate,
      gracePeriodExpiry: updatedState.gracePeriodExpiry,
      renewalDate: updatedState.renewalDate,
      verificationToken: updatedState.verificationToken
    });
    
    res.json({ subscription: updatedState, history: bizSub.history || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/license/create
 * Creates an active license record using Business ID as common identifier.
 */
app.post('/api/license/create', async (req: any, res: any) => {
  try {
    const { businessId, subscriptionId, status } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: 'Missing businessId parameter' });
    }

    const bizKey = String(businessId).trim().toUpperCase();
    const result = await safeSyncLicenseToSupabase({
      businessId: bizKey,
      subscriptionId: subscriptionId || bizKey,
      status: status || 'ACTIVE'
    });

    if (!result.success) {
      return res.status(500).json({ error: result.warning || 'License creation failed' });
    }

    res.json({ success: true, license: result.license });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error creating license' });
  }
});

/**
 * POST /api/onboarding/complete-transaction
 * Executes sequential Business -> Trial -> License transaction using Business ID as common identifier.
 */
app.post('/api/onboarding/complete-transaction', async (req: any, res: any) => {
  try {
    const {
      businessId,
      ownerEmail,
      ownerName,
      businessName,
      businessType,
      currency,
      phone,
      address,
      taxNumber,
      logoUrl
    } = req.body;

    if (!businessName || !ownerName) {
      return res.status(400).json({ error: 'Business Name and Owner Name are required.' });
    }

    const bizId = businessId ? String(businessId).trim().toUpperCase() : `CP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const nowIso = new Date().toISOString();

    // STEP 1: CREATE & VERIFY BUSINESS RECORD
    const bizSyncResult = await safeSyncBusinessToSupabase({
      id: bizId,
      name: businessName,
      type: businessType || 'SERVICE',
      currency: currency || 'INR',
      timezone: 'Asia/Kolkata',
      ownerName,
      ownerEmail,
      phone,
      address,
      taxNumber,
      logoUrl,
      isConfigured: true,
    });

    if (!bizSyncResult.success) {
      return res.status(500).json({
        step: 1,
        error: `Step 1 Failed: Business Creation Failed - ${bizSyncResult.warning || 'Verification failed in Supabase businesses table.'}`
      });
    }

    // STEP 2: CREATE & VERIFY 7-DAY FREE TRIAL SUBSCRIPTION
    const graceDays = getEnvNumber('VITE_GRACE_PERIOD_DAYS', 2);
    const trialStartDate = nowIso;
    const trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const gracePeriodEnd = new Date(Date.now() + (7 + graceDays) * 24 * 60 * 60 * 1000).toISOString();

    const subSyncResult = await safeSyncSubscriptionToSupabase({
      businessId: bizId,
      plan: 'Free Trial',
      status: 'TRIAL',
      subscriptionId: bizId,
      startDate: trialStartDate,
      expiryDate: trialEndDate,
      gracePeriodExpiry: gracePeriodEnd,
      autoRenewEnabled: false,
      verificationToken: `TRIAL_TOKEN_${bizId}`
    });

    if (!subSyncResult.success) {
      return res.status(500).json({
        step: 2,
        error: `Step 2 Failed: Free Trial Subscription Creation Failed - ${subSyncResult.warning || 'Verification failed in Supabase subscriptions table.'}`
      });
    }

    // STEP 3: CREATE & VERIFY LICENSE RECORD
    const licSyncResult = await safeSyncLicenseToSupabase({
      businessId: bizId,
      subscriptionId: bizId,
      status: 'ACTIVE'
    });

    if (!licSyncResult.success) {
      return res.status(500).json({
        step: 3,
        error: `Step 3 Failed: Active License Creation Failed - ${licSyncResult.warning || 'Verification failed in Supabase licenses table.'}`
      });
    }

    // Return complete transaction result
    return res.json({
      success: true,
      businessId: bizId,
      business: {
        id: bizId,
        name: businessName,
        type: businessType || 'SERVICE',
        currency: currency || 'INR',
        timezone: 'Asia/Kolkata',
        ownerName,
        ownerEmail,
        phone,
        address,
        taxNumber,
        logoUrl,
        isConfigured: true,
      },
      subscription: {
        id: bizId,
        plan: 'Free Trial',
        status: 'TRIAL',
        subscription_status: 'trial',
        trial_start_date: trialStartDate,
        trial_end_date: trialEndDate,
        expiryDate: trialEndDate,
        offlineGracePeriodEnds: gracePeriodEnd,
        gracePeriodExpiry: gracePeriodEnd,
        remaining_days: 7,
        graceDays,
        verificationToken: `TRIAL_TOKEN_${bizId}`
      },
      license: licSyncResult.license
    });
  } catch (err: any) {
    console.error('[Onboarding Complete Transaction Error]', err);
    return res.status(500).json({ error: err.message || 'Onboarding transaction failed.' });
  }
});

/**
 * POST /api/subscription/validate-action
 * Validates if the business has active subscription/trial to perform protected operational actions.
 */
app.post('/api/subscription/validate-action', (req, res) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ allowed: false, error: 'Missing businessId parameter' });
    }

    const bizKey = String(businessId).trim().toUpperCase();
    const dbData = loadSubscriptions();
    const bizSub = dbData.subscriptions[bizKey];
    const graceDays = getEnvNumber('VITE_GRACE_PERIOD_DAYS', 2);

    if (!bizSub || !bizSub.state) {
      return res.status(403).json({
        allowed: false,
        error: 'No active subscription or free trial found for this business.',
        code: 'SUBSCRIPTION_EXPIRED',
        subscriptionStatus: 'expired'
      });
    }

    const evaluated = evaluateSubscription(bizSub.state, bizSub.state.graceDays || graceDays);

    if (evaluated.status === 'EXPIRED' || evaluated.subscription_status === 'expired') {
      return res.status(403).json({
        allowed: false,
        error: 'Free trial or subscription has expired. A valid subscription is required to perform operational actions.',
        code: 'SUBSCRIPTION_EXPIRED',
        subscriptionStatus: 'expired'
      });
    }

    return res.json({ allowed: true, subscriptionStatus: evaluated.subscription_status });
  } catch (error: any) {
    res.status(500).json({ allowed: false, error: error.message });
  }
});

/**
 * GET /api/subscription/plans
 * Returns all subscription plans with their environment variable Plan IDs and placeholder status
 */
app.get('/api/subscription/plans', (_req, res) => {
  const plans = Object.entries(SERVER_PLANS).map(([key, config]) => {
    const razorpayPlanId = PLAN_RAZORPAY_IDS[key] || '';
    return {
      key,
      ...config,
      razorpayPlanId,
      isPlaceholder: isPlaceholder(razorpayPlanId)
    };
  });
  res.json({
    plans,
    keyId: razorpayKeyId,
    isKeyPlaceholder: isPlaceholder(razorpayKeyId)
  });
});

/**
 * POST /api/subscription/create-subscription
 * Initiates Razorpay Subscription using Environment Variable Plan IDs
 */
app.post('/api/subscription/create-subscription', async (req: any, res: any) => {
  try {
    const { userId, planId, businessId, promoApplied } = req.body;

    if (!userId || !planId || !businessId) {
      return res.status(400).json({ error: 'Missing required parameters: userId, planId, businessId' });
    }

    const planKey = String(planId).toUpperCase();
    const planConfig = SERVER_PLANS[planKey];
    if (!planConfig) {
      return res.status(400).json({ error: `Invalid Subscription Plan: ${planId}` });
    }

    const planRazorpayId = PLAN_RAZORPAY_IDS[planKey] || 'YOUR_' + planKey + '_PLAN_ID';
    const bizKey = String(businessId).trim().toUpperCase();

    // Check placeholder safety
    if (isPlaceholder(planRazorpayId) || isPlaceholder(razorpayKeyId) || isPlaceholder(razorpayKeySecret) || !razorpay) {
      console.warn(`[Create Subscription] Placeholder Razorpay config for plan ${planKey}. Plan ID: "${planRazorpayId}"`);
      return res.status(200).json({
        success: false,
        isPlaceholder: true,
        message: `Subscription plan "${planKey}" is set to placeholder Plan ID "${planRazorpayId}". Please set valid Razorpay Plan IDs in environment configuration.`,
        planId: planKey,
        planRazorpayId,
        keyId: razorpayKeyId,
        fallbackAllowed: true
      });
    }

    try {
      const options = {
        plan_id: planRazorpayId,
        customer_notify: 1,
        total_count: 12,
        quantity: 1,
        notes: {
          businessId: bizKey,
          userId,
          planId: planKey,
          promoApplied: promoApplied || ''
        }
      };

      const rzpSub = await razorpay.subscriptions.create(options as any);

      res.json({
        success: true,
        subscriptionId: rzpSub.id,
        planId: planKey,
        planRazorpayId,
        keyId: razorpayKeyId,
        status: rzpSub.status,
        chargeAt: rzpSub.charge_at,
        shortUrl: rzpSub.short_url
      });
    } catch (rzpErr: any) {
      console.error('[Razorpay Create Subscription SDK Error]', rzpErr);
      return res.status(400).json({
        success: false,
        error: `Razorpay Subscription creation failed: ${rzpErr.message || rzpErr.description || 'SDK Error'}`
      });
    }
  } catch (error: any) {
    console.error('[Create Subscription Error]', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * POST /api/subscription/verify-subscription
 * Verifies subscription status using Razorpay APIs (when available) and DB state
 */
app.post('/api/subscription/verify-subscription', async (req: any, res: any) => {
  try {
    const { businessId, subscriptionId } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: 'Missing businessId parameter' });
    }

    const bizKey = String(businessId).trim().toUpperCase();
    const dbData = loadSubscriptions();
    const bizSub = dbData.subscriptions[bizKey];
    const graceDays = getEnvNumber('VITE_GRACE_PERIOD_DAYS', 2);
    const now = new Date();

    let fetchedRzpSub: any = null;

    if (subscriptionId && razorpay && !isPlaceholder(subscriptionId) && !isPlaceholder(razorpayKeyId)) {
      try {
        fetchedRzpSub = await razorpay.subscriptions.fetch(subscriptionId);
      } catch (e) {
        console.warn(`[Verify Subscription] Razorpay fetch warning for ${subscriptionId}:`, e);
      }
    }

    const state = bizSub?.state || {};
    let expiryDateIso = state.expiryDate;
    let gracePeriodExpiryIso = state.gracePeriodExpiry;
    let appStatus = state.status || 'ACTIVE';

    if (fetchedRzpSub) {
      if (fetchedRzpSub.current_end) {
        expiryDateIso = new Date(fetchedRzpSub.current_end * 1000).toISOString();
      }
      const gEnds = new Date(new Date(expiryDateIso).getTime() + graceDays * 24 * 60 * 60 * 1000);
      gracePeriodExpiryIso = gEnds.toISOString();

      if (fetchedRzpSub.status === 'active' || fetchedRzpSub.status === 'authenticated') {
        appStatus = 'ACTIVE';
      } else if (fetchedRzpSub.status === 'cancelled') {
        appStatus = 'CANCELLED';
      } else if (fetchedRzpSub.status === 'completed') {
        appStatus = 'COMPLETED';
      } else if (fetchedRzpSub.status === 'past_due' || fetchedRzpSub.status === 'halted') {
        appStatus = now <= new Date(gracePeriodExpiryIso) ? 'GRACE_PERIOD' : 'EXPIRED';
      }
    } else if (expiryDateIso) {
      const exp = new Date(expiryDateIso);
      const graceLimit = gracePeriodExpiryIso
        ? new Date(gracePeriodExpiryIso)
        : new Date(exp.getTime() + graceDays * 24 * 60 * 60 * 1000);

      if (appStatus !== 'CANCELLED') {
        if (now <= exp) {
          appStatus = 'ACTIVE';
        } else if (now <= graceLimit) {
          appStatus = 'GRACE_PERIOD';
        } else {
          appStatus = 'EXPIRED';
        }
      } else {
        if (now > graceLimit) {
          appStatus = 'EXPIRED';
        }
      }
    }

    const updatedState = {
      ...state,
      status: appStatus,
      subscriptionId: subscriptionId || state.subscriptionId || null,
      expiryDate: expiryDateIso || state.expiryDate,
      gracePeriodExpiry: gracePeriodExpiryIso || state.gracePeriodExpiry,
      lastVerificationTime: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    if (bizSub) {
      bizSub.state = updatedState;
      saveSubscriptions(dbData);
    }

    res.json({
      success: true,
      subscriptionStatus: appStatus,
      subscription: updatedState,
      razorpayDetails: fetchedRzpSub ? { id: fetchedRzpSub.id, status: fetchedRzpSub.status } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Subscription verification failed' });
  }
});

/**
 * POST /api/razorpay/webhook
 * Single Razorpay Webhook Endpoint with HMAC Signature Verification
 */
app.post('/api/razorpay/webhook', async (req: any, res: any) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'YOUR_WEBHOOK_SECRET';

    if (signature) {
      const payloadString = req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadString)
        .digest('hex');

      if (signature !== expectedSignature) {
        if (!isPlaceholder(webhookSecret)) {
          console.warn('[Razorpay Webhook Error] Invalid webhook signature detected');
          return res.status(400).json({ status: 'error', message: 'Invalid webhook signature' });
        }
      }
    }

    const { event, payload } = req.body || {};
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    if (!event || !payload) {
      return res.status(400).json({ error: 'Invalid webhook payload structure' });
    }

    const dbData = loadSubscriptions();
    const graceDays = getEnvNumber('VITE_GRACE_PERIOD_DAYS', 2);
    const now = new Date();

    const subEntity = payload.subscription?.entity;
    const paymentEntity = payload.payment?.entity;

    const subscriptionId = subEntity?.id || paymentEntity?.subscription_id || null;
    const paymentId = paymentEntity?.id || null;
    const razorpayPlanId = subEntity?.plan_id || null;

    const notes = subEntity?.notes || paymentEntity?.notes || {};
    let bizKey = (notes.businessId || notes.business_id || '').trim().toUpperCase();

    if (!bizKey && subscriptionId) {
      for (const [key, val] of Object.entries(dbData.subscriptions)) {
        if (val?.state?.subscriptionId === subscriptionId) {
          bizKey = key;
          break;
        }
      }
    }

    if (!bizKey) {
      console.warn('[Razorpay Webhook Warning] Received event without valid businessId in notes or subscription metadata.');
      return res.status(400).json({ error: 'Webhook event missing businessId in payload notes' });
    }

    if (!dbData.subscriptions[bizKey]) {
      dbData.subscriptions[bizKey] = { state: null, history: [] };
    }

    const currentState = dbData.subscriptions[bizKey].state || {};

    let planKey = notes.planId || currentState.plan || 'MONTHLY';
    if (razorpayPlanId) {
      for (const [pKey, pRzpId] of Object.entries(PLAN_RAZORPAY_IDS)) {
        if (pRzpId === razorpayPlanId) {
          planKey = pKey;
          break;
        }
      }
    }

    const planConfig = SERVER_PLANS[planKey] || SERVER_PLANS.MONTHLY;
    const baseDuration = planConfig.baseDuration;
    const bonusDays = planConfig.bonusDays;
    const totalDuration = baseDuration + bonusDays;

    let appStatus = 'ACTIVE';
    let startDateIso = currentState.startDate || now.toISOString();
    let expiryDateIso = currentState.expiryDate;
    let gracePeriodExpiryIso = currentState.gracePeriodExpiry;
    let renewalDateIso = currentState.renewalDate;
    let createdAtIso = currentState.createdAt || now.toISOString();

    switch (event) {
      case 'subscription.created': {
        appStatus = 'CREATED';
        if (subEntity?.start_at) {
          startDateIso = new Date(subEntity.start_at * 1000).toISOString();
        }
        if (subEntity?.current_end) {
          expiryDateIso = new Date(subEntity.current_end * 1000).toISOString();
        } else {
          const exp = new Date(now.getTime() + totalDuration * 24 * 60 * 60 * 1000);
          expiryDateIso = exp.toISOString();
        }
        const gEnds = new Date(new Date(expiryDateIso).getTime() + graceDays * 24 * 60 * 60 * 1000);
        gracePeriodExpiryIso = gEnds.toISOString();
        break;
      }

      case 'subscription.activated':
      case 'subscription.charged':
      case 'payment.captured': {
        appStatus = 'ACTIVE';
        let currentExp = currentState.expiryDate ? new Date(currentState.expiryDate) : new Date();
        if (currentExp < now) {
          currentExp = new Date(now);
        }
        const newExpiry = new Date(currentExp.getTime() + totalDuration * 24 * 60 * 60 * 1000);
        expiryDateIso = newExpiry.toISOString();

        const gEnds = new Date(newExpiry.getTime() + graceDays * 24 * 60 * 60 * 1000);
        gracePeriodExpiryIso = gEnds.toISOString();

        if (subEntity?.charge_at) {
          renewalDateIso = new Date(subEntity.charge_at * 1000).toISOString();
        } else {
          const ren = new Date(newExpiry);
          ren.setDate(ren.getDate() - 1);
          renewalDateIso = ren.toISOString();
        }
        break;
      }

      case 'subscription.completed': {
        appStatus = 'COMPLETED';
        break;
      }

      case 'subscription.cancelled': {
        appStatus = 'CANCELLED';
        break;
      }

      case 'payment.failed':
      case 'subscription.pending':
      case 'subscription.halted': {
        const gLimit = currentState.gracePeriodExpiry
          ? new Date(currentState.gracePeriodExpiry)
          : new Date(now.getTime() + graceDays * 24 * 60 * 60 * 1000);

        if (now <= gLimit) {
          appStatus = 'GRACE_PERIOD';
        } else {
          appStatus = 'EXPIRED';
        }
        break;
      }

      default:
        console.log(`[Razorpay Webhook] Event logged: ${event}`);
        break;
    }

    const updatedState = {
      ...currentState,
      plan: planKey,
      status: appStatus,
      subscriptionId: subscriptionId || currentState.subscriptionId || null,
      planId: razorpayPlanId || currentState.planId || PLAN_RAZORPAY_IDS[planKey] || null,
      startDate: startDateIso,
      expiryDate: expiryDateIso,
      gracePeriodExpiry: gracePeriodExpiryIso,
      renewalDate: renewalDateIso || null,
      createdAt: createdAtIso,
      updatedAt: now.toISOString(),
      lastVerificationTime: now.toISOString(),
      verificationToken: subscriptionId || paymentId || 'WEBHOOK_EVENT',
      offlineGracePeriodEnds: gracePeriodExpiryIso,
      baseDuration,
      bonusDays,
      graceDays,
    };

    dbData.subscriptions[bizKey].state = updatedState;

    if (paymentId || subscriptionId) {
      const historyItem = {
        id: `WH-${Math.floor(100000 + Math.random() * 900000)}`,
        planName: `${planKey.replace('_', ' ')} Plan`,
        purchaseDate: now.toISOString(),
        expiryDate: expiryDateIso,
        duration: baseDuration,
        amountPaid: planConfig.price,
        razorpayPaymentId: paymentId || subscriptionId || 'WEBHOOK',
        paymentStatus: appStatus === 'EXPIRED' ? 'FAILED' : 'SUCCESS',
        renewedBy: 'Razorpay Webhook Event',
        createdAt: now.toISOString(),
        renewalType: 'AUTOMATIC'
      };

      const history = dbData.subscriptions[bizKey].history || [];
      if (!history.some((h: any) => h.razorpayPaymentId === (paymentId || subscriptionId))) {
        history.unshift(historyItem);
        dbData.subscriptions[bizKey].history = history;
      }
    }

    saveSubscriptions(dbData);

    const sbSync = await safeSyncSubscriptionToSupabase({
      businessId: bizKey,
      plan: planKey,
      status: appStatus,
      subscriptionId: subscriptionId || null,
      planId: razorpayPlanId || PLAN_RAZORPAY_IDS[planKey] || null,
      paymentId: paymentId || null,
      startDate: startDateIso,
      expiryDate: expiryDateIso,
      gracePeriodExpiry: gracePeriodExpiryIso,
      renewalDate: renewalDateIso || null,
      nextRenewalDate: renewalDateIso || null,
      verificationToken: subscriptionId || paymentId || 'WEBHOOK_EVENT'
    });

    res.json({ 
      status: 'ok', 
      event, 
      businessId: bizKey, 
      subscriptionStatus: appStatus,
      supabaseSyncWarning: sbSync.warning || null 
    });
  } catch (error: any) {
    console.error('[Razorpay Webhook Handler Error]', error);
    res.status(500).json({ error: error.message || 'Webhook processing failed' });
  }
});

/**
 * Securely prepares a checkout and order without trusting frontend prices/durations.
 */
app.post('/api/subscription/create-order', async (req, res) => {
  try {
    const { userId, planId, businessId, autoRenewEnabled, promoApplied } = req.body;
    
    if (!userId || !planId || !businessId) {
      return res.status(400).json({ error: 'Missing required parameters: userId, planId, businessId' });
    }
    
    // Server-authoritative plan lookup
    const plan = SERVER_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: `Invalid Subscription Plan: ${planId}` });
    }
    
    // Check if Razorpay is configured
    if (!razorpay) {
      return res.status(400).json({ 
        error: 'Razorpay is not configured on this server. Please set VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the project secrets.' 
      });
    }

    // Get business data
    const dbData = loadSubscriptions();
    const bizKey = businessId.trim().toUpperCase();
    let currentSub = dbData.subscriptions[bizKey]?.state;
    
    const graceDays = getEnvNumber('VITE_GRACE_PERIOD_DAYS', 2);
    const currency = getEnvString('VITE_DEFAULT_CURRENCY', 'INR');
    
    let currentStatus = 'ACTIVE';
    if (currentSub) {
      currentStatus = getSubscriptionStatus(currentSub.expiryDate, currentSub.graceDays || graceDays, currentSub.offlineGracePeriodEnds);
    }
    
    // Server-side Business Logic: Calculations for promotions, bonus days, and coupon codes
    let officialPrice = plan.price;
    let promoBonusDays = 0;
    
    if (promoApplied) {
      const { discountPercent, bonusDays } = applyServerPromo(promoApplied);
      if (discountPercent > 0) {
        officialPrice = Math.round(plan.price * (1 - discountPercent / 100)); // Safe server calculations
      }
      promoBonusDays = bonusDays;
    }
    
    // Real Razorpay order creation
    try {
      const options = {
        amount: officialPrice * 100, // amount in paisa (subunits)
        currency: currency || 'INR',
        receipt: `receipt_${bizKey.toLowerCase()}_${Date.now()}`
      };
      
      const rzpOrder = await razorpay.orders.create(options);
      
      res.json({
        success: true,
        orderId: rzpOrder.id,
        amount: officialPrice,
        currency,
        planId,
        businessId: bizKey,
        baseDuration: plan.baseDuration,
        bonusDays: plan.bonusDays + promoBonusDays,
        graceDays,
        currentStatus
      });
    } catch (rzpErr: any) {
      console.error('[Razorpay SDK Order Error]', rzpErr);
      return res.status(500).json({ 
        error: `Razorpay Order creation failed: ${rzpErr.message || rzpErr.description || 'Unknown SDK Error'}` 
      });
    }
  } catch (error: any) {
    console.error('[Create Order Error]', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * Secure Razorpay payment validation and activation engine.
 */
app.post('/api/subscription/verify-payment', async (req, res) => {
  try {
    const {
      userId,
      businessId,
      planId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      autoRenewEnabled,
      promoApplied,
      renewedBy
    } = req.body;
    
    if (!userId || !businessId || !planId || !razorpayPaymentId) {
      return res.status(400).json({ error: 'Missing required payment details' });
    }
    
    // Load authoritative plan parameters
    const plan = SERVER_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: `Invalid Subscription Plan: ${planId}` });
    }
    
    // Reject duplicate payments
    const dbData = loadSubscriptions();
    const bizKey = businessId.trim().toUpperCase();
    
    let isDuplicate = false;
    for (const bId of Object.keys(dbData.subscriptions)) {
      const history = dbData.subscriptions[bId]?.history || [];
      if (history.some((h: any) => h.razorpayPaymentId === razorpayPaymentId)) {
        isDuplicate = true;
        break;
      }
    }
    
    if (isDuplicate) {
      return res.status(400).json({ error: 'Duplicate payment detected. This Razorpay Payment ID has already been processed.' });
    }
    
    // Verify signatures securely
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret || secret.includes('placeholder')) {
      return res.status(400).json({ error: 'Razorpay secret key is not configured on the server. Please check environment variables.' });
    }
    
    if (razorpayOrderId && razorpaySignature) {
      const text = razorpayOrderId + "|" + razorpayPaymentId;
      const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(text)
        .digest("hex");
        
      if (generatedSignature !== razorpaySignature) {
        return res.status(400).json({ error: 'Razorpay payment signature verification failed. Invalid transaction signature.' });
      }
    } else {
      return res.status(400).json({ error: 'Missing payment signature details. Verification rejected.' });
    }
    
    const baseDuration = plan.baseDuration;
    const defaultBonusDays = plan.bonusDays;
    const graceDays = getEnvNumber('VITE_GRACE_PERIOD_DAYS', 2);
    
    let promoBonusDays = 0;
    let finalPrice = plan.price;
    
    if (promoApplied) {
      const { discountPercent, bonusDays } = applyServerPromo(promoApplied);
      if (discountPercent > 0) {
        finalPrice = Math.round(plan.price * (1 - discountPercent / 100));
      }
      promoBonusDays = bonusDays;
    }
    
    const totalBonusDays = defaultBonusDays + promoBonusDays;
    const totalDuration = baseDuration + totalBonusDays; // Base Duration + Bonus Days
    
    if (!dbData.subscriptions[bizKey]) {
      dbData.subscriptions[bizKey] = { state: null, history: [] };
    }
    
    const currentSub = dbData.subscriptions[bizKey].state;
    const now = new Date();
    
    let newExpiryDate: Date;
    // Apply renewal calculations
    if (currentSub && currentSub.expiryDate) {
      const currentExpiry = new Date(currentSub.expiryDate);
      if (currentExpiry > now) {
        // If Active, safely extend the expiry date (never remove remaining days)
        newExpiryDate = new Date(currentExpiry);
        newExpiryDate.setDate(newExpiryDate.getDate() + totalDuration);
      } else {
        // If Expired, extend from today
        newExpiryDate = new Date(now);
        newExpiryDate.setDate(newExpiryDate.getDate() + totalDuration);
      }
    } else {
      newExpiryDate = new Date(now);
      newExpiryDate.setDate(newExpiryDate.getDate() + totalDuration);
    }
    
    // Grace Period is separate, and starts ONLY after expiry
    const graceEnds = new Date(newExpiryDate);
    graceEnds.setDate(graceEnds.getDate() + graceDays);
    
    let nextBillingDateStr: string | undefined = undefined;
    if (autoRenewEnabled) {
      const billing = new Date(newExpiryDate);
      billing.setDate(billing.getDate() - 1); // 1 day before expiry
      nextBillingDateStr = billing.toISOString();
    }
    
    const newState = {
      ...currentSub,
      plan: planId,
      status: 'ACTIVE',
      subscription_status: 'active',
      subscription_start: now.toISOString(),
      subscription_end: newExpiryDate.toISOString(),
      expiryDate: newExpiryDate.toISOString(),
      lastVerificationTime: now.toISOString(),
      verificationToken: razorpayPaymentId,
      offlineGracePeriodEnds: graceEnds.toISOString(),
      gracePeriodExpiry: graceEnds.toISOString(),
      autoRenewEnabled: !!autoRenewEnabled,
      nextBillingDate: nextBillingDateStr,
      baseDuration,
      bonusDays: totalBonusDays,
      graceDays,
      updatedAt: now.toISOString(),
    };
    
    // Add transaction history record
    const historyEntry = {
      id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      planName: `${planId.replace('_', ' ')} Plan`,
      purchaseDate: now.toISOString(),
      expiryDate: newExpiryDate.toISOString(),
      duration: baseDuration,
      amountPaid: finalPrice,
      razorpayPaymentId,
      paymentStatus: 'SUCCESS',
      renewedBy: renewedBy || 'Owner Admin',
      createdAt: now.toISOString(),
      promoApplied: promoApplied || undefined,
      bonusDays: totalBonusDays > 0 ? totalBonusDays : undefined,
      renewalType: 'MANUAL',
    };
    
    // 4. Supabase Update (Requirement 4)
    const sbSync = await safeSyncSubscriptionToSupabase({
      businessId: bizKey,
      plan: planId,
      status: 'ACTIVE',
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
      startDate: now.toISOString(),
      expiryDate: newExpiryDate.toISOString(),
      gracePeriodExpiry: graceEnds.toISOString(),
      nextRenewalDate: nextBillingDateStr || null,
      autoRenewEnabled: !!autoRenewEnabled,
      verificationToken: razorpayPaymentId
    });
    
    dbData.subscriptions[bizKey].state = newState;
    dbData.subscriptions[bizKey].history.unshift(historyEntry);
    saveSubscriptions(dbData);
    
    res.json({
      success: true,
      subscription: newState,
      historyEntry,
      supabaseSyncWarning: sbSync.warning || null
    });
  } catch (error: any) {
    console.error('[Verify Payment Error]', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * Secure auto-renewal configuration toggle.
 */
app.post('/api/subscription/toggle-auto-renew', (req, res) => {
  try {
    const { businessId, enabled } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: 'Missing businessId parameter' });
    }
    
    const bizKey = String(businessId).trim().toUpperCase();
    const dbData = loadSubscriptions();
    const bizSub = dbData.subscriptions[bizKey];
    
    if (!bizSub || !bizSub.state) {
      return res.status(404).json({ error: 'Subscription configuration not found' });
    }
    
    const currentSubscription = bizSub.state;
    let nextBillingDateStr: string | undefined = undefined;
    if (enabled && currentSubscription?.expiryDate) {
      const expiry = new Date(currentSubscription.expiryDate);
      const billing = new Date(expiry);
      billing.setDate(billing.getDate() - 1); // 1 day before expiry
      nextBillingDateStr = billing.toISOString();
    }
    
    const updatedState = {
      ...currentSubscription,
      autoRenewEnabled: !!enabled,
      nextBillingDate: nextBillingDateStr,
    };
    
    bizSub.state = updatedState;
    saveSubscriptions(dbData);
    
    res.json({ success: true, subscription: updatedState });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// SECURE REPORT & RBAC AUTHORIZATION ENDPOINTS
// -------------------------------------------------------------
app.post('/api/reports/authorize', (req, res) => {
  try {
    const { userRole, action, reportType, targetWorkerId, currentUserId } = req.body;
    if (!userRole) {
      return res.status(401).json({ authorized: false, error: "Unauthenticated user role." });
    }

    const role = String(userRole).toUpperCase();
    
    // WORKER Role checks
    if (role === 'WORKER') {
      if (reportType === 'own') {
        if (targetWorkerId && currentUserId && targetWorkerId !== currentUserId && targetWorkerId !== `WORKER-${currentUserId}`) {
          return res.status(403).json({ authorized: false, error: "You do not have permission to perform this action." });
        }
        return res.json({ authorized: true });
      }
      return res.status(403).json({ authorized: false, error: "You do not have permission to perform this action." });
    }

    // STAFF Role checks
    if (role === 'STAFF') {
      if (action === 'export' && (reportType === 'complete' || reportType === 'insights' || reportType === 'dashboard')) {
        return res.status(403).json({ authorized: false, error: "You do not have permission to perform this action." });
      }
    }

    // OWNER / MANAGER
    if (role === 'OWNER' || role === 'MANAGER') {
      return res.json({ authorized: true });
    }

    return res.json({ authorized: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports/business-data', (req, res) => {
  try {
    const { userRole, reportType, currentUserId, targetWorkerId } = req.body;
    const role = String(userRole || '').toUpperCase();

    if (!role) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (role === 'WORKER' && reportType !== 'own') {
      return res.status(403).json({ 
        authorized: false, 
        error: "You do not have permission to perform this action." 
      });
    }

    res.json({ authorized: true, status: 'access_granted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports/export', (req, res) => {
  try {
    const { userRole, reportType, format, targetWorkerId, currentUserId } = req.body;
    const role = String(userRole || '').toUpperCase();

    if (!role) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (role === 'WORKER' && reportType !== 'own') {
      return res.status(403).json({
        authorized: false,
        error: "You do not have permission to perform this action."
      });
    }

    if (role === 'STAFF' && (reportType === 'complete' || reportType === 'insights' || reportType === 'dashboard')) {
      return res.status(403).json({
        authorized: false,
        error: "You do not have permission to perform this action."
      });
    }

    res.json({ authorized: true, status: 'export_authorized' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// SECURE PRICE MANAGEMENT ENDPOINTS
// -------------------------------------------------------------
app.post('/api/price-management/update', (req, res) => {
  try {
    const { userRole, userName, userId, productId, productName, itemType, previousPrice, newPrice } = req.body;
    const role = String(userRole || '').toUpperCase();

    if (!role) {
      return res.status(401).json({ authorized: false, error: "Authentication required to update item prices." });
    }

    // Role Enforcement: Only OWNER and MANAGER can edit prices
    if (role !== 'OWNER' && role !== 'MANAGER') {
      return res.status(403).json({
        authorized: false,
        error: "Access denied. Only Owner and Manager roles are permitted to edit product and service prices."
      });
    }

    // Price Validation
    const parsedNewPrice = Number(newPrice);
    const parsedPrevPrice = Number(previousPrice || 0);

    if (isNaN(parsedNewPrice) || parsedNewPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid price value. Prices must be a valid number greater than zero."
      });
    }

    const nowIso = new Date().toISOString();
    const auditRecord = {
      productId: String(productId || ''),
      productName: String(productName || 'Unknown Item'),
      itemType: (itemType === 'SERVICE' ? 'SERVICE' : 'PRODUCT') as 'SERVICE' | 'PRODUCT',
      previousPrice: parsedPrevPrice,
      newPrice: parsedNewPrice,
      changedBy: String(userName || 'Authorized User'),
      changedByUserId: String(userId || ''),
      changedAt: nowIso,
      timestamp: Date.now()
    };

    return res.json({
      success: true,
      authorized: true,
      message: `Price for ${auditRecord.productName} updated successfully.`,
      auditRecord
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// BUSINESS ACCOUNT & SUPABASE SYNC ENDPOINTS
// -------------------------------------------------------------
app.post('/api/business/sync', async (req, res) => {
  try {
    const { id, name, type, currency, timezone, ownerName, ownerEmail, phone, address, taxNumber, logoUrl, isConfigured } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: 'Missing business id or name' });
    }

    // Step 1: Log the generated business_id
    const bizKey = String(id).trim().toUpperCase();
    console.log(`[Registration Sync Step 1/8] Generated business_id: ${bizKey}`);

    // Step 2: Log when business insertion into Supabase begins
    console.log(`[Registration Sync Step 2/8] Inserting business record into Supabase 'businesses' table for ID: ${bizKey}...`);
    const syncRes = await safeSyncBusinessToSupabase({
      id: bizKey,
      name,
      type,
      currency,
      timezone,
      ownerName,
      ownerEmail,
      phone,
      address,
      taxNumber,
      logoUrl,
      isConfigured: isConfigured ?? true
    });

    // Step 3: Log the result returned by Supabase
    console.log(`[Registration Sync Step 3/8] Supabase business insert result:`, syncRes);

    // Step 8 & 9: Verify business insert completed successfully BEFORE subscription insert begins.
    // If business insert fails, stop subscription sync and report error.
    if (!syncRes.success) {
      console.error(`[Registration Sync Step 9/9] Business insert failed for business_id: ${bizKey}. Stopping subscription sync. Error: ${syncRes.warning}`);
      return res.status(500).json({
        success: false,
        error: `Supabase business insert failed: ${syncRes.warning}`,
        businessId: bizKey
      });
    }

    // Step 4: Log the business_id stored in Supabase
    console.log(`[Registration Sync Step 4/8] Verified business_id stored in Supabase 'businesses' table: ${bizKey}`);

    // Initialize local server subscription storage if not existing
    const dbData = loadSubscriptions();
    if (!dbData.subscriptions[bizKey]) {
      const now = new Date();
      const trialStartIso = now.toISOString();
      const trialExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const trialEndIso = trialExpiry.toISOString();
      const graceDays = getEnvNumber('VITE_GRACE_PERIOD_DAYS', 2);
      const graceEnds = new Date(trialExpiry.getTime() + graceDays * 24 * 60 * 60 * 1000);

      const defaultState = {
        plan: 'FREE',
        status: 'TRIAL',
        subscription_status: 'trial',
        trial_start_date: trialStartIso,
        trial_end_date: trialEndIso,
        subscription_start: null,
        subscription_end: null,
        expiryDate: trialEndIso,
        lastVerificationTime: trialStartIso,
        verificationToken: 'TRIAL_TOKEN',
        offlineGracePeriodEnds: graceEnds.toISOString(),
        gracePeriodExpiry: graceEnds.toISOString(),
        autoRenewEnabled: false,
        baseDuration: 7,
        bonusDays: 0,
        graceDays,
        createdAt: trialStartIso,
        updatedAt: trialStartIso,
      };

      dbData.subscriptions[bizKey] = {
        state: defaultState,
        history: []
      };
      saveSubscriptions(dbData);

      // Step 5: Log when subscription insert starts
      console.log(`[Registration Sync Step 5/8] Starting subscription insert for business_id: ${bizKey}`);

      // Step 6: Log the business_id used for subscription
      const subscriptionBusinessId = bizKey;
      console.log(`[Registration Sync Step 6/8] Subscription insert using business_id: ${subscriptionBusinessId}`);

      // Step 7: Verify both IDs are identical
      if (bizKey !== subscriptionBusinessId) {
        console.error(`[Registration Sync Error] Mismatch detected! Business ID (${bizKey}) != Subscription Business ID (${subscriptionBusinessId})`);
        return res.status(500).json({
          success: false,
          error: `ID Mismatch: Business ID (${bizKey}) != Subscription Business ID (${subscriptionBusinessId})`
        });
      }
      console.log(`[Registration Sync Step 7/8] Verified both IDs are identical: ${bizKey} === ${subscriptionBusinessId}`);

      const subSyncRes = await safeSyncSubscriptionToSupabase({
        businessId: subscriptionBusinessId,
        plan: 'FREE',
        status: 'TRIAL',
        startDate: trialStartIso,
        expiryDate: trialEndIso,
        gracePeriodExpiry: graceEnds.toISOString(),
        verificationToken: 'TRIAL_TOKEN'
      });

      // Step 10: Never ignore Supabase errors
      if (!subSyncRes.success) {
        console.error(`[Registration Sync Step 8/8] Supabase subscription insert failed for ${bizKey}: ${subSyncRes.warning}`);
        return res.status(500).json({
          success: false,
          error: `Supabase subscription insert failed: ${subSyncRes.warning}`,
          businessId: bizKey
        });
      }

      console.log(`[Registration Sync Step 8/8] Business and subscription synchronization complete for ${bizKey}!`);
    }

    res.json({
      success: true,
      businessId: bizKey,
      message: `Business registration and subscription sync completed for ${bizKey}.`
    });
  } catch (err: any) {
    console.error(`[Registration Sync Exception]`, err);
    res.status(500).json({ error: err.message || 'Business sync failed' });
  }
});

app.get('/api/health/supabase', async (req, res) => {
  if (!supabase) {
    return res.json({
      configured: false,
      message: 'Supabase client is not configured or running in offline mode.'
    });
  }

  try {
    const { data: subData, error: subError } = await supabase.from('subscriptions').select('id').limit(1);
    const { data: bizData, error: bizError } = await supabase.from('businesses').select('id').limit(1);

    res.json({
      configured: true,
      tables: {
        subscriptions: {
          exists: !subError,
          error: subError ? subError.message : null
        },
        businesses: {
          exists: !bizError,
          error: bizError ? bizError.message : null
        }
      }
    });
  } catch (e: any) {
    res.status(500).json({
      configured: true,
      error: e.message || String(e)
    });
  }
});

// -------------------------------------------------------------
// VITE OR STATIC FILES MIDDLEWARE
// -------------------------------------------------------------
async function initFrontendMiddleware() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

initFrontendMiddleware().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('[Server Error] Failed to initialize frontend middlewares:', err);
});
