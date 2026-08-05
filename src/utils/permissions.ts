/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from '../types';

export type PermissionKey =
  | 'dashboard'
  | 'billing'
  | 'inventory'
  | 'attendance'
  | 'customers'
  | 'reports'
  | 'own_sales'
  | 'own_profile'
  | 'staff_management'
  | 'billing_protection'
  | 'subscription'
  | 'security'
  | 'settings'
  // System Protected Permissions
  | 'delete_business'
  | 'change_owner_role'
  | 'subscription_ownership'
  | 'rbac_system'
  | 'system_admin'
  // Comprehensive Report Viewing & Export Permissions
  | 'view_complete_reports'
  | 'export_complete_reports'
  | 'view_worker_reports'
  | 'export_worker_reports'
  | 'view_service_reports'
  | 'export_service_reports'
  | 'view_product_reports'
  | 'export_product_reports'
  | 'view_business_insights'
  | 'export_business_insights'
  | 'view_own_reports'
  | 'export_own_reports';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  isSystemProtected?: boolean;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Configurable Business Module Permissions
  { key: 'dashboard', label: 'Dashboard Access / Overview', description: 'Access main business overview dashboard, KPIs, and store performance summary' },
  { key: 'billing', label: 'Billing / Checkout POS', description: 'Access POS checkout screen, add cart items, and process receipts' },
  { key: 'inventory', label: 'Inventory Catalog', description: 'Access and manage products, services, categories, and stock levels' },
  { key: 'attendance', label: 'Attendance Management', description: 'Access attendance logging, shift records, and clock-in logs' },
  { key: 'customers', label: 'Customer Management', description: 'Lookup customers, view directory, and customer ledger' },
  { key: 'reports', label: 'Business Reports Module', description: 'Access store revenue reports, sales analytics, and performance logs' },
  { key: 'view_complete_reports', label: 'View Complete Business Reports', description: 'View business-wide financial statements, total revenue, and payment summaries' },
  { key: 'export_complete_reports', label: 'Export Complete Business Reports', description: 'Export complete business revenue reports and sales statements (PDF, Excel, CSV)' },
  { key: 'view_worker_reports', label: 'View All Worker Reports', description: 'Access performance, commission, and earnings metrics for all workers' },
  { key: 'export_worker_reports', label: 'Export All Worker Reports', description: 'Export performance and commission statements for all workers (PDF, Excel, CSV)' },
  { key: 'view_service_reports', label: 'View Service Reports', description: 'View service popularity, revenue by service, and execution counts' },
  { key: 'export_service_reports', label: 'Export Service Reports', description: 'Export service sales performance and category breakdowns (PDF, Excel, CSV)' },
  { key: 'view_product_reports', label: 'View Product Reports', description: 'View product sales, stock levels, and inventory valuation reports' },
  { key: 'export_product_reports', label: 'Export Product Reports', description: 'Export product inventory and sales sheets (PDF, Excel, CSV)' },
  { key: 'view_business_insights', label: 'View Business Insights & Analytics', description: 'View sales trends, executive summaries, revenue charts, and business intelligence' },
  { key: 'export_business_insights', label: 'Export Business Insights & Analytics', description: 'Export executive summaries, trend charts, and business analytics' },
  { key: 'view_own_reports', label: 'View Own Worker Performance', description: 'View personal completed jobs, personal commission, assigned services, and statistics' },
  { key: 'export_own_reports', label: 'Export Own Worker Report', description: 'Export personal worker performance report in PDF, Excel, or CSV' },
  { key: 'own_sales', label: 'View Own Sales ("My Sales")', description: 'View personal sales receipts and personal daily sales total' },
  { key: 'own_profile', label: 'View Own Profile', description: 'View personal staff details, attendance log, and performance' },
  { key: 'staff_management', label: 'Worker & Staff Management', description: 'Register, edit, and manage worker profiles, staff accounts, wages, and roles' },
  { key: 'billing_protection', label: 'Billing Protection', description: 'Configure billing safety rules, receipt locking, and undo settings' },
  { key: 'subscription', label: 'Subscription Plan', description: 'Manage commercial subscription plans and renewal licenses' },
  { key: 'settings', label: 'Workspace Settings', description: 'Modify store profile, logo, address, GSTIN, UPI QR, and store configurations' },
  
  // Permanently Protected System Security Permissions
  { key: 'delete_business', label: 'Delete Business Entity', description: 'Permanently purge business entity, database records, and historical operational data', isSystemProtected: true },
  { key: 'change_owner_role', label: 'Change Owner Role / Grant Owner', description: 'Transfer root primary ownership credentials, alter Owner role, or grant Owner privileges', isSystemProtected: true },
  { key: 'subscription_ownership', label: 'Modify Subscription Ownership', description: 'Transfer or modify commercial license ownership and root billing entity', isSystemProtected: true },
  { key: 'rbac_system', label: 'Modify RBAC Architecture', description: 'Modify core system role definitions, security hierarchy, and permission structure', isSystemProtected: true },
  { key: 'security', label: 'Security & Root Authority', description: 'Manage system security, PIN codes, root encryption, and primary authority controls', isSystemProtected: true },
  { key: 'system_admin', label: 'System Administration', description: 'Access root infrastructure settings, system database administration, and security logs', isSystemProtected: true },
];

export type RolePermissions = Record<PermissionKey, boolean>;

export const DEFAULT_ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  [UserRole.OWNER]: {
    dashboard: true,
    billing: true,
    inventory: true,
    attendance: true,
    customers: true,
    reports: true,
    view_complete_reports: true,
    export_complete_reports: true,
    view_worker_reports: true,
    export_worker_reports: true,
    view_service_reports: true,
    export_service_reports: true,
    view_product_reports: true,
    export_product_reports: true,
    view_business_insights: true,
    export_business_insights: true,
    view_own_reports: true,
    export_own_reports: true,
    own_sales: true,
    own_profile: true,
    staff_management: true,
    billing_protection: true,
    subscription: true,
    security: true,
    settings: true,
    delete_business: true,
    change_owner_role: true,
    subscription_ownership: true,
    rbac_system: true,
    system_admin: true,
  },
  [UserRole.MANAGER]: {
    dashboard: true,
    billing: true,
    inventory: true,
    attendance: true,
    customers: true,
    reports: true,
    view_complete_reports: true,
    export_complete_reports: true,
    view_worker_reports: true,
    export_worker_reports: true,
    view_service_reports: true,
    export_service_reports: true,
    view_product_reports: true,
    export_product_reports: true,
    view_business_insights: true,
    export_business_insights: true,
    view_own_reports: true,
    export_own_reports: true,
    own_sales: true,
    own_profile: true,
    staff_management: false,
    billing_protection: false,
    subscription: false,
    security: false,
    settings: false,
    delete_business: false,
    change_owner_role: false,
    subscription_ownership: false,
    rbac_system: false,
    system_admin: false,
  },
  [UserRole.STAFF]: {
    dashboard: false,
    billing: true,
    inventory: false,
    attendance: false,
    customers: true,
    reports: false,
    view_complete_reports: false,
    export_complete_reports: false,
    view_worker_reports: false,
    export_worker_reports: false,
    view_service_reports: false,
    export_service_reports: false,
    view_product_reports: false,
    export_product_reports: false,
    view_business_insights: false,
    export_business_insights: false,
    view_own_reports: true,
    export_own_reports: true,
    own_sales: true,
    own_profile: true,
    staff_management: false,
    billing_protection: false,
    subscription: false,
    security: false,
    settings: false,
    delete_business: false,
    change_owner_role: false,
    subscription_ownership: false,
    rbac_system: false,
    system_admin: false,
  },
  [UserRole.WORKER]: {
    dashboard: false,
    billing: false,
    inventory: false,
    attendance: true,
    customers: false,
    reports: false,
    view_complete_reports: false,
    export_complete_reports: false,
    view_worker_reports: false,
    export_worker_reports: false,
    view_service_reports: false,
    export_service_reports: false,
    view_product_reports: false,
    export_product_reports: false,
    view_business_insights: false,
    export_business_insights: false,
    view_own_reports: true,
    export_own_reports: true,
    own_sales: false,
    own_profile: true,
    staff_management: false,
    billing_protection: false,
    subscription: false,
    security: false,
    settings: false,
    delete_business: false,
    change_owner_role: false,
    subscription_ownership: false,
    rbac_system: false,
    system_admin: false,
  },
};

export const PERMISSIONS_STORAGE_KEY = 'chhutta_role_permissions';

export function getAllRolePermissions(): Record<string, RolePermissions> {
  try {
    const saved = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const result: Record<string, RolePermissions> = {
        [UserRole.OWNER]: { ...DEFAULT_ROLE_PERMISSIONS[UserRole.OWNER] }, // OWNER is immutable (full access)
        [UserRole.MANAGER]: { ...DEFAULT_ROLE_PERMISSIONS[UserRole.MANAGER], ...(parsed[UserRole.MANAGER] || {}) },
        [UserRole.STAFF]: { ...DEFAULT_ROLE_PERMISSIONS[UserRole.STAFF], ...(parsed[UserRole.STAFF] || {}) },
        [UserRole.WORKER]: { ...DEFAULT_ROLE_PERMISSIONS[UserRole.WORKER], ...(parsed[UserRole.WORKER] || {}) },
      };

      // Guarantee system protected permissions remain false for non-owner roles
      PERMISSION_DEFINITIONS.forEach((p) => {
        if (p.isSystemProtected) {
          if (result[UserRole.MANAGER]) result[UserRole.MANAGER][p.key] = false;
          if (result[UserRole.STAFF]) result[UserRole.STAFF][p.key] = false;
          if (result[UserRole.WORKER]) result[UserRole.WORKER][p.key] = false;
        }
      });

      return result;
    }
  } catch (e) {
    console.error('Error loading role permissions:', e);
  }

  const result = {
    [UserRole.OWNER]: { ...DEFAULT_ROLE_PERMISSIONS[UserRole.OWNER] },
    [UserRole.MANAGER]: { ...DEFAULT_ROLE_PERMISSIONS[UserRole.MANAGER] },
    [UserRole.STAFF]: { ...DEFAULT_ROLE_PERMISSIONS[UserRole.STAFF] },
    [UserRole.WORKER]: { ...DEFAULT_ROLE_PERMISSIONS[UserRole.WORKER] },
  };

  PERMISSION_DEFINITIONS.forEach((p) => {
    if (p.isSystemProtected) {
      if (result[UserRole.MANAGER]) result[UserRole.MANAGER][p.key] = false;
      if (result[UserRole.STAFF]) result[UserRole.STAFF][p.key] = false;
      if (result[UserRole.WORKER]) result[UserRole.WORKER][p.key] = false;
    }
  });

  return result;
}

export function saveAllRolePermissions(updated: Record<string, RolePermissions>): void {
  // Ensure OWNER remains fully enabled
  updated[UserRole.OWNER] = { ...DEFAULT_ROLE_PERMISSIONS[UserRole.OWNER] };
  
  // System protected permissions hard lock for non-owner roles
  PERMISSION_DEFINITIONS.forEach((p) => {
    if (p.isSystemProtected) {
      if (updated[UserRole.MANAGER]) updated[UserRole.MANAGER][p.key] = false;
      if (updated[UserRole.STAFF]) updated[UserRole.STAFF][p.key] = false;
      if (updated[UserRole.WORKER]) updated[UserRole.WORKER][p.key] = false;
    }
  });

  localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('role_permissions_updated'));
}

export function hasPermission(role: string | undefined, permission: PermissionKey): boolean {
  if (!role) return false;
  if (role === UserRole.OWNER) return true; // Owner has full access to everything

  // Check system protected permissions - non-owners can NEVER have system protected permissions
  const permDef = PERMISSION_DEFINITIONS.find((p) => p.key === permission);
  if (permDef?.isSystemProtected) {
    return false;
  }

  const permissionsMap = getAllRolePermissions();
  const rolePerms = permissionsMap[role];
  if (!rolePerms) return false;
  return !!rolePerms[permission];
}

/**
 * Report view authority validator
 */
export function canViewReport(
  role: string | undefined,
  reportType: 'complete' | 'workers' | 'services' | 'products' | 'advances' | 'insights' | 'own' | 'dashboard',
  targetWorkerId?: string,
  currentUserId?: string
): boolean {
  if (!role) return false;
  if (role === UserRole.OWNER) return true;

  if (reportType === 'own') {
    if (role === UserRole.WORKER) {
      if (targetWorkerId && currentUserId && targetWorkerId !== currentUserId && targetWorkerId !== `WORKER-${currentUserId}`) {
        return false;
      }
    }
    return hasPermission(role, 'view_own_reports');
  }

  if (reportType === 'complete' || reportType === 'dashboard') return hasPermission(role, 'view_complete_reports') || hasPermission(role, 'reports');
  if (reportType === 'workers' || reportType === 'advances') return hasPermission(role, 'view_worker_reports') || hasPermission(role, 'reports');
  if (reportType === 'services') return hasPermission(role, 'view_service_reports') || hasPermission(role, 'reports');
  if (reportType === 'products') return hasPermission(role, 'view_product_reports') || hasPermission(role, 'reports');
  if (reportType === 'insights') return hasPermission(role, 'view_business_insights') || hasPermission(role, 'reports');

  return false;
}

/**
 * Report export authority validator
 */
export function canExportReport(
  role: string | undefined,
  reportType: 'complete' | 'workers' | 'services' | 'products' | 'advances' | 'insights' | 'own' | 'dashboard',
  targetWorkerId?: string,
  currentUserId?: string
): boolean {
  if (!role) return false;
  if (role === UserRole.OWNER) return true;

  if (reportType === 'own') {
    if (role === UserRole.WORKER) {
      if (targetWorkerId && currentUserId && targetWorkerId !== currentUserId && targetWorkerId !== `WORKER-${currentUserId}`) {
        return false;
      }
    }
    return hasPermission(role, 'export_own_reports');
  }

  if (reportType === 'complete' || reportType === 'dashboard') return hasPermission(role, 'export_complete_reports');
  if (reportType === 'workers' || reportType === 'advances') return hasPermission(role, 'export_worker_reports');
  if (reportType === 'services') return hasPermission(role, 'export_service_reports');
  if (reportType === 'products') return hasPermission(role, 'export_product_reports');
  if (reportType === 'insights') return hasPermission(role, 'export_business_insights');

  return false;
}

export function validateReportAccess(
  role: string | undefined,
  action: 'view' | 'export',
  reportType: 'complete' | 'workers' | 'services' | 'products' | 'advances' | 'insights' | 'own' | 'dashboard',
  targetWorkerId?: string,
  currentUserId?: string
): { allowed: boolean; message: string } {
  const isAllowed = action === 'view' 
    ? canViewReport(role, reportType as any, targetWorkerId, currentUserId)
    : canExportReport(role, reportType as any, targetWorkerId, currentUserId);

  if (isAllowed) {
    return { allowed: true, message: 'Access granted' };
  }

  return {
    allowed: false,
    message: 'You do not have permission to perform this action.'
  };
}

export function canAccessRoute(role: string | undefined, path: string): boolean {
  if (!role) return false;
  if (role === UserRole.OWNER) return true;

  const normalized = path.toLowerCase().replace(/^\//, '');

  if (normalized === 'business-config') {
    return hasPermission(role, 'settings');
  }

  if (normalized === '' || normalized === 'dashboard') {
    if (role === UserRole.WORKER) return true; // Worker land on own dashboard
    return (
      hasPermission(role, 'dashboard') ||
      hasPermission(role, 'billing') ||
      hasPermission(role, 'own_sales') ||
      hasPermission(role, 'own_profile') ||
      hasPermission(role, 'attendance')
    );
  }

  if (normalized === 'pos') {
    return hasPermission(role, 'billing');
  }

  if (normalized === 'products') {
    return hasPermission(role, 'inventory');
  }

  if (normalized === 'reports') {
    if (role === UserRole.WORKER) return true; // Accesses worker personal portal
    return hasPermission(role, 'reports') || hasPermission(role, 'view_complete_reports') || hasPermission(role, 'own_sales');
  }

  if (normalized === 'subscription') {
    return hasPermission(role, 'subscription');
  }

  if (normalized === 'settings') {
    return (
      hasPermission(role, 'settings') ||
      hasPermission(role, 'staff_management') ||
      hasPermission(role, 'billing_protection') ||
      hasPermission(role, 'own_profile')
    );
  }

  return true;
}

