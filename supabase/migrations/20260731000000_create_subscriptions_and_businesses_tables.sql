-- Migration: Create Subscriptions, Businesses, and Licenses tables for ChhuttaPOS
-- Description: Offline-first architecture - Supabase stores central business accounts, licensing, and Razorpay subscription states.

-- 1. Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  currency TEXT DEFAULT 'INR',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  owner_name TEXT,
  owner_email TEXT,
  phone TEXT,
  address TEXT,
  tax_number TEXT,
  logo_url TEXT,
  is_configured BOOLEAN DEFAULT TRUE,
  legal_consent BOOLEAN DEFAULT TRUE,
  legal_consent_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY, -- Primary Key (Business ID)
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  subscription_id TEXT, -- Razorpay Subscription ID
  plan_id TEXT, -- Razorpay Plan ID
  payment_id TEXT, -- Razorpay Payment ID
  order_id TEXT, -- Razorpay Order ID
  plan TEXT DEFAULT 'FREE', -- FREE, WEEKLY, MONTHLY, THREE_MONTHS, SIX_MONTHS
  status TEXT DEFAULT 'TRIAL', -- TRIAL, ACTIVE, GRACE_PERIOD, EXPIRED, CANCELLED
  subscription_status TEXT DEFAULT 'trial',
  start_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  grace_period_expiry TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ,
  next_renewal_date TIMESTAMPTZ,
  last_payment_timestamp TIMESTAMPTZ,
  auto_renew_enabled BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  base_duration INT DEFAULT 7,
  bonus_days INT DEFAULT 0,
  grace_days INT DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Licenses Table
CREATE TABLE IF NOT EXISTS public.licenses (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  license_key TEXT,
  license_type TEXT DEFAULT 'OFFLINE_POS',
  status TEXT DEFAULT 'ACTIVE',
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  device_limit INT DEFAULT 5,
  signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Create Policies for Businesses Table
DROP POLICY IF EXISTS "Allow select for businesses" ON public.businesses;
CREATE POLICY "Allow select for businesses" ON public.businesses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert/update for businesses" ON public.businesses;
CREATE POLICY "Allow insert/update for businesses" ON public.businesses FOR ALL USING (true);

-- Create Policies for Subscriptions Table
DROP POLICY IF EXISTS "Allow select for subscriptions" ON public.subscriptions;
CREATE POLICY "Allow select for subscriptions" ON public.subscriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert/update for subscriptions" ON public.subscriptions;
CREATE POLICY "Allow insert/update for subscriptions" ON public.subscriptions FOR ALL USING (true);

-- Create Policies for Licenses Table
DROP POLICY IF EXISTS "Allow select for licenses" ON public.licenses;
CREATE POLICY "Allow select for licenses" ON public.licenses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert/update for licenses" ON public.licenses;
CREATE POLICY "Allow insert/update for licenses" ON public.licenses FOR ALL USING (true);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id ON public.subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_licenses_business_id ON public.licenses(business_id);
