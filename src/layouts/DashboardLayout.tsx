/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Receipt, 
  BarChart3, 
  CreditCard, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Laptop, 
  User,
  Shield,
  WifiOff,
  AlertTriangle,
  Settings,
  ShieldCheck,
  Building,
  Plus
} from 'lucide-react';
import { SubscriptionBanner } from '../components/SubscriptionBanner';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { LegalReconsentModal } from '../components/LegalReconsentModal';
import { hasPermission } from '../utils/permissions';

export const DashboardLayout: React.FC = () => {
  const { user, business, logout, isOwner, changeStaffPassword } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isExpired } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [permVersion, setPermVersion] = useState(0);

  useEffect(() => {
    const handlePermUpdate = () => {
      setPermVersion(prev => prev + 1);
    };
    window.addEventListener('role_permissions_updated', handlePermUpdate);
    return () => window.removeEventListener('role_permissions_updated', handlePermUpdate);
  }, []);

  // First Login Password Update states
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);

    if (newPass.length < 6) {
      setPassError('Password must be at least 6 characters long.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Passwords do not match.');
      return;
    }

    setPassLoading(true);
    try {
      if (user) {
        await changeStaffPassword(user.id, newPass);
        alert('Password updated successfully! Welcome to ChhuttaPOS.');
        navigate('/');
      }
    } catch (err: any) {
      setPassError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setPassLoading(false);
    }
  };

  // Dynamic menu items computed from the active role & permissions
  const getMenuItems = () => {
    const role = user?.role;
    const list: Array<{ name: string; tabLabel: string; path: string; icon: any; blockExpired: boolean }> = [];
    const type = business?.type || 'HYBRID';

    // 1. Overview Dashboard
    if (hasPermission(role, 'dashboard') || isOwner || role === 'MANAGER') {
      list.push({ name: 'Overview', tabLabel: 'Overview', path: '/', icon: LayoutDashboard, blockExpired: false });
    } else if (hasPermission(role, 'own_profile') || hasPermission(role, 'attendance')) {
      // For Staff/Workers who don't have main dashboard
      list.push({ name: 'My Profile', tabLabel: 'Overview', path: '/', icon: LayoutDashboard, blockExpired: false });
    }

    // 2. Services Management Catalog
    if (hasPermission(role, 'inventory')) {
      let catalogName = 'Services Management';
      let tabLabel = 'Services';
      if (type === 'PRODUCT') {
        catalogName = 'Products Catalog';
        tabLabel = 'Products';
      } else if (type === 'HYBRID') {
        catalogName = 'Services & Products';
        tabLabel = 'Catalog';
      }
      list.push({ name: catalogName, tabLabel, path: '/products', icon: ShoppingBag, blockExpired: true });
    }

    // 3. Checkout POS
    if (hasPermission(role, 'billing')) {
      list.push({ name: 'Checkout POS', tabLabel: 'Checkout', path: '/pos', icon: Receipt, blockExpired: true });
    }

    // 4. Business Reports & Insights ONLY
    if (hasPermission(role, 'reports') || isOwner || role === 'MANAGER') {
      list.push({ name: 'Business Reports', tabLabel: 'Business', path: '/reports', icon: BarChart3, blockExpired: false });
    } else if (hasPermission(role, 'own_sales')) {
      list.push({ name: 'My Sales Reports', tabLabel: 'Business', path: '/reports', icon: BarChart3, blockExpired: false });
    }

    // 5. Subscription Plan
    if (hasPermission(role, 'subscription') || isOwner) {
      list.push({ name: 'Subscription Plan', tabLabel: 'Subscription', path: '/subscription', icon: CreditCard, blockExpired: false });
    }

    // 6. Workspace Settings ONLY (Single settings destination with gear icon)
    if (
      hasPermission(role, 'settings') ||
      hasPermission(role, 'staff_management') ||
      hasPermission(role, 'billing_protection') ||
      isOwner
    ) {
      list.push({ name: 'Workspace Settings', tabLabel: 'Settings', path: '/settings', icon: Settings, blockExpired: false });
    }

    return list;
  };

  const menuItems = getMenuItems();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true, state: { message: 'Logged out successfully.' } });
  };

  const handleNav = (path: string, blockExpired: boolean) => {
    if (isExpired && blockExpired) {
      alert('Subscription Expired. Please renew your plan to access this section.');
      navigate('/subscription');
    } else {
      navigate(path);
    }
    setIsMobileMenuOpen(false);
  };

  if (user && user.mustChangePassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 animate-fade-in">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Secure Password Required</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Welcome, <span className="font-semibold text-slate-600 dark:text-slate-300">{user.fullName}</span>! This is your first login. For security, please choose a new personal password.
            </p>
          </div>

          <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Choose a strong password (min 6 chars)"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>

            {passError && (
              <p className="text-[11px] text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 px-3 py-2 rounded-lg leading-normal">
                {passError}
              </p>
            )}

            <button
              type="submit"
              disabled={passLoading}
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
            >
              {passLoading ? 'Updating password...' : 'Update Password & Access POS'}
            </button>
          </form>

          <button
            onClick={handleLogout}
            className="w-full h-10 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
          >
            Cancel / Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <OfflineIndicator />
      
      {/* Top Banner indicating Expiry Warning or Grace Period */}
      <SubscriptionBanner />

      {/* Main Top Header */}
      <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-500/10">
            C
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Chhutta<span className="text-indigo-600 dark:text-indigo-400">POS</span>
            </h1>
            {business?.name && (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/40">
                  {business.name}
                </span>
                <span className={`hidden lg:inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider border ${
                  business.type === 'SERVICE'
                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-900/50'
                    : business.type === 'PRODUCT'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/50'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/50'
                }`}>
                  {business.type === 'SERVICE' ? '💇 Service Business' : business.type === 'PRODUCT' ? '🛍️ Product Retail' : '🔄 Hybrid Mode'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center gap-6">
          {/* System Sync State (Desktop Only) */}
          <div className="hidden md:flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              System Sync: Offline-Ready
            </span>
          </div>

          <div className="hidden md:block h-8 w-[1px] bg-slate-200 dark:bg-slate-800"></div>

          {/* Theme Selector Widget */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center">
            <button 
              onClick={() => setTheme('light')} 
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${theme === 'light' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              title="Light Mode"
            >
              <Sun size={14} />
            </button>
            <button 
              onClick={() => setTheme('dark')} 
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'}`}
              title="Dark Mode"
            >
              <Moon size={14} />
            </button>
            <button 
              onClick={() => setTheme('system')} 
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'}`}
              title="System Theme"
            >
              <Laptop size={14} />
            </button>
          </div>

          {/* User Profile Trigger - Mobile Only */}
          <div className="sm:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center border border-indigo-600/10 dark:border-indigo-500/10 shadow-sm focus:outline-none cursor-pointer"
              id="mobile-profile-drawer-btn"
            >
              {user?.fullName?.charAt(0).toUpperCase()}
            </button>
          </div>

          {/* User Profile Summary with Dropdown - Desktop */}
          <div className="hidden sm:block relative">
            <button 
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4 cursor-pointer focus:outline-none"
              id="user-profile-dropdown-btn"
            >
              <div className="text-right">
                <h4 className="text-sm font-semibold leading-none text-slate-800 dark:text-slate-100">{user?.fullName}</h4>
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                  {user?.role}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-indigo-600/20 dark:border-indigo-500/20 shadow-sm overflow-hidden flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-400">
                {user?.fullName?.charAt(0).toUpperCase()}
              </div>
            </button>

            {isProfileDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setIsProfileDropdownOpen(false)}
                />
                
                <div className="absolute right-0 mt-2.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 z-50 animate-fade-in space-y-3">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Account Profile</h5>
                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{user?.fullName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{user?.email}</p>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left uppercase tracking-wider"
                    >
                      <Settings size={14} />
                      <span>Settings Configuration</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        navigate('/subscription');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left uppercase tracking-wider"
                    >
                      <CreditCard size={14} />
                      <span>Licensing Plan</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-600 dark:text-slate-400 hover:text-red-600 transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      <LogOut size={14} />
                      Secure Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Core View Area with Sidebar on Desktop */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Left Sidebar (hidden on mobiles) */}
        <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 shrink-0 justify-between">
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                Main Console
              </p>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                const isDisabled = isExpired && item.blockExpired;

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path, item.blockExpired)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 group cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-semibold'
                        : isDisabled
                        ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} />
                      <span>{item.name}</span>
                    </div>
                    {isDisabled && (
                      <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold uppercase">
                        Locked
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4 mt-auto">
            {/* PWA Sync Status Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Local Database</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Healthy</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-full"></div>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">248 Items Cached Locally</p>
            </div>

            {/* Sidebar Footer Account Details */}
            <div className="border-t border-slate-150 dark:border-slate-800 pt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3 px-2">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">
                  {user?.fullName?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user?.fullName}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-600 dark:text-slate-400 hover:text-red-600 transition-colors text-xs font-medium cursor-pointer"
              >
                <LogOut size={14} />
                Logout Session
              </button>
            </div>
          </div>
        </aside>

        {/* Active Route Workspace Content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-6 p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Action Button (FAB) for Quick Bill Checkout - Hidden if already on pos page */}
      {location.pathname !== '/pos' && (
        <button
          onClick={() => handleNav('/pos', true)}
          className="fixed bottom-20 lg:bottom-12 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 z-40 group cursor-pointer"
          title="Create New Bill (QuickPOS)"
          id="global-quick-bill-fab"
        >
          <Plus size={24} className="group-hover:scale-110 transition-transform" />
          <span className="absolute right-16 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden sm:block">
            Quick POS Bill
          </span>
        </button>
      )}

      {/* Bottom Status Bar (PWA Style) */}
      <footer className="hidden lg:flex h-8 bg-slate-900 text-white items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <span className="text-[10px] font-bold uppercase tracking-wider">IndexedDB Connected</span>
          </div>
          <span className="text-slate-500 text-[10px]">|</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sync Status: 100% Up-to-Date</span>
        </div>
        <div className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
          ChhuttaPOS v1.0.4 • PWA Build 2026.07.15
        </div>
      </footer>

      {/* Mobile Sticky Bottom Tab Bar (thumb friendly, minimum 48x48 pixel targets) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-40 flex items-center justify-around px-2 shadow-lg safe-bottom">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          const isDisabled = isExpired && item.blockExpired;

          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path, item.blockExpired)}
              className={`flex flex-col items-center justify-center min-w-[56px] h-full gap-1 px-1 text-center cursor-pointer transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : isDisabled
                  ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
              style={{ minWidth: '48px', minHeight: '48px' }}
              title={item.name}
            >
              <div className="relative">
                <Icon size={20} />
                {isDisabled && (
                  <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full" />
                )}
              </div>
              <span className="text-[10px] font-medium leading-none truncate max-w-[70px]">
                {item.tabLabel}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Right Sidebar / Settings Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Slide-out Panel */}
          <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col justify-between p-6 border-l border-slate-200 dark:border-slate-800 transition-all transform animate-slide-left">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    C
                  </div>
                  <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-white uppercase">
                    Terminal Console
                  </h3>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg focus:outline-none"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Profile Card Section */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-indigo-600/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold">
                    {user?.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.fullName}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                    <span className="inline-block text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded uppercase mt-1">
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Drawer Menu Items */}
              <div className="space-y-1">
                <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Navigation Links</p>
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                  const isDisabled = isExpired && item.blockExpired;

                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleNav(item.path, item.blockExpired);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer text-left ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold'
                          : isDisabled
                          ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                      style={{ minHeight: '44px' }}
                    >
                      <Icon size={14} />
                      <span className="flex-1">{item.name}</span>
                      {isDisabled && (
                        <span className="text-[9px] bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold">
                          Locked
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 mt-auto">
              {/* Dynamic Theme selection in Mobile drawer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Appearance Theme</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold capitalize">{theme}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button 
                    onClick={() => setTheme('light')} 
                    className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${theme === 'light' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    <Sun size={12} /> Light
                  </button>
                  <button 
                    onClick={() => setTheme('dark')} 
                    className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${theme === 'dark' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    <Moon size={12} /> Dark
                  </button>
                  <button 
                    onClick={() => setTheme('system')} 
                    className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${theme === 'system' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    <Laptop size={12} /> System
                  </button>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
                style={{ minHeight: '48px' }}
              >
                <LogOut size={14} />
                Secure Logout
              </button>
            </div>
          </div>
        </>
      )}

      {/* Global Legal Policy Re-consent Guard */}
      <LegalReconsentModal />
    </div>
  );
};
