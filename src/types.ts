/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ==========================================
// ROLE SYSTEM
// ==========================================
export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  WORKER = 'WORKER',
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phoneNumber?: string;
  createdAt: string;
  businessId?: string; // Links user to their Business Config
  mustChangePassword?: boolean;
  status?: 'FORCE_CHANGE_PASSWORD' | 'ACTIVE' | 'DISABLED';
  lastLogin?: string;
  legal_consent?: boolean;
  legal_consent_timestamp?: string;
  privacy_policy_version?: string;
  terms_version?: string;
  refund_policy_version?: string;
}

// ==========================================
// BUSINESS CONFIGURATION
// ==========================================
export enum BusinessType {
  SERVICE = 'SERVICE',
  PRODUCT = 'PRODUCT',
  HYBRID = 'HYBRID', // Mixed business
}

export interface BusinessConfig {
  id: string;
  name: string;
  type: BusinessType;
  currency: string; // e.g., INR, USD
  timezone: string;
  ownerName: string;
  address?: string;
  taxNumber?: string; // GST Number
  logoUrl?: string;
  phone?: string;
  email?: string;
  isConfigured: boolean; // First login -> Business Setup flag
  legal_consent?: boolean;
  legal_consent_timestamp?: string;
  privacy_policy_version?: string;
  terms_version?: string;
  refund_policy_version?: string;
}

// ==========================================
// SUBSCRIPTION & BILLING
// ==========================================
export enum SubscriptionPlan {
  FREE = 'FREE',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  THREE_MONTHS = 'THREE_MONTHS',
  SIX_MONTHS = 'SIX_MONTHS',
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  GRACE_PERIOD = 'GRACE_PERIOD',
  CANCELLED = 'CANCELLED',
  CREATED = 'CREATED',
  COMPLETED = 'COMPLETED',
}

export interface SubscriptionState {
  plan: SubscriptionPlan;
  status: SubscriptionStatus | string;
  expiryDate: string; // ISO string
  lastVerificationTime: string; // ISO string
  verificationToken: string;
  offlineGracePeriodEnds?: string; // ISO string for offline grace limit
  autoRenewEnabled?: boolean; // Optional Auto-Renewal Toggle
  nextBillingDate?: string; // Next Billing Date if Auto-Renew is enabled
  baseDuration?: number;
  bonusDays?: number;
  graceDays?: number;
  subscriptionId?: string; // Razorpay Subscription ID
  planId?: string; // Razorpay Plan ID
  startDate?: string; // ISO string
  gracePeriodExpiry?: string; // ISO string
  renewalDate?: string; // ISO string
  createdAt?: string; // ISO string
  updatedAt?: string; // ISO string
  trial_start_date?: string; // ISO string for 7-day free trial start
  trial_end_date?: string; // ISO string for 7-day free trial end
  subscription_start?: string; // ISO string for paid subscription start
  subscription_end?: string; // ISO string for paid subscription end
  subscription_status?: 'trial' | 'active' | 'grace_period' | 'expired' | string;
}

export interface SubscriptionHistoryEntry {
  id: string;
  planName: string;
  purchaseDate: string; // ISO string
  expiryDate: string; // ISO string
  duration: number; // in days
  amountPaid: number;
  razorpayPaymentId: string;
  paymentStatus: 'SUCCESS' | 'FAILED' | 'PENDING';
  renewedBy: string;
  createdAt: string; // ISO string
  promoApplied?: string;
  bonusDays?: number;
  renewalType?: 'MANUAL' | 'AUTOMATIC'; // Renewal Type
}

export interface BillingDetails {
  plan: SubscriptionPlan;
  amount: number;
  currency: string;
  paymentMethod?: string;
  transactionId?: string;
  gateway?: 'RAZORPAY' | 'MOCK';
}

// ==========================================
// OFFLINE SYNC STATE
// ==========================================
export interface SyncStatus {
  lastSyncedAt?: string;
  pendingSyncCount: number;
  isOnline: boolean;
}

// ==========================================
// ENTITY & REPOSITORY TYPES
// ==========================================
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean; // Offline-First sync tracker
}

// Generic repository pattern interface to abstract the storage mechanism
// (e.g. IndexedDB via Dexie vs SQLite/Capacitor in the future)
export interface IRepository<T extends BaseEntity> {
  getById(id: string): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  save(entity: T): Promise<string>;
  saveMany(entities: T[]): Promise<string[]>;
  delete(id: string): Promise<void>;
  query(filter: (item: T) => boolean): Promise<T[]>;
}
