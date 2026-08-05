/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { UserRole } from '../types';
import { hasPermission, canAccessRoute, PermissionKey } from '../utils/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: PermissionKey;
  /**
   * If true, this route remains accessible even when subscription is expired
   */
  allowExpired?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermission,
  allowExpired = false,
}) => {
  const { user, business, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { isExpired, isLoading: subLoading } = useSubscription();
  const location = useLocation();

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Initializing ChhuttaPOS Secure Workspace...
          </p>
        </div>
      </div>
    );
  }

  // 1. Authenticate session
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 1b. Real-time Staff session verification (disabled/deleted check)
  if (user.role !== UserRole.OWNER) {
    const staffJson = localStorage.getItem('chhuta_mock_staff') || '[]';
    const staffList = JSON.parse(staffJson);
    const staffExists = staffList.find((s: any) => s.id === user.id);
    if (!staffExists || ['DISABLED', 'INACTIVE', 'SUSPENDED'].includes(staffExists.status)) {
      logout();
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  // 2. Check if business configuration is complete (Owner only)
  const isOwner = user.role === UserRole.OWNER;
  if (isOwner && !business && location.pathname !== '/register-business') {
    return <Navigate to="/register-business" replace />;
  }

  // 3. Authorize subscription status
  if (isExpired && !allowExpired) {
    // If the subscription is expired and the page doesn't allow expired access, redirect to subscription renewal page
    return <Navigate to="/subscription" state={{ from: location }} replace />;
  }

  // 4. Authorize Role & Permission
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!canAccessRoute(user.role, location.pathname)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
