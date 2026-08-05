/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { Table } from 'dexie';

export interface DbUserProfile {
  id: string;
  email: string;
  role: string;
  fullName: string;
  phoneNumber?: string;
  createdAt: string;
  businessId?: string;
  legal_consent?: boolean;
  legal_consent_timestamp?: string;
  privacy_policy_version?: string;
  terms_version?: string;
  refund_policy_version?: string;
}

export interface DbBusinessConfig {
  id: string;
  name: string;
  type: string;
  currency: string;
  timezone: string;
  ownerName: string;
  address?: string;
  taxNumber?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  isConfigured: number; // 0 for false, 1 for true
  legal_consent?: boolean;
  legal_consent_timestamp?: string;
  privacy_policy_version?: string;
  terms_version?: string;
  refund_policy_version?: string;
}

export interface DbSubscription {
  id: string;
  plan: string;
  status: string;
  subscription_status?: string;
  trial_start_date?: string;
  trial_end_date?: string;
  subscription_start?: string;
  subscription_end?: string;
  expiryDate: string;
  lastVerificationTime: string;
  verificationToken: string;
  offlineGracePeriodEnds?: string;
  gracePeriodExpiry?: string;
  autoRenewEnabled?: boolean;
  nextBillingDate?: string;
  baseDuration?: number;
  bonusDays?: number;
  graceDays?: number;
}

export interface DbSyncQueue {
  id?: number;
  tableName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: string; // JSON string representation
  timestamp: string;
}

export interface DbProduct {
  id: string;
  itemType?: 'PRODUCT' | 'SERVICE';
  brand?: string;
  name: string;
  variant?: string;
  category: string;
  description?: string;
  purchasePrice: number;
  sellingPrice: number;
  tax?: number;
  stockUnit: string;
  openingStock: number;
  currentStock: number;
  lowStockAlert: number;
  durationMinutes?: number;
  assignedWorkerIds?: string[];
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DbStockHistory {
  id?: number;
  productId: string;
  productName: string;
  brand?: string;
  variant?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  action: 'Created' | 'Edited' | 'Restocked' | 'Reduced';
  quantityChanged: number;
  reason: string;
  previousStock: number;
  newStock: number;
  timestamp: number;
}

export interface DbBillItem {
  productId: string;
  productName: string;
  brand?: string;
  variant?: string;
  category: string;
  sellingPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface DbBill {
  id: string; // e.g. BILL-000001
  billNumber: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  cashierName: string;
  workerId?: string; // Assigned Worker Profile ID
  workerName?: string; // Assigned Worker Name
  businessId?: string;
  customerName?: string;
  customerMobile?: string;
  items: DbBillItem[];
  subtotal: number;
  tipAmount?: number;
  discountType: 'percentage' | 'fixed' | 'none';
  discountValue: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: 'CASH' | 'UPI' | 'SPLIT';
  cashAmount: number;
  upiAmount: number;
}

export interface DbWorkerProfile {
  id: string; // e.g. WORKER-1001
  businessId?: string;
  name: string;
  photoUrl?: string;
  role: string; // e.g. 'Barber', 'Washer', 'Technician', 'Tailor', 'Staff', 'Manager', 'Cashier', 'Owner'
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DISABLED' | 'ARCHIVED';
  dailyWage?: number;
  commissionPercentage?: number;
  notes?: string;
  loginEnabled: boolean;
  staffAccountId?: string; // Linked staff / user account ID if login enabled
  username?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbAttendanceRecord {
  id: string; // e.g. ATT-1001
  workerId: string;
  workerName: string;
  businessId?: string;
  date: string; // YYYY-MM-DD
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
  checkInTime?: string; // HH:MM:SS
  checkOutTime?: string; // HH:MM:SS
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbPriceHistory {
  id?: number;
  productId: string;
  productName: string;
  itemType?: 'PRODUCT' | 'SERVICE';
  previousPrice: number;
  newPrice: number;
  changedBy: string;
  changedByUserId?: string;
  changedAt: string;
  timestamp: number;
}

export interface DbWorkerAdvance {
  id: string; // e.g. ADV-1001
  workerId: string;
  workerName: string;
  amount: number;
  type: 'GIVE' | 'RECOVER';
  reason?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  timestamp: number;
  createdBy: string;
  createdById?: string;
  notes?: string;
  settlementStatus?: 'OPEN' | 'SETTLED';
  settlementId?: string;
}

export class ChhuttaPOSDatabase extends Dexie {
  userProfiles!: Table<DbUserProfile, string>;
  businessConfigs!: Table<DbBusinessConfig, string>;
  subscriptions!: Table<DbSubscription, string>;
  syncQueue!: Table<DbSyncQueue, number>;
  products!: Table<DbProduct, string>;
  stockHistory!: Table<DbStockHistory, number>;
  bills!: Table<DbBill, string>;
  workerProfiles!: Table<DbWorkerProfile, string>;
  attendanceRecords!: Table<DbAttendanceRecord, string>;
  priceHistory!: Table<DbPriceHistory, number>;
  workerAdvances!: Table<DbWorkerAdvance, string>;

  constructor() {
    super('ChhuttaPOS_DB');
    this.version(1).stores({
      userProfiles: 'id, email, role',
      businessConfigs: 'id, name, type',
      subscriptions: 'id, plan, status, expiryDate',
      syncQueue: '++id, tableName, action, timestamp',
    });
    this.version(2).stores({
      userProfiles: 'id, email, role',
      businessConfigs: 'id, name, type',
      subscriptions: 'id, plan, status, expiryDate',
      syncQueue: '++id, tableName, action, timestamp',
      products: 'id, name, brand, category, currentStock',
      stockHistory: '++id, productId, action, timestamp',
    });
    this.version(3).stores({
      userProfiles: 'id, email, role',
      businessConfigs: 'id, name, type',
      subscriptions: 'id, plan, status, expiryDate',
      syncQueue: '++id, tableName, action, timestamp',
      products: 'id, name, brand, category, currentStock',
      stockHistory: '++id, productId, action, timestamp',
      bills: 'id, billNumber, date, timestamp'
    });
    this.version(4).stores({
      userProfiles: 'id, email, role',
      businessConfigs: 'id, name, type',
      subscriptions: 'id, plan, status, expiryDate',
      syncQueue: '++id, tableName, action, timestamp',
      products: 'id, name, brand, category, currentStock',
      stockHistory: '++id, productId, action, timestamp',
      bills: 'id, billNumber, date, timestamp, workerId',
      workerProfiles: 'id, name, role, status, loginEnabled, staffAccountId',
      attendanceRecords: 'id, workerId, date'
    });
    this.version(5).stores({
      userProfiles: 'id, email, role',
      businessConfigs: 'id, name, type',
      subscriptions: 'id, plan, status, expiryDate',
      syncQueue: '++id, tableName, action, timestamp',
      products: 'id, name, brand, category, currentStock',
      stockHistory: '++id, productId, action, timestamp',
      bills: 'id, billNumber, date, timestamp, workerId',
      workerProfiles: 'id, name, role, status, loginEnabled, staffAccountId',
      attendanceRecords: 'id, workerId, date',
      priceHistory: '++id, productId, changedAt, timestamp'
    });
    this.version(6).stores({
      userProfiles: 'id, email, role',
      businessConfigs: 'id, name, type',
      subscriptions: 'id, plan, status, expiryDate',
      syncQueue: '++id, tableName, action, timestamp',
      products: 'id, name, brand, category, currentStock',
      stockHistory: '++id, productId, action, timestamp',
      bills: 'id, billNumber, date, timestamp, workerId',
      workerProfiles: 'id, name, role, status, loginEnabled, staffAccountId',
      attendanceRecords: 'id, workerId, date',
      priceHistory: '++id, productId, changedAt, timestamp',
      workerAdvances: 'id, workerId, date, type, timestamp, settlementStatus'
    });
  }
}

export const db = new ChhuttaPOSDatabase();
