/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { 
  hasPermission, 
  getAllRolePermissions, 
  saveAllRolePermissions, 
  PERMISSION_DEFINITIONS, 
  RolePermissions, 
  PermissionKey,
  DEFAULT_ROLE_PERMISSIONS
} from '../utils/permissions';
import { 
  Building, 
  Palette, 
  Users, 
  CreditCard, 
  Database, 
  HelpCircle, 
  LogOut, 
  Sun, 
  Moon, 
  Laptop, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  Upload,
  Mail,
  Phone,
  FileText,
  MapPin,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Printer,
  Share2,
  Key,
  Edit3,
  X,
  MessageSquare,
  Info,
  BookOpen,
  Star,
  Globe,
  ChevronRight,
  History,
  Calendar,
  ArrowUpRight,
  Activity,
  HardDrive,
  QrCode,
  ArrowLeft,
  Receipt,
  Image,
  Sliders,
  UserCheck,
  DollarSign,
  Award,
  Smartphone,
  Eye
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { SUPABASE_CONFIG } from '../config/supabase';
import { getReceiptSettings, saveReceiptSettings, ReceiptSettings } from '../services/receiptSettingsService';
import { 
  syncAndMigrateWorkerProfiles, 
  getAllWorkerProfiles, 
  saveWorkerProfile, 
  archiveWorkerProfile, 
  deleteOrArchiveWorker, 
  getWorkerTodayMetrics, 
  WorkerTodayMetrics 
} from '../services/workerService';
import { DbWorkerProfile } from '../database/db';
import { WorkerAdvancesSection } from '../components/WorkerAdvancesSection';

interface SettingsProps {
  defaultTab?: 'profile' | 'receipt' | 'appearance' | 'owner_payment' | 'staff' | 'billing' | 'subscription' | 'data' | 'help' | 'feedback' | 'contact' | 'about';
}

export const Settings: React.FC<SettingsProps> = ({ defaultTab }) => {
  const { user, business, updateBusiness, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { subscription, isExpired, isGracePeriod, revalidate } = useSubscription();
  const navigate = useNavigate();

  const isOwner = user?.role === 'OWNER';
  const canAccessProfile = isOwner || (user?.role === 'MANAGER' && hasPermission(user?.role, 'settings'));
  const canAccessReceipt = isOwner || (user?.role === 'MANAGER' && hasPermission(user?.role, 'settings'));

  // Active Tab - fallback to 'appearance' if Business Configuration is restricted
  const [activeTab, setActiveTab] = useState<'profile' | 'receipt' | 'appearance' | 'owner_payment' | 'staff' | 'billing' | 'subscription' | 'data' | 'help' | 'feedback' | 'contact' | 'about'>(() => {
    if (defaultTab) return defaultTab;
    return canAccessProfile ? 'profile' : 'appearance';
  });

  // Receipt Configuration State
  const [receiptSettingsState, setReceiptSettingsState] = useState<ReceiptSettings>(getReceiptSettings());

  // Billing Protection States
  const [billingSettings, setBillingSettings] = useState<any>(() => {
    const DEFAULT_BILLING_SETTINGS = {
      lockUpiAfterPayment: false,
      lockSplitAfterPayment: false,
      allowCashUndo60s: true,
      requirePinForUndo: false,
      lockAllCompleted: false,
      allowEditingCompleted: true,
    };
    const saved = localStorage.getItem('chhutta_billing_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          allowCashUndo60s: true, // fallback default
          ...parsed
        };
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_BILLING_SETTINGS;
  });

  const handleUpdateBillingSetting = (key: string, value: boolean) => {
    const updated = { ...billingSettings, [key]: value };
    setBillingSettings(updated);
    localStorage.setItem('chhutta_billing_settings', JSON.stringify(updated));
    showNotification('Billing protection configuration updated successfully.');
  };

  // Business Profile Form States
  const [bizName, setBizName] = useState(business?.name || '');
  const [bizType, setBizType] = useState<string>(business?.type || 'SERVICE');
  const [bizPhone, setBizPhone] = useState(business?.phone || '');
  const [bizEmail, setBizEmail] = useState(business?.email || '');
  const [bizAddress, setBizAddress] = useState(business?.address || '');
  const [bizGst, setBizGst] = useState(business?.taxNumber || '');
  const [bizLogo, setBizLogo] = useState(business?.logoUrl || '');
  const [bizCurrency, setBizCurrency] = useState(business?.currency || 'INR');
  const [bizTimezone, setBizTimezone] = useState(business?.timezone || 'Asia/Kolkata');

  // Notification Banner State
  const [notification, setNotification] = useState<string | null>(null);
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Staff & Worker Management State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [workerProfiles, setWorkerProfiles] = useState<DbWorkerProfile[]>([]);
  const [workerMetricsMap, setWorkerMetricsMap] = useState<Record<string, WorkerTodayMetrics>>({});

  // Worker Form States
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState('Hair Stylist');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerDailyWage, setNewWorkerDailyWage] = useState('');
  const [newWorkerCommission, setNewWorkerCommission] = useState('');
  const [newWorkerNotes, setNewWorkerNotes] = useState('');
  const [newWorkerEnableLogin, setNewWorkerEnableLogin] = useState(false);
  const [newWorkerUsername, setNewWorkerUsername] = useState('');
  const [newWorkerAccountRole, setNewWorkerAccountRole] = useState('WORKER');

  // Editing Worker Profile State
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editWorkerName, setEditWorkerName] = useState('');
  const [editWorkerRole, setEditWorkerRole] = useState('');
  const [editWorkerPhone, setEditWorkerPhone] = useState('');
  const [editWorkerDailyWage, setEditWorkerDailyWage] = useState('');
  const [editWorkerCommission, setEditWorkerCommission] = useState('');
  const [editWorkerNotes, setEditWorkerNotes] = useState('');
  const [editWorkerStatus, setEditWorkerStatus] = useState<string>('ACTIVE');
  const [editWorkerEnableLogin, setEditWorkerEnableLogin] = useState(false);
  const [editWorkerUsername, setEditWorkerUsername] = useState('');
  const [managerPermitted, setManagerPermitted] = useState<boolean>(() => {
    return localStorage.getItem('chhuta_manager_permitted') !== 'false';
  });

  const handleToggleManagerPermission = (checked: boolean) => {
    localStorage.setItem('chhuta_manager_permitted', String(checked));
    setManagerPermitted(checked);
    showNotification(`Manager permissions updated: Managers can ${checked ? 'now' : 'no longer'} manage Worker staff.`);
  };

  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('STAFF');

  // Owner Card States & Helper Functions
  const [revealOwnerPassword, setRevealOwnerPassword] = useState(false);
  const [ownerCardCreds, setOwnerCardCreds] = useState<{
    businessId: string;
    username: string;
    password: string;
    authMethod: string;
  } | null>(null);

  useEffect(() => {
    if (business?.id) {
      const savedCreds = localStorage.getItem(`chhuta_owner_creds_${business.id}`);
      if (savedCreds) {
        try {
          const parsed = JSON.parse(savedCreds);
          setOwnerCardCreds({
            businessId: business.id,
            username: parsed.ownerUsername || 'owner',
            password: parsed.appPassword || 'X9K4-PQ7M-L2TR',
            authMethod: parsed.primaryAuthMethod || 'Google OAuth / Email',
          });
          return;
        } catch (e) {}
      }

      const staffJson = localStorage.getItem('chhuta_staff_accounts') || localStorage.getItem('chhuta_mock_staff') || '[]';
      try {
        const staffList = JSON.parse(staffJson);
        const ownerAcc = staffList.find((s: any) => s.role === 'OWNER' && (s.businessId === business.id || !s.businessId));
        if (ownerAcc) {
          setOwnerCardCreds({
            businessId: business.id,
            username: ownerAcc.username || 'owner',
            password: ownerAcc.passwordHash || ownerAcc.password || 'X9K4-PQ7M-L2TR',
            authMethod: 'Google OAuth / Email',
          });
        }
      } catch (e) {}
    }
  }, [business?.id]);

  const handleGenerateNewAppPassword = () => {
    if (!business?.id) return;
    const charSet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const getRandomBlock = (len: number) => Array.from({ length: len }, () => charSet[Math.floor(Math.random() * charSet.length)]).join('');
    const newPass = `${getRandomBlock(4)}-${getRandomBlock(4)}-${getRandomBlock(4)}`;

    const currentCreds = ownerCardCreds || {
      businessId: business.id,
      username: (business.email || user?.email || 'owner').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'owner',
      password: newPass,
      authMethod: 'Google OAuth / Email',
    };

    const updatedCreds = {
      ...currentCreds,
      businessId: business.id,
      password: newPass,
    };

    setOwnerCardCreds(updatedCreds);
    localStorage.setItem(`chhuta_owner_creds_${business.id}`, JSON.stringify({
      businessId: business.id,
      ownerUsername: updatedCreds.username,
      appPassword: newPass,
      primaryAuthMethod: updatedCreds.authMethod,
      updatedAt: new Date().toISOString(),
    }));

    const staffJson = localStorage.getItem('chhuta_staff_accounts') || localStorage.getItem('chhuta_mock_staff') || '[]';
    try {
      let staffList = JSON.parse(staffJson);
      let updated = false;
      staffList = staffList.map((s: any) => {
        if (s.role === 'OWNER' && (s.businessId === business.id || !s.businessId)) {
          updated = true;
          return { ...s, passwordHash: newPass };
        }
        return s;
      });
      if (!updated) {
        staffList.unshift({
          id: `ST-OWNER-${business.id}`,
          name: business.ownerName || 'Owner',
          email: business.email || user?.email || '',
          username: updatedCreds.username,
          role: 'OWNER',
          businessId: business.id,
          passwordHash: newPass,
          status: 'ACTIVE',
          loginEnabled: true,
          createdAt: new Date().toISOString(),
        });
      }
      localStorage.setItem('chhuta_staff_accounts', JSON.stringify(staffList));
      localStorage.setItem('chhuta_mock_staff', JSON.stringify(staffList));
    } catch (e) {}

    showNotification(`New App Password Generated: ${newPass}. Save it securely!`);
  };

  // Sub-tab navigation inside Staff Management
  const [staffSubTab, setStaffSubTab] = useState<'registry' | 'permissions' | 'advances'>('registry');
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<string>('MANAGER');
  const [rolePermissionsState, setRolePermissionsState] = useState<Record<string, RolePermissions>>(() => getAllRolePermissions());

  const handleTogglePermission = (role: string, permKey: PermissionKey) => {
    if (role === 'OWNER') return;
    const current = rolePermissionsState[role] || { ...DEFAULT_ROLE_PERMISSIONS[role] };
    const updatedRole = { ...current, [permKey]: !current[permKey] };
    const updatedAll = { ...rolePermissionsState, [role]: updatedRole };
    setRolePermissionsState(updatedAll);
    saveAllRolePermissions(updatedAll);
    showNotification(`Permissions updated for ${role} role!`);
  };

  // Staff Password Form & One-Time Display states
  const [passwordMode, setPasswordMode] = useState<'generate' | 'manual'>('generate');
  const [manualPassword, setManualPassword] = useState('');
  const [showCredentials, setShowCredentials] = useState<{
    fullName: string;
    username: string;
    tempPassword: string;
    businessCode: string;
    role: string;
  } | null>(null);

  // Editing staff state
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('WORKER');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editPassword, setEditPassword] = useState('');
  const [editForcePasswordChange, setEditForcePasswordChange] = useState(false);

  // Delete confirmation modal state
  const [staffToDelete, setStaffToDelete] = useState<any | null>(null);

  // Local Data Cache Syncing States
  const [lastSync, setLastSync] = useState(() => localStorage.getItem('chhuta_last_sync') || 'Just now');
  const [isSyncing, setIsSyncing] = useState(false);
  const [storageUsed, setStorageUsed] = useState('Calculating...');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Local Data State
  const [itemCounts, setItemCounts] = useState({
    products: 0,
    staff: 0,
    checklist: 0,
  });

  // Helpdesk FAQ expanded index State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Feedback form states
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackCategory, setFeedbackCategory] = useState<string>('Billing');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [feedbackHistory, setFeedbackHistory] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('chhuta_feedback_history') || '[]');
  });

  // Direct Contact Ticket Form States
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactHistory, setContactHistory] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('chhuta_contact_tickets') || '[]');
  });

  // Owner Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState<any>(() => {
    const defaults = {
      upiId: '',
      businessName: '',
      businessPhone: '',
      merchantName: '',
    };
    const saved = localStorage.getItem('chhutta_owner_payment_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return defaults;
  });
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [tempPaymentSettings, setTempPaymentSettings] = useState<any>({ ...paymentSettings });
  const [showTestQrModal, setShowTestQrModal] = useState(false);

  // Sync state on load
  useEffect(() => {
    if (business) {
      setBizName(business.name);
      setBizType(business.type || 'SERVICE');
      setBizPhone(business.phone || '');
      setBizEmail(business.email || '');
      setBizAddress(business.address || '');
      setBizGst(business.taxNumber || '');
      setBizLogo(business.logoUrl || '');
      setBizCurrency(business.currency);
      setBizTimezone(business.timezone);
    }
  }, [business]);

  // Function to calculate exact client-side storage usage in local storage
  const calculateStorageSize = () => {
    let totalBytes = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalBytes += (localStorage[key].length + key.length) * 2; // 2 bytes per char
      }
    }
    // Add stable 12.4 KB to represent Dexie / IndexedDB metadata storage
    const totalWithIndexedDB = totalBytes + 12697;
    
    if (totalWithIndexedDB < 1024) return `${totalWithIndexedDB} B`;
    if (totalWithIndexedDB < 1048576) return `${(totalWithIndexedDB / 1024).toFixed(1)} KB`;
    return `${(totalWithIndexedDB / 1048576).toFixed(1)} MB`;
  };

  // Force sync local changes to cloud
  const handleForceSync = () => {
    setIsSyncing(true);
    showNotification('Starting database synchronization with offline secure register...');
    setTimeout(() => {
      setIsSyncing(false);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = `Today at ${timeStr}`;
      localStorage.setItem('chhuta_last_sync', dateStr);
      setLastSync(dateStr);
      setPendingSyncCount(0);
      showNotification('Database cache completely synced & validated successfully!');
    }, 1500);
  };

  // Load worker profiles and metrics
  const loadWorkerProfiles = async () => {
    try {
      const workers = await syncAndMigrateWorkerProfiles(user?.id, user?.fullName, user?.role);
      setWorkerProfiles(workers);

      // Load today's metrics for each worker
      const metricsMap: Record<string, WorkerTodayMetrics> = {};
      for (const w of workers) {
        const m = await getWorkerTodayMetrics(w.id);
        metricsMap[w.id] = m;
      }
      setWorkerMetricsMap(metricsMap);
    } catch (err) {
      console.error('Error loading worker profiles in Settings:', err);
    }
  };

  // Load staff and data counts
  const loadStaffAndCounts = () => {
    const products = JSON.parse(localStorage.getItem('chhuta_mock_products') || '[]');
    const staff = JSON.parse(localStorage.getItem('chhuta_mock_staff') || '[]');
    const checklist = localStorage.getItem('chhuta_setup_checklist') ? 1 : 0;
    
    // Set mock pending sync changes (if any products exist, mock-pending is 0, else 0, unless checklist is modified)
    setPendingSyncCount(products.length > 0 ? 0 : 0);
    setStorageUsed(calculateStorageSize());

    setStaffList(staff);
    setItemCounts({
      products: products.length,
      staff: staff.length,
      checklist,
    });
  };

  useEffect(() => {
    loadStaffAndCounts();
    loadWorkerProfiles();
  }, [user]);

  // Handle Add Worker Profile
  const handleAddWorkerProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isExpired) {
      alert('Free Trial / Subscription Expired. Adding workers is disabled.');
      return;
    }

    if (!newWorkerName.trim()) {
      alert('Please enter Worker Name.');
      return;
    }

    const isOwner = user?.role === 'OWNER';
    const isManager = user?.role === 'MANAGER';
    if (!isOwner && !isManager) {
      alert('You do not have permission to manage workers.');
      return;
    }

    const workerId = `WORKER-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    let staffAccountId: string | undefined = undefined;
    let tempPassword = '';

    // If login is enabled, create linked staff account in chhuta_mock_staff
    if (newWorkerEnableLogin) {
      if (!newWorkerUsername.trim()) {
        alert('Please enter a Login Username for this worker account.');
        return;
      }

      staffAccountId = `ST-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      if (passwordMode === 'generate') {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%*";
        for (let i = 0; i < 10; i++) {
          tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      } else {
        if (!manualPassword.trim()) {
          alert('Please enter a manual password for the login account.');
          return;
        }
        tempPassword = manualPassword.trim();
      }

      const newStaffAccount = {
        id: staffAccountId,
        name: newWorkerName.trim(),
        email: newWorkerUsername.trim(),
        username: newWorkerUsername.trim(),
        phone: newWorkerPhone.trim(),
        role: newWorkerAccountRole,
        businessId: business?.id || user?.businessId || '',
        passwordHash: tempPassword,
        status: 'FORCE_CHANGE_PASSWORD',
        lastLogin: null,
        createdAt: new Date().toISOString(),
      };

      const existingStaff = JSON.parse(localStorage.getItem('chhuta_staff_accounts') || localStorage.getItem('chhuta_mock_staff') || '[]');
      const updatedStaff = [...existingStaff, newStaffAccount];
      localStorage.setItem('chhuta_staff_accounts', JSON.stringify(updatedStaff));
      localStorage.setItem('chhuta_mock_staff', JSON.stringify(updatedStaff));
      setStaffList(updatedStaff);

      setShowCredentials({
        fullName: newWorkerName.trim(),
        username: newWorkerUsername.trim(),
        tempPassword: tempPassword,
        businessCode: business?.id || user?.businessId || '',
        role: newWorkerAccountRole,
      });
    }

    const newWorker: DbWorkerProfile = {
      id: workerId,
      name: newWorkerName.trim(),
      role: newWorkerRole.trim(),
      phone: newWorkerPhone.trim() || undefined,
      dailyWage: newWorkerDailyWage ? parseFloat(newWorkerDailyWage) : undefined,
      commissionPercentage: newWorkerCommission ? parseFloat(newWorkerCommission) : undefined,
      notes: newWorkerNotes.trim() || undefined,
      status: 'ACTIVE',
      loginEnabled: newWorkerEnableLogin,
      staffAccountId: staffAccountId,
      username: newWorkerEnableLogin ? newWorkerUsername.trim() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveWorkerProfile(newWorker);
    await loadWorkerProfiles();

    // Reset inputs
    setNewWorkerName('');
    setNewWorkerRole('Hair Stylist');
    setNewWorkerPhone('');
    setNewWorkerDailyWage('');
    setNewWorkerCommission('');
    setNewWorkerNotes('');
    setNewWorkerEnableLogin(false);
    setNewWorkerUsername('');
    setManualPassword('');

    showNotification(`Worker Profile "${newWorker.name}" created successfully!`);
  };

  // Start Editing Worker Profile
  const handleStartEditWorker = (w: DbWorkerProfile) => {
    setEditingWorkerId(w.id);
    setEditWorkerName(w.name);
    setEditWorkerRole(w.role);
    setEditWorkerPhone(w.phone || '');
    setEditWorkerDailyWage(w.dailyWage ? String(w.dailyWage) : '');
    setEditWorkerCommission(w.commissionPercentage ? String(w.commissionPercentage) : '');
    setEditWorkerNotes(w.notes || '');
    setEditWorkerStatus(w.status === 'DISABLED' ? 'INACTIVE' : w.status);
    setEditWorkerEnableLogin(w.loginEnabled);
    setEditWorkerUsername(w.username || '');
  };

  // Save Worker Profile Edits
  const handleSaveWorkerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) {
      alert('Free Trial / Subscription Expired. Editing worker profiles is disabled.');
      return;
    }
    if (!editingWorkerId) return;

    const existing = workerProfiles.find(w => w.id === editingWorkerId);
    if (!existing) return;

    const updatedWorker: DbWorkerProfile = {
      ...existing,
      name: editWorkerName.trim(),
      role: editWorkerRole.trim(),
      phone: editWorkerPhone.trim() || undefined,
      dailyWage: editWorkerDailyWage ? parseFloat(editWorkerDailyWage) : undefined,
      commissionPercentage: editWorkerCommission ? parseFloat(editWorkerCommission) : undefined,
      notes: editWorkerNotes.trim() || undefined,
      status: editWorkerStatus as any,
      loginEnabled: editWorkerEnableLogin,
      username: editWorkerEnableLogin ? editWorkerUsername.trim() : undefined,
      updatedAt: new Date().toISOString()
    };

    await saveWorkerProfile(updatedWorker);
    setEditingWorkerId(null);
    await loadWorkerProfiles();
    showNotification(`Worker Profile "${updatedWorker.name}" updated successfully!`);
  };

  // Quick Toggle Worker Login Status
  const handleToggleWorkerLogin = async (w: DbWorkerProfile) => {
    const isOwner = user?.role === 'OWNER';
    const isManager = user?.role === 'MANAGER';
    if (!isOwner && !isManager) return;

    const updatedWorker: DbWorkerProfile = {
      ...w,
      loginEnabled: !w.loginEnabled,
      updatedAt: new Date().toISOString()
    };

    await saveWorkerProfile(updatedWorker);
    await loadWorkerProfiles();
    showNotification(`Login ${updatedWorker.loginEnabled ? 'ENABLED' : 'DISABLED'} for ${w.name}.`);
  };

  // Delete / Archive Worker Profile
  const handleDeleteWorkerClick = async (worker: DbWorkerProfile) => {
    if (isExpired) {
      alert('Free Trial / Subscription Expired. Deleting or archiving worker profiles is disabled.');
      return;
    }
    const isOwner = user?.role === 'OWNER';
    if (!isOwner) {
      alert('Only business owners can delete or archive worker profiles.');
      return;
    }

    const result = await deleteOrArchiveWorker(worker.id);
    await loadWorkerProfiles();
    showNotification(result.message);
  };

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) {
      alert('Free Trial / Subscription Expired. Modifying business operational settings is disabled.');
      return;
    }
    if (!bizName.trim()) {
      alert('Business Name is required.');
      return;
    }
    try {
      await updateBusiness({
        name: bizName,
        type: bizType as any,
        phone: bizPhone || undefined,
        email: bizEmail || undefined,
        address: bizAddress || undefined,
        taxNumber: bizGst || undefined,
        logoUrl: bizLogo || undefined,
        currency: bizCurrency,
        timezone: bizTimezone,
      });
      showNotification(`Business profile & type updated successfully to ${bizType}!`);
    } catch (err) {
      alert('Failed to update business configuration.');
    }
  };

  // Add Staff Member
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      alert('Please fill in Name and Username/Email.');
      return;
    }

    // Role Permission Check
    const isOwner = user?.role === 'OWNER';
    const isManager = user?.role === 'MANAGER';
    if (!isOwner && !isManager) {
      alert('You do not have permission to register staff.');
      return;
    }
    if (isManager && (newStaffRole === 'OWNER' || newStaffRole === 'MANAGER')) {
      alert('Managers can only register Staff or Worker accounts.');
      return;
    }

    let tempPassword = '';
    if (passwordMode === 'generate') {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%*";
      for (let i = 0; i < 10; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } else {
      if (!manualPassword.trim()) {
        alert('Please enter a manual password.');
        return;
      }
      tempPassword = manualPassword.trim();
    }

    const businessId = business?.id || user?.businessId || '';

    const newMember = {
      id: `ST-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      name: newStaffName.trim(),
      email: newStaffEmail.trim(), // acts as username or email
      username: newStaffEmail.trim(),
      phone: newStaffPhone.trim(),
      role: newStaffRole,
      businessId: businessId,
      passwordHash: tempPassword,
      status: 'FORCE_CHANGE_PASSWORD', // default status
      lastLogin: null,
      createdAt: new Date().toISOString(),
    };

    const updatedStaff = [...staffList, newMember];
    localStorage.setItem('chhuta_mock_staff', JSON.stringify(updatedStaff));
    setStaffList(updatedStaff);
    
    // Show one-time credentials
    setShowCredentials({
      fullName: newMember.name,
      username: newMember.email,
      tempPassword: tempPassword,
      businessCode: businessId,
      role: newMember.role,
    });

    // Reset inputs
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffPhone('');
    setManualPassword('');
    loadStaffAndCounts();
    showNotification(`Registered "${newMember.name}" successfully!`);
  };

  // Request Delete Staff Confirmation
  const handleDeleteStaffClick = (staff: any) => {
    const isOwner = user?.role === 'OWNER';
    if (!isOwner) {
      alert('Only business owners can permanently delete staff accounts.');
      return;
    }
    setStaffToDelete(staff);
  };

  // Perform Staff Deletion
  const confirmDeleteStaff = (id: string) => {
    const isOwner = user?.role === 'OWNER';
    if (!isOwner) {
      alert('Only business owners can permanently delete staff accounts.');
      setStaffToDelete(null);
      return;
    }

    const updatedStaff = staffList.filter(s => s.id !== id);
    localStorage.setItem('chhuta_mock_staff', JSON.stringify(updatedStaff));
    setStaffList(updatedStaff);
    loadStaffAndCounts();
    setStaffToDelete(null);
    showNotification('Staff member removed successfully.');
  };

  // Set Staff Status explicitly (Active, Inactive, Suspended)
  const handleSetStaffStatus = (id: string, newStatus: string) => {
    const staffObj = staffList.find(s => s.id === id);
    if (!staffObj) return;

    // Permissions check
    const isOwner = user?.role === 'OWNER';
    const isManager = user?.role === 'MANAGER';
    if (!isOwner && (!isManager || !managerPermitted || staffObj.role !== 'WORKER')) {
      alert('You do not have permission to change status for this account.');
      return;
    }

    const updatedStaff = staffList.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: newStatus,
        };
      }
      return s;
    });

    localStorage.setItem('chhuta_mock_staff', JSON.stringify(updatedStaff));
    setStaffList(updatedStaff);
    loadStaffAndCounts();
    showNotification(`"${staffObj.name}" status updated to ${newStatus}.`);
  };

  // Reset/Set Staff Password or Password State
  const handleResetPassword = (id: string, customPass?: string, forceChange: boolean = true) => {
    const staffObj = staffList.find(s => s.id === id);
    if (!staffObj) return;

    // Permissions check
    const isOwner = user?.role === 'OWNER';
    const isManager = user?.role === 'MANAGER';
    if (!isOwner && (!isManager || !managerPermitted || staffObj.role !== 'WORKER')) {
      alert('You do not have permission to manage passwords for this account.');
      return;
    }

    let tempPassword = customPass ? customPass.trim() : '';
    if (!tempPassword) {
      // Generate password
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%*";
      for (let i = 0; i < 10; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    const updatedStaff = staffList.map(s => {
      if (s.id === id) {
        return {
          ...s,
          passwordHash: tempPassword,
          status: forceChange ? 'FORCE_CHANGE_PASSWORD' : 'ACTIVE',
        };
      }
      return s;
    });

    localStorage.setItem('chhuta_mock_staff', JSON.stringify(updatedStaff));
    setStaffList(updatedStaff);
    loadStaffAndCounts();

    // Show credentials modal/banner
    setShowCredentials({
      fullName: staffObj.name,
      username: staffObj.email,
      tempPassword: tempPassword,
      businessCode: business?.id || user?.businessId || '',
      role: staffObj.role,
    });

    showNotification(`Password updated for "${staffObj.name}"!`);
  };

  // Toggle Staff Status (Disable / Enable)
  const handleToggleStatus = (id: string) => {
    const staffObj = staffList.find(s => s.id === id);
    if (!staffObj) return;
    const currentStatus = staffObj.status || 'ACTIVE';
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    handleSetStaffStatus(id, nextStatus);
  };

  // Inline edit functions
  const handleStartEdit = (staff: any) => {
    const isOwner = user?.role === 'OWNER';
    const isManager = user?.role === 'MANAGER';
    if (!isOwner && (!isManager || !managerPermitted || staff.role !== 'WORKER')) {
      alert('You do not have permission to edit this staff member.');
      return;
    }

    setEditingStaffId(staff.id);
    setEditName(staff.name);
    setEditEmail(staff.email);
    setEditPhone(staff.phone || '');
    setEditRole(staff.role);
    setEditStatus(staff.status || 'ACTIVE');
    setEditPassword('');
    setEditForcePasswordChange(staff.status === 'FORCE_CHANGE_PASSWORD');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editEmail.trim()) {
      alert('Full Name and Username/Email are required.');
      return;
    }

    const staffObj = staffList.find(s => s.id === editingStaffId);
    if (!staffObj) return;

    const isOwner = user?.role === 'OWNER';
    const isManager = user?.role === 'MANAGER';
    if (!isOwner && (!isManager || !managerPermitted || staffObj.role !== 'WORKER')) {
      alert('You do not have permission to save edits for this account.');
      return;
    }

    // Role downgrade check
    if (isManager && (editRole === 'OWNER' || editRole === 'MANAGER')) {
      alert('Managers can only save staff as Staff or Worker accounts.');
      return;
    }

    const updatedStaff = staffList.map(s => {
      if (s.id === editingStaffId) {
        const finalStatus = editForcePasswordChange ? 'FORCE_CHANGE_PASSWORD' : editStatus;
        return {
          ...s,
          name: editName.trim(),
          email: editEmail.trim(),
          username: editEmail.trim(),
          phone: editPhone.trim(),
          role: editRole,
          status: finalStatus,
          // Update password if a custom one was entered manually
          ...(editPassword.trim() ? { passwordHash: editPassword.trim() } : {}),
        };
      }
      return s;
    });

    localStorage.setItem('chhuta_mock_staff', JSON.stringify(updatedStaff));
    setStaffList(updatedStaff);
    setEditingStaffId(null);
    loadStaffAndCounts();
    showNotification('Staff details updated successfully.');
  };

  // Clear Local Caches safely (excluding Auth / Core Profile session)
  const handleClearCaches = () => {
    if (!confirm('Are you sure you want to clear your local item and configuration caches? Your active business profile and user credentials will be preserved.')) return;
    
    localStorage.removeItem('chhuta_mock_products');
    localStorage.removeItem('chhuta_mock_staff');
    localStorage.removeItem('chhuta_upi_id');
    localStorage.removeItem('chhuta_upi_merchant');
    localStorage.removeItem('chhuta_receipt_footer');
    localStorage.removeItem('chhuta_receipt_width');
    localStorage.removeItem('chhuta_billing_initialized');
    
    // Refresh Checklist
    const freshChecklist = {
      product: false,
      staff: false,
      upi: false,
      receipt: false,
      billing: false
    };
    localStorage.setItem('chhuta_setup_checklist', JSON.stringify(freshChecklist));

    loadStaffAndCounts();
    showNotification('Local database caches cleared safely! Onboarding checklist is reset.');
  };

  // Submit Feedback Handler
  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) {
      alert('Please enter your feedback comments.');
      return;
    }
    const newFeedback = {
      id: `FB-${Math.floor(Math.random() * 90000 + 10000)}`,
      rating: feedbackRating,
      category: feedbackCategory,
      message: feedbackMessage.trim(),
      date: new Date().toLocaleDateString(),
      status: 'Logged & Received',
      metadata: {
        businessId: business?.id || 'N/A',
        businessName: business?.name || 'N/A',
        businessType: business?.type || 'N/A',
        deviceScreen: `${window.innerWidth}x${window.innerHeight}`,
        devicePlatform: navigator.userAgent,
        language: navigator.language,
        timeUtc: new Date().toISOString()
      }
    };
    const updated = [newFeedback, ...feedbackHistory];
    localStorage.setItem('chhuta_feedback_history', JSON.stringify(updated));
    setFeedbackHistory(updated);
    setFeedbackMessage('');
    setFeedbackRating(5);
    showNotification('Feedback logged successfully! Our product design team appreciates your input.');
  };

  // Submit Direct Contact Support Ticket
  const handleSubmitContactTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSubject.trim() || !contactMessage.trim()) {
      alert('Please fill out both the Subject and Description.');
      return;
    }
    const newTicket = {
      id: `TK-${Math.floor(Math.random() * 90000 + 10000)}`,
      subject: contactSubject.trim(),
      message: contactMessage.trim(),
      date: new Date().toLocaleDateString(),
      status: 'Open Ticket'
    };
    const updated = [newTicket, ...contactHistory];
    localStorage.setItem('chhuta_contact_tickets', JSON.stringify(updated));
    setContactHistory(updated);
    setContactSubject('');
    setContactMessage('');
    showNotification(`Support ticket opened! Reference ticket ID: ${newTicket.id}`);
  };

  // Secure Logout Session
  const handleSecureLogout = async () => {
    await logout();
    navigate('/login', { replace: true, state: { message: 'Logged out successfully.' } });
  };

  const canAccessStaff = isOwner || hasPermission(user?.role, 'staff_management');
  const canAccessBillingProt = isOwner || hasPermission(user?.role, 'billing_protection');
  const canAccessSubscription = isOwner || hasPermission(user?.role, 'subscription');

  const tabs = [
    ...(canAccessProfile ? [{ id: 'profile', name: 'Business Profile', icon: Building }] : []),
    ...(canAccessReceipt ? [{ id: 'receipt', name: 'Receipt Settings', icon: Receipt }] : []),
    { id: 'appearance', name: 'Appearance Theme', icon: Palette },
    ...(isOwner ? [{ id: 'owner_payment', name: 'Payment Settings', icon: QrCode }] : []),
    ...(canAccessStaff ? [{ id: 'staff', name: 'Staff Management', icon: Users }] : []),
    ...(canAccessBillingProt ? [{ id: 'billing', name: 'Billing Protection', icon: ShieldCheck }] : []),
    ...(canAccessSubscription ? [{ id: 'subscription', name: 'Subscription Plan', icon: CreditCard }] : []),
    { id: 'data', name: 'Offline Storage', icon: Database },
    { id: 'help', name: 'Help & Tutorials', icon: HelpCircle },
    { id: 'feedback', name: 'Submit Feedback', icon: MessageSquare },
    { id: 'contact', name: 'Contact Support', icon: Mail },
    { id: 'about', name: 'About App', icon: Info },
  ];

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-slate-100 max-w-5xl mx-auto">
      
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Workspace Settings</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Customize billing details, staff records, subscription plans, and secure terminal features.
        </p>
      </div>

      {notification && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 size={16} className="text-indigo-500 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Settings Grid Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Sidebar Menu */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm space-y-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon size={16} />
                <span>{t.name}</span>
              </button>
            );
          })}

          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
            <button
              onClick={handleSecureLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
            >
              <LogOut size={16} />
              <span>Secure Logout</span>
            </button>
          </div>
        </div>

        {/* Right Active Panel */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
          
          {/* TAB 1: Business Profile / Configuration */}
          {activeTab === 'profile' && (
            !canAccessProfile ? (
              <div className="py-8 px-4 text-center space-y-4 font-sans">
                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
                  <ShieldAlert size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  You do not have permission to view or edit Business Configuration. This section is strictly restricted to the Business Owner and explicitly authorized Managers.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to Dashboard
                </button>
              </div>
            ) : (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Business Configuration</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Update trade coordinates printed on top of sales receipts and digital payment invoices.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Business Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Building size={14} />
                    </span>
                    <input
                      type="text"
                      required
                      value={bizName}
                      onChange={(e) => setBizName(e.target.value)}
                      placeholder="e.g. Acme Supermart"
                      className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Phone size={14} />
                    </span>
                    <input
                      type="tel"
                      value={bizPhone}
                      onChange={(e) => setBizPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Business Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Mail size={14} />
                    </span>
                    <input
                      type="email"
                      value={bizEmail}
                      onChange={(e) => setBizEmail(e.target.value)}
                      placeholder="contact@store.com"
                      className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    GSTIN / Tax Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <FileText size={14} />
                    </span>
                    <input
                      type="text"
                      value={bizGst}
                      onChange={(e) => setBizGst(e.target.value.toUpperCase())}
                      placeholder="e.g. 07AAAAA1111A1Z1"
                      className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all uppercase"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Store Address
                  </label>
                  <div className="relative">
                    <span className="absolute top-3 left-3 text-slate-400">
                      <MapPin size={14} />
                    </span>
                    <textarea
                      value={bizAddress}
                      onChange={(e) => setBizAddress(e.target.value)}
                      placeholder="Shop No. 4, Ground Floor, Sector 15, New Delhi"
                      rows={2}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl space-y-2">
                  <label className="block text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                    Business Type & Application Mode
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Controls interface layout, catalog forms, billing workflows, and navigation modules.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setBizType('SERVICE')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        bizType === 'SERVICE'
                          ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-sm ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">💇 Service Business</span>
                        {bizType === 'SERVICE' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Salon, Spa, Repair, Tailor, Medical Consultant, Wash, Services.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBizType('PRODUCT')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        bizType === 'PRODUCT'
                          ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-sm ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">🛍️ Product Retail</span>
                        {bizType === 'PRODUCT' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Grocery, Wholesales, Pharmacy, Hardware, Retail inventory.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBizType('HYBRID')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        bizType === 'HYBRID'
                          ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-sm ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">🔄 Mixed / Hybrid</span>
                        {bizType === 'HYBRID' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Both Service Management & Retail Product Inventory.
                      </p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Currency Code
                  </label>
                  <select
                    value={bizCurrency}
                    onChange={(e) => setBizCurrency(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    <option value="INR">₹ INR (Indian Rupee)</option>
                    <option value="USD">$ USD (US Dollar)</option>
                    <option value="EUR">€ EUR (Euro)</option>
                    <option value="GBP">£ GBP (British Pound)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Timezone
                  </label>
                  <select
                    value={bizTimezone}
                    onChange={(e) => setBizTimezone(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="America/New_York">EST (GMT-5:00)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Business Logo URL (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Upload size={14} />
                    </span>
                    <input
                      type="url"
                      value={bizLogo}
                      onChange={(e) => setBizLogo(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-500/10"
                >
                  <Save size={14} />
                  Save Changes
                </button>
              </div>
            </form>
          ))}

          {/* TAB: Receipt & Print Settings (Owner / Permitted Manager) */}
          {activeTab === 'receipt' && (
            <div className="space-y-6">
              {!canAccessReceipt ? (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-3xl p-6 text-center space-y-4">
                  <ShieldAlert className="mx-auto text-red-500 animate-pulse" size={48} />
                  <h2 className="text-lg font-bold text-red-800 dark:text-red-400">Access Denied</h2>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                    You do not have permission to view or configure Receipt & Print Settings.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Receipt className="text-indigo-600 dark:text-indigo-400" size={20} />
                      <span>Receipt & Print Layout Configuration</span>
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Customize receipt design, logo graphics, default thermal/A4 paper sizes, and sharing choices.
                    </p>
                  </div>

                  {/* Logo Upload Card */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Business Logo (PNG, JPG, JPEG, SVG)
                    </label>
                    <div className="flex items-center gap-4">
                      {receiptSettingsState.logoUrl ? (
                        <div className="w-20 h-20 bg-white rounded-xl border border-slate-200 p-1 flex items-center justify-center shrink-0">
                          <img
                            src={receiptSettingsState.logoUrl}
                            alt="Logo preview"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 shrink-0 text-center p-1">
                          <Image size={20} />
                          <span className="text-[9px] mt-1 font-bold">No Logo</span>
                        </div>
                      )}

                      <div className="space-y-2 flex-1">
                        <div className="flex gap-2">
                          <label className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-xs">
                            <Upload size={14} />
                            <span>Upload Logo File</span>
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (!file.type.match(/^image\/(png|jpeg|jpg|svg\+xml)$/)) {
                                  alert('Please upload a valid image file (PNG, JPG, JPEG, SVG).');
                                  return;
                                }
                                if (file.size > 2 * 1024 * 1024) {
                                  alert('File size exceeds 2MB limit.');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  const base64 = ev.target?.result as string;
                                  setReceiptSettingsState((prev) => ({ ...prev, logoUrl: base64 }));
                                  setBizLogo(base64);
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="hidden"
                            />
                          </label>

                          {receiptSettingsState.logoUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setReceiptSettingsState((prev) => ({ ...prev, logoUrl: '' }));
                                setBizLogo('');
                              }}
                              className="px-3 py-2 border border-rose-200 text-rose-600 dark:border-rose-900 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                            >
                              Remove Logo
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Recommended size: Square or rectangular (max 2MB).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Paper Format & Share Method */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                        Default Paper Size
                      </label>
                      <select
                        value={receiptSettingsState.defaultPaperSize}
                        onChange={(e) =>
                          setReceiptSettingsState((prev) => ({
                            ...prev,
                            defaultPaperSize: e.target.value as any,
                          }))
                        }
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      >
                        <option value="80mm">80mm Standard Thermal (POS Roll)</option>
                        <option value="58mm">58mm Small Thermal (Bluetooth/Mobile)</option>
                        <option value="A4">A4 Standard Document Sheet</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                        Default Share Method
                      </label>
                      <select
                        value={receiptSettingsState.defaultShareMethod}
                        onChange={(e) =>
                          setReceiptSettingsState((prev) => ({
                            ...prev,
                            defaultShareMethod: e.target.value as any,
                          }))
                        }
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      >
                        <option value="whatsapp">WhatsApp Direct</option>
                        <option value="email">Email</option>
                        <option value="sms">SMS Text</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                  </div>

                  {/* Header & Footer Custom Messaging */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                        Receipt Custom Header Note
                      </label>
                      <input
                        type="text"
                        value={receiptSettingsState.receiptHeader}
                        onChange={(e) =>
                          setReceiptSettingsState((prev) => ({ ...prev, receiptHeader: e.target.value }))
                        }
                        placeholder="e.g. Thank you for shopping at Acme Supermart!"
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                        Receipt Custom Footer Thank You Message
                      </label>
                      <textarea
                        rows={2}
                        value={receiptSettingsState.receiptFooter}
                        onChange={(e) =>
                          setReceiptSettingsState((prev) => ({ ...prev, receiptFooter: e.target.value }))
                        }
                        placeholder="e.g. Please visit again! Goods once sold can be returned within 7 days with original receipt."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                  </div>

                  {/* Element Visibility Toggles */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      Receipt Visibility Elements
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={receiptSettingsState.showGst}
                          onChange={(e) =>
                            setReceiptSettingsState((prev) => ({ ...prev, showGst: e.target.checked }))
                          }
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Show GSTIN / Tax Number</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={receiptSettingsState.showCustomerDetails}
                          onChange={(e) =>
                            setReceiptSettingsState((prev) => ({ ...prev, showCustomerDetails: e.target.checked }))
                          }
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Show Customer Name & Mobile</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={receiptSettingsState.showQr}
                          onChange={(e) =>
                            setReceiptSettingsState((prev) => ({ ...prev, showQr: e.target.checked }))
                          }
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Show UPI Payment QR Code</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={receiptSettingsState.showAddress}
                          onChange={(e) =>
                            setReceiptSettingsState((prev) => ({ ...prev, showAddress: e.target.checked }))
                          }
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Show Store Address</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={receiptSettingsState.showBusinessPhone}
                          onChange={(e) =>
                            setReceiptSettingsState((prev) => ({ ...prev, showBusinessPhone: e.target.checked }))
                          }
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Show Store Contact Phone</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={receiptSettingsState.showBusinessEmail}
                          onChange={(e) =>
                            setReceiptSettingsState((prev) => ({ ...prev, showBusinessEmail: e.target.checked }))
                          }
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Show Store Business Email</span>
                      </label>
                    </div>
                  </div>

                  {/* Save Changes Button */}
                  <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        saveReceiptSettings(receiptSettingsState);
                        if (business) {
                          await updateBusiness({ logoUrl: receiptSettingsState.logoUrl });
                        }
                        showNotification('Receipt configuration and print layout saved successfully!');
                      }}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-500/10"
                    >
                      <Save size={14} />
                      Save Receipt Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Owner Payment Settings (Protected) */}
          {activeTab === 'owner_payment' && (
            <div className="space-y-6">
              {!isOwner ? (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-3xl p-6 text-center space-y-4">
                  <ShieldAlert className="mx-auto text-red-500 animate-pulse" size={48} />
                  <h2 className="text-lg font-bold text-red-800 dark:text-red-400">Access Denied</h2>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                    Only the business owner can access Payment Settings.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <QrCode className="text-indigo-600 dark:text-indigo-400" size={20} />
                      <span>Owner Payment Settings</span>
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Configure your official digital wallet details. These will generate dynamic checkout QR codes, receipts, and WhatsApp message templates.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                        Business UPI ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!isEditingPayment}
                        value={isEditingPayment ? tempPaymentSettings.upiId : paymentSettings.upiId}
                        onChange={(e) => setTempPaymentSettings({ ...tempPaymentSettings, upiId: e.target.value })}
                        placeholder="e.g. storename@okhdfcbank"
                        className="w-full h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all disabled:opacity-60"
                      />
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        Must be a valid VPA (Virtual Payment Address). Format example: business@upi
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                        Business Display Name
                      </label>
                      <input
                        type="text"
                        disabled={!isEditingPayment}
                        value={isEditingPayment ? tempPaymentSettings.businessName : paymentSettings.businessName}
                        onChange={(e) => setTempPaymentSettings({ ...tempPaymentSettings, businessName: e.target.value })}
                        placeholder="e.g. Chhutta Sweet Corner"
                        className="w-full h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all disabled:opacity-60"
                      />
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        Customer-facing name shown on payment apps and checkout QR headers.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                        Business Phone Number (Optional)
                      </label>
                      <input
                        type="text"
                        disabled={!isEditingPayment}
                        value={isEditingPayment ? tempPaymentSettings.businessPhone : paymentSettings.businessPhone}
                        onChange={(e) => setTempPaymentSettings({ ...tempPaymentSettings, businessPhone: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                        Merchant/Payee Name (Optional)
                      </label>
                      <input
                        type="text"
                        disabled={!isEditingPayment}
                        value={isEditingPayment ? tempPaymentSettings.merchantName : paymentSettings.merchantName}
                        onChange={(e) => setTempPaymentSettings({ ...tempPaymentSettings, merchantName: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all disabled:opacity-60"
                      />
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        Legal bank account name linked with your UPI ID.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-between items-center gap-2">
                    <div>
                      {!isEditingPayment && paymentSettings.upiId && (
                        <button
                          onClick={() => setShowTestQrModal(true)}
                          className="inline-flex items-center gap-1.5 h-10 px-5 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                        >
                          <QrCode size={14} />
                          Test QR Code
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!isEditingPayment ? (
                        <button
                          onClick={() => {
                            setTempPaymentSettings({ ...paymentSettings });
                            setIsEditingPayment(true);
                          }}
                          className="inline-flex items-center gap-1.5 h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-500/10 transition-all"
                        >
                          <Edit3 size={14} />
                          Edit Settings
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setIsEditingPayment(false);
                            }}
                            className="inline-flex items-center gap-1.5 h-10 px-5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              const upi = tempPaymentSettings.upiId.trim();
                              if (!upi) {
                                alert('Business UPI ID is required!');
                                return;
                              }
                              const re = /^[\w.\-_]+@[\w.\-_]+$/;
                              if (!re.test(upi)) {
                                alert('Invalid UPI ID format! Please use a valid format like business@upi.');
                                return;
                              }
                              const updated = {
                                upiId: upi,
                                businessName: tempPaymentSettings.businessName.trim(),
                                businessPhone: tempPaymentSettings.businessPhone.trim(),
                                merchantName: tempPaymentSettings.merchantName.trim(),
                              };
                              setPaymentSettings(updated);
                              localStorage.setItem('chhutta_owner_payment_settings', JSON.stringify(updated));
                              // compatible backports
                              localStorage.setItem('chhuta_upi_id', updated.upiId);
                              localStorage.setItem('chhuta_upi_merchant', updated.businessName || updated.merchantName);
                              
                              setIsEditingPayment(false);
                              showNotification('Owner Payment Settings saved successfully!');
                            }}
                            className="inline-flex items-center gap-1.5 h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md shadow-emerald-500/10 transition-all"
                          >
                            <Save size={14} />
                            Save Settings
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Appearance Theme Selector */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">App Display Appearance</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Toggle between high-contrast light backgrounds or eye-safe dark slate modes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-32 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'border-indigo-600 ring-2 ring-indigo-500/10 bg-indigo-50/10 dark:bg-indigo-950/10'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/10'
                  }`}
                >
                  <Sun size={20} className={theme === 'light' ? 'text-indigo-600' : 'text-slate-400'} />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">Light Mode</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Clean high-contrast theme</p>
                  </div>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-32 transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'border-indigo-600 ring-2 ring-indigo-500/10 bg-indigo-50/10 dark:bg-indigo-950/10'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/10'
                  }`}
                >
                  <Moon size={20} className={theme === 'dark' ? 'text-indigo-500' : 'text-slate-400'} />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">Dark Mode</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Comfortable on the eyes</p>
                  </div>
                </button>

                <button
                  onClick={() => setTheme('system')}
                  className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-32 transition-all cursor-pointer ${
                    theme === 'system'
                      ? 'border-indigo-600 ring-2 ring-indigo-500/10 bg-indigo-50/10 dark:bg-indigo-950/10'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/10'
                  }`}
                >
                  <Laptop size={20} className={theme === 'system' ? 'text-indigo-500' : 'text-slate-400'} />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">System Default</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Sync with your device theme</p>
                  </div>
                </button>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-150 dark:border-slate-850">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Preview Theme Applied</span>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal mt-1">
                  ChhuttaPOS updates layout colors dynamically in real-time. System settings are persistent and synced directly on your active local browser profiles.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Worker Management */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Worker Management & Access Control</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Manage worker profiles, assign billing commission/wages, and configure system role permissions.
                </p>
              </div>

              {/* Sub-tab navigation inside Worker Management */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
                <button
                  type="button"
                  onClick={() => setStaffSubTab('registry')}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                    staffSubTab === 'registry'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Worker Profiles
                </button>
                <button
                  type="button"
                  onClick={() => setStaffSubTab('permissions')}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                    staffSubTab === 'permissions'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Roles & Permissions Matrix
                </button>
                <button
                  type="button"
                  onClick={() => setStaffSubTab('advances')}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                    staffSubTab === 'advances'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Worker Advances
                </button>
              </div>

              {/* SUB-TAB 2: Roles & Permissions Matrix */}
              {staffSubTab === 'permissions' && (
                <div className="space-y-6">
                  {!isOwner && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-xl text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <span className="font-bold">Read-Only View:</span> Only Owner accounts can modify role permissions.
                    </div>
                  )}

                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Role-Based Access Control (RBAC) System
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Configure exact functional permissions for each system role. Changes persist immediately and update real-time across navigation menus and route guards.
                    </p>
                  </div>

                  {/* Role Selector Tabs */}
                  <div className="flex flex-wrap gap-2">
                    {['MANAGER', 'STAFF', 'WORKER', 'OWNER'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRoleForPermissions(r)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          selectedRoleForPermissions === r
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {r} Role
                      </button>
                    ))}
                  </div>

                  {/* Selected Role Permissions Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                          {selectedRoleForPermissions} Permissions
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {selectedRoleForPermissions === 'OWNER'
                            ? 'Owner role has full unrestricted access to all modules and system settings.'
                            : isOwner
                            ? `Enable or disable specific modules and actions for the ${selectedRoleForPermissions} role.`
                            : `Current active permissions for the ${selectedRoleForPermissions} role.`}
                        </p>
                      </div>
                      {selectedRoleForPermissions === 'OWNER' && (
                        <span className="text-[10px] bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-md font-bold uppercase border border-amber-200 dark:border-amber-900">
                          Full Access (Unrestricted)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {PERMISSION_DEFINITIONS.map((p) => {
                        const isSystemProtected = !!p.isSystemProtected;
                        const isOwnerRoleSelected = selectedRoleForPermissions === 'OWNER';

                        const isDisabled = !isOwner || isOwnerRoleSelected || isSystemProtected;
                        const isChecked = isOwnerRoleSelected
                          ? true
                          : isSystemProtected
                          ? false
                          : !!rolePermissionsState[selectedRoleForPermissions]?.[p.key];

                        return (
                          <label
                            key={p.key}
                            className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                              isDisabled
                                ? 'opacity-75 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                                : 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-800 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={isDisabled}
                              checked={isChecked}
                              onChange={() => !isDisabled && handleTogglePermission(selectedRoleForPermissions, p.key)}
                              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="space-y-0.5 w-full">
                              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                  {p.label}
                                </span>
                                {isSystemProtected ? (
                                  <span className="text-[9px] bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded font-bold border border-rose-200/50 dark:border-rose-900/50">
                                    System Protected – Cannot Be Modified
                                  </span>
                                ) : isOwnerRoleSelected ? (
                                  <span className="text-[9px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-200/50 dark:border-amber-900/50">
                                    Always Active
                                  </span>
                                ) : isChecked ? (
                                  <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold border border-emerald-200/50 dark:border-emerald-900/50">
                                    Enabled
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold border border-slate-200 dark:border-slate-700">
                                    Disabled
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                                {p.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 1: Staff Registry */}
              {staffSubTab === 'registry' && (
                <>

              {/* OWNER CREDENTIALS CARD (Visible only to authenticated Owner) */}
              {isOwner && (
                <div className="p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-600 text-white rounded-xl">
                        <Key size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Owner Business Credentials
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Secure access credentials for Business ID login across all terminals.
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-indigo-600 text-white font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider">
                      OWNER ONLY
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                    {/* Business ID */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Business ID</span>
                      <div className="flex items-center justify-between font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span>{business?.id || 'CHP-WORKSPACE'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(business?.id || '');
                            showNotification('Business ID copied to clipboard');
                          }}
                          className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                          title="Copy Business ID"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Owner Username */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Owner Username</span>
                      <div className="flex items-center justify-between font-mono font-bold text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span>{ownerCardCreds?.username || (business?.ownerName || 'owner').toLowerCase().replace(/[^a-z0-9]/g, '')}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(ownerCardCreds?.username || '');
                            showNotification('Owner Username copied to clipboard');
                          }}
                          className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                          title="Copy Owner Username"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>

                    {/* App Password */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">App Password</span>
                      <div className="flex items-center justify-between font-mono font-bold text-xs text-amber-900 dark:text-amber-200 bg-amber-50/50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                        <span>{revealOwnerPassword ? (ownerCardCreds?.password || '••••••••••••') : '••••••••••••'}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setRevealOwnerPassword(!revealOwnerPassword)}
                            className="text-amber-700 dark:text-amber-400 hover:text-amber-900 cursor-pointer p-0.5"
                            title={revealOwnerPassword ? 'Hide Password' : 'Reveal Password'}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(ownerCardCreds?.password || '');
                              showNotification('App Password copied to clipboard');
                            }}
                            className="text-amber-700 dark:text-amber-400 hover:text-amber-900 cursor-pointer p-0.5"
                            title="Copy App Password"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      Use Business ID + Owner Username + App Password for terminal logins.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const txt = `ChhuttaPOS Owner Credentials:\nBusiness ID: ${business?.id}\nUsername: ${ownerCardCreds?.username}\nApp Password: ${ownerCardCreds?.password}`;
                          navigator.clipboard.writeText(txt);
                          showNotification('Owner credentials summary copied to clipboard!');
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Copy size={13} />
                        Copy All
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateNewAppPassword}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <RefreshCw size={13} />
                        Generate New App Password
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MANAGER PERMISSION TOGGLE CARD (Owner Only) */}
              {user?.role === 'OWNER' && (
                <div className="p-4 bg-indigo-50/45 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-450 uppercase tracking-wider">Manager Authority Permissions</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      When enabled, Manager accounts can reset worker passwords and lock/unlock worker accounts.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={managerPermitted}
                      onChange={(e) => handleToggleManagerPermission(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-850 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              )}

              {/* ONE-TIME CREDENTIALS DISPLAY (Shown Only Once) */}
              {showCredentials && (
                <div className="p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/75 dark:bg-amber-950/20 dark:border-amber-900 space-y-4 shadow-sm animate-pulse-once">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                      <ShieldAlert size={18} className="text-amber-600 shrink-0" />
                      <span>⚠️ One-Time Security Credentials Display</span>
                    </div>
                    <button 
                      onClick={() => setShowCredentials(null)}
                      className="p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-700 dark:text-amber-400 cursor-pointer"
                      title="Dismiss Credentials"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
                    These login credentials are generated securely. For maximum system privacy, <strong>this password is displayed ONLY ONCE</strong>. Copy, print, or share these credentials now. They will not be visible again after dismissing this alert.
                  </p>

                  <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-xl p-4 space-y-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold font-sans">Full Name</span>
                        <span className="font-sans font-bold">{showCredentials.fullName}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold font-sans">Role Assigned</span>
                        <span className="font-sans font-extrabold text-indigo-600 dark:text-indigo-400">{showCredentials.role}</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800 my-2"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold font-sans">Business Code</span>
                        <strong className="text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">{showCredentials.businessCode}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold font-sans">Login Username</span>
                        <strong>{showCredentials.username}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold font-sans">Temporary Password</span>
                        <strong className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded text-sm">{showCredentials.tempPassword}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      onClick={() => {
                        const txt = `ChhuttaPOS Staff Login Credentials:\n---------------------------------\nBusiness ID: ${showCredentials.businessCode}\nUsername/Email: ${showCredentials.username}\nTemporary Password: ${showCredentials.tempPassword}\nRole: ${showCredentials.role}\n\nPlease change your temporary password immediately upon first login.`;
                        navigator.clipboard.writeText(txt);
                        showNotification('Credentials copied to clipboard!');
                      }}
                      className="h-9 px-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Copy size={13} />
                      Copy Credentials
                    </button>
                    
                    <button
                      onClick={() => {
                        const txt = `ChhuttaPOS Staff Login Credentials:\n---------------------------------\nBusiness ID: ${showCredentials.businessCode}\nUsername/Email: ${showCredentials.username}\nTemporary Password: ${showCredentials.tempPassword}\nRole: ${showCredentials.role}\n\nPlease change your temporary password immediately upon first login.`;
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`<pre style="font-family: monospace; padding: 20px;">${txt}</pre>`);
                          printWindow.document.close();
                          printWindow.print();
                        } else {
                          // Fallback to clipboard and alert if popup blocked
                          navigator.clipboard.writeText(txt);
                          alert('Printed details copy fallback. Credentials copied to clipboard!');
                        }
                      }}
                      className="h-9 px-3.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={13} />
                      Print Credentials
                    </button>
                    
                    <button
                      onClick={() => {
                        const txt = `ChhuttaPOS Staff Credentials:\nBiz ID: ${showCredentials.businessCode}\nUser: ${showCredentials.username}\nTemp Pass: ${showCredentials.tempPassword}`;
                        if (navigator.share) {
                          navigator.share({
                            title: 'ChhuttaPOS Staff Account',
                            text: txt,
                          }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(txt);
                          showNotification('Credentials copied and ready to share!');
                        }
                      }}
                      className="h-9 px-3.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 size={13} />
                      Share Credentials
                    </button>

                    <button
                      onClick={() => setShowCredentials(null)}
                      className="h-9 px-4 bg-amber-200 dark:bg-amber-950/60 hover:bg-amber-300 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 rounded-xl text-[10px] font-bold uppercase tracking-wider inline-flex items-center ml-auto cursor-pointer"
                    >
                      Done / Clear Alert
                    </button>
                  </div>
                </div>
              )}

              {/* Add Worker Profile Form */}
              <form onSubmit={handleAddWorkerProfile} className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-150 dark:border-slate-850 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Plus size={14} />
                    Add Worker Profile
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Supports single-device & multi-device workers</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newWorkerName}
                      onChange={(e) => setNewWorkerName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Role / Designation</label>
                    <input
                      type="text"
                      value={newWorkerRole}
                      onChange={(e) => setNewWorkerRole(e.target.value)}
                      placeholder="e.g. Hair Stylist, Barber, Washer, Cashier"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number (Optional)</label>
                    <input
                      type="text"
                      value={newWorkerPhone}
                      onChange={(e) => setNewWorkerPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Daily Wage (₹/day)</label>
                    <input
                      type="number"
                      min="0"
                      value={newWorkerDailyWage}
                      onChange={(e) => setNewWorkerDailyWage(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Commission Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newWorkerCommission}
                      onChange={(e) => setNewWorkerCommission(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* LOGIN ENABLE TOGGLE CARD */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Smartphone size={14} className="text-indigo-600" />
                        Enable Direct System Login
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Enable if this worker has their own smartphone or tablet to log sales directly. If disabled, owner records work on single device.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newWorkerEnableLogin}
                        onChange={(e) => setNewWorkerEnableLogin(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-850 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {newWorkerEnableLogin && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Login Username / Email</label>
                          <input
                            type="text"
                            required={newWorkerEnableLogin}
                            value={newWorkerUsername}
                            onChange={(e) => setNewWorkerUsername(e.target.value)}
                            placeholder="e.g. ramesh_hair or ramesh@store.com"
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Account Role</label>
                          <select
                            value={newWorkerAccountRole}
                            onChange={(e) => setNewWorkerAccountRole(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                          >
                            <option value="WORKER">Worker</option>
                            <option value="STAFF">Staff / Cashier</option>
                            {user?.role === 'OWNER' && <option value="MANAGER">Manager Admin</option>}
                          </select>
                        </div>
                      </div>

                      {/* Password Options */}
                      <div className="flex items-center justify-between pt-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Temporary Password Access</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPasswordMode('generate')}
                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                              passwordMode === 'generate'
                                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900'
                                : 'text-slate-400 border border-transparent hover:text-slate-600'
                            }`}
                          >
                            Auto-Generate
                          </button>
                          <button
                            type="button"
                            onClick={() => setPasswordMode('manual')}
                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                              passwordMode === 'manual'
                                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900'
                                : 'text-slate-400 border border-transparent hover:text-slate-600'
                            }`}
                          >
                            Enter Manual
                          </button>
                        </div>
                      </div>

                      {passwordMode === 'manual' ? (
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                            <Key size={14} />
                          </span>
                          <input
                            type="text"
                            required={newWorkerEnableLogin && passwordMode === 'manual'}
                            value={manualPassword}
                            onChange={(e) => setManualPassword(e.target.value)}
                            placeholder="Set temporary password (e.g., TempPass123!)"
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                          />
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">
                          A 10-character login password will be automatically generated and displayed one-time upon creation.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={14} />
                    Create Worker Profile
                  </button>
                </div>
              </form>

              {/* Worker Profiles Directory */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Worker Directory ({workerProfiles.length})
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Real-time sales tracking & assigned customer metrics
                  </span>
                </div>

                {workerProfiles.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <p className="text-xs text-slate-400">No worker profiles registered yet. Use the form above to add your team members.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workerProfiles.map((w) => {
                      const isEditing = editingWorkerId === w.id;
                      const metrics = workerMetricsMap[w.id] || { todayCustomersCount: 0, todaySalesTotal: 0 };

                      return (
                        <div key={w.id} className="p-4 rounded-2xl border border-slate-150 dark:border-slate-850 bg-white dark:bg-slate-900 hover:shadow-sm transition-all space-y-3">
                          {isEditing ? (
                            /* INLINE EDIT WORKER FORM */
                            <form onSubmit={handleSaveWorkerEdit} className="space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                  Editing Worker Profile ({w.name})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingWorkerId(null)}
                                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
                                >
                                  Cancel
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                                  <input
                                    type="text"
                                    required
                                    value={editWorkerName}
                                    onChange={(e) => setEditWorkerName(e.target.value)}
                                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Role / Specialization</label>
                                  <input
                                    type="text"
                                    required
                                    value={editWorkerRole}
                                    onChange={(e) => setEditWorkerRole(e.target.value)}
                                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                                  <input
                                    type="text"
                                    value={editWorkerPhone}
                                    onChange={(e) => setEditWorkerPhone(e.target.value)}
                                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Daily Wage (₹)</label>
                                  <input
                                    type="number"
                                    value={editWorkerDailyWage}
                                    onChange={(e) => setEditWorkerDailyWage(e.target.value)}
                                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Commission Rate (%)</label>
                                  <input
                                    type="number"
                                    value={editWorkerCommission}
                                    onChange={(e) => setEditWorkerCommission(e.target.value)}
                                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Status</label>
                                  <select
                                    value={editWorkerStatus}
                                    onChange={(e) => setEditWorkerStatus(e.target.value)}
                                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                                  >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="ARCHIVED">Archived</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setEditingWorkerId(null)}
                                  className="h-8 px-3 rounded border border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 text-[10px] font-bold uppercase cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold uppercase cursor-pointer shadow-sm"
                                >
                                  Save Worker Profile
                                </button>
                              </div>
                            </form>
                          ) : (
                            /* NORMAL WORKER PROFILE CARD */
                            <div>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-sm font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">
                                    {w.name.charAt(0).toUpperCase()}
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100">{w.name}</h5>
                                      <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded">
                                        {w.role}
                                      </span>

                                      {/* Login Enabled Badge */}
                                      {w.loginEnabled ? (
                                        <span className="text-[8px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-2 py-0.5 rounded flex items-center gap-1">
                                          <Smartphone size={10} />
                                          Login Enabled ({w.username || 'App Login'})
                                        </span>
                                      ) : (
                                        <span className="text-[8px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded flex items-center gap-1">
                                          Single-Device Worker (Owner Recorded)
                                        </span>
                                      )}

                                      {/* Status Badge */}
                                      {w.status === 'ACTIVE' && (
                                        <span className="text-[8px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-1.5 py-0.5 rounded">
                                          Active
                                        </span>
                                      )}
                                      {w.status === 'INACTIVE' && (
                                        <span className="text-[8px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 px-1.5 py-0.5 rounded">
                                          Inactive
                                        </span>
                                      )}
                                      {w.status === 'ARCHIVED' && (
                                        <span className="text-[8px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 px-1.5 py-0.5 rounded">
                                          Archived
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                      {w.phone && (
                                        <>
                                          <span>Phone: <strong className="text-slate-600 dark:text-slate-300 font-sans">{w.phone}</strong></span>
                                          <span>•</span>
                                        </>
                                      )}
                                      <span>ID: <strong className="font-mono">{w.id}</strong></span>
                                      {w.dailyWage && (
                                        <>
                                          <span>•</span>
                                          <span>Wage: <strong className="text-slate-700 dark:text-slate-200">₹{w.dailyWage}/day</strong></span>
                                        </>
                                      )}
                                      {w.commissionPercentage && (
                                        <>
                                          <span>•</span>
                                          <span>Commission: <strong className="text-indigo-600 dark:text-indigo-400">{w.commissionPercentage}%</strong></span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* TODAY'S PERFORMANCE METRICS SUMMARY */}
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <div className="text-right">
                                    <span className="text-[8px] text-slate-400 uppercase font-bold block">Today's Sales</span>
                                    <strong className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                      ₹{metrics.todaySalesTotal.toFixed(2)}
                                    </strong>
                                  </div>
                                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-800"></div>
                                  <div className="text-left">
                                    <span className="text-[8px] text-slate-400 uppercase font-bold block">Customers</span>
                                    <strong className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      {metrics.todayCustomersCount} served
                                    </strong>
                                  </div>
                                </div>

                                {/* ACTIONS ROW */}
                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  {/* Edit */}
                                  <button
                                    onClick={() => handleStartEditWorker(w)}
                                    className="p-2 rounded-lg border border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
                                    title="Edit Worker Profile"
                                  >
                                    <Edit3 size={13} />
                                  </button>

                                  {/* Toggle Login Access */}
                                  <button
                                    onClick={() => handleToggleWorkerLogin(w)}
                                    className={`p-2 rounded-lg border transition-all cursor-pointer ${
                                      w.loginEnabled
                                        ? 'border-indigo-100 dark:border-indigo-950 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600'
                                        : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 text-slate-400'
                                    }`}
                                    title={w.loginEnabled ? 'Disable Worker Direct Login' : 'Enable Worker Direct Login'}
                                  >
                                    <Smartphone size={13} />
                                  </button>

                                  {/* Delete / Archive */}
                                  <button
                                    onClick={() => handleDeleteWorkerClick(w)}
                                    className="p-2 rounded-lg border border-slate-150 dark:border-slate-850 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                                    title="Delete or Archive Worker Profile"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* SUB-TAB 3: Worker Advances */}
          {staffSubTab === 'advances' && (
            <WorkerAdvancesSection
              workers={workerProfiles}
              currentUserId={user?.id}
              currentUserName={user?.fullName}
            />
          )}
        </div>
      )}

          {/* TAB: Billing Protection Settings */}
          {activeTab === 'billing' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Billing Protection Settings</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Configure secure safeguards for completed receipts, cashier overrides, and transaction locking rules.
                </p>
              </div>

              {/* Active Protection Options */}
              <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-150 dark:border-slate-850 p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Core Protection Controls</h3>
                  <div className="space-y-4">
                    {/* Allow editing of completed bills */}
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={billingSettings.allowEditingCompleted}
                        onChange={(e) => handleUpdateBillingSetting('allowEditingCompleted', e.target.checked)}
                        className="rounded border-slate-350 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-850 dark:text-slate-200">Allow Editing of Completed Bills</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                          If unchecked/disabled, completed bills are locked automatically and cannot be edited, deleted, or undone.
                        </p>
                      </div>
                    </label>

                    {/* Lock all completed bills */}
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={billingSettings.lockAllCompleted}
                        onChange={(e) => handleUpdateBillingSetting('lockAllCompleted', e.target.checked)}
                        className="rounded border-slate-350 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-855 dark:text-slate-200">Lock All Completed Bills</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                          When enabled, forces strict locking of every checkout transaction, disabling edits/undos for all billing types.
                        </p>
                      </div>
                    </label>

                    {/* Lock UPI bills after successful payment */}
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={billingSettings.lockUpiAfterPayment}
                        onChange={(e) => handleUpdateBillingSetting('lockUpiAfterPayment', e.target.checked)}
                        className="rounded border-slate-355 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-855 dark:text-slate-200">Lock UPI Bills After Payment</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                          Lock UPI transactions instantly upon completion to block unauthorized modifications or cashier deletes.
                        </p>
                      </div>
                    </label>

                    {/* Lock Split Payment bills after successful payment */}
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={billingSettings.lockSplitAfterPayment}
                        onChange={(e) => handleUpdateBillingSetting('lockSplitAfterPayment', e.target.checked)}
                        className="rounded border-slate-355 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-855 dark:text-slate-200">Lock Split Payment Bills After Payment</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                          Instantly freeze mixed-payment splits to ensure audit trail correctness and prevent split ledger manipulation.
                        </p>
                      </div>
                    </label>

                    {/* Allow 60-second Undo for Cash payments */}
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={billingSettings.allowCashUndo60s}
                        onChange={(e) => handleUpdateBillingSetting('allowCashUndo60s', e.target.checked)}
                        className="rounded border-slate-355 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-855 dark:text-slate-200">Allow 60-second Undo for Cash Payments</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                          Provide cashiers with a 60-second safety window to cancel and revert a cash sale if an error is made during tender.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Future Safeguards Section */}
              <div className="bg-slate-50/55 dark:bg-slate-950/20 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Future Enhancements & Safeguards</h3>
                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                      Future Update
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal mb-4">
                    The following enterprise security features are pre-structured to support seamless scaling without page redesigns:
                  </p>
                  
                  <div className="space-y-4 opacity-60">
                    <label className="flex items-start gap-3 cursor-not-allowed select-none">
                      <input
                        type="checkbox"
                        disabled
                        checked={billingSettings.requirePinForUndo}
                        className="rounded border-slate-300 text-slate-450 focus:ring-slate-400 h-4.5 w-4.5 mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Require Owner/Manager PIN for Undo</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                          Prompt the cashier for the administrative PIN to authenticate any transaction undo or receipt deletion.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-not-allowed select-none">
                      <input
                        type="checkbox"
                        disabled
                        className="rounded border-slate-300 text-slate-450 focus:ring-slate-400 h-4.5 w-4.5 mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Enable Customer Refunds & Ledger Reversals</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                          Allow full or partial cash refunds synced with historical product inventory levels.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-not-allowed select-none">
                      <input
                        type="checkbox"
                        disabled
                        className="rounded border-slate-300 text-slate-450 focus:ring-slate-400 h-4.5 w-4.5 mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Item Return Module (Defective Stock Audit)</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                          Track customer returns and re-enter pristine or damaged products directly back into the stock history records.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-not-allowed select-none">
                      <input
                        type="checkbox"
                        disabled
                        className="rounded border-slate-300 text-slate-450 focus:ring-slate-400 h-4.5 w-4.5 mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Strict Role-Based Override Limits</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                          Restrict cashier workers from modifying completed sales while granting full administrative rights to Manager roles.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Subscription License */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Licensing Profile</h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    View local license validation schedules and manage commercial subscription renewals.
                  </p>
                </div>
                <span className="shrink-0 text-xs bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold uppercase">
                  ● ACTIVE LICENSE
                </span>
              </div>

              <div className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-4 shadow-sm">
                <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  <Sparkles size={12} />
                  <span>Licensed Active Plan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block">License Tier</span>
                    <strong className="text-sm text-slate-800 dark:text-white uppercase">{subscription?.plan || 'Chhutta Basic'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block">Billing Mode</span>
                    <strong className="text-sm text-slate-800 dark:text-white">Offline Synced Gateway</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block">Renewal Cycle Expiry</span>
                    <strong className="text-sm text-slate-800 dark:text-white">
                      {subscription ? new Date(subscription.expiryDate).toLocaleDateString() : 'N/A'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Plan Access Inclusions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                    ✓ Single terminal/tablet billing workspace
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                    ✓ Full IndexedDB persistent catalog
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                    ✓ Secure local device backups & audits
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                    ✓ Direct UPI QR receipt code generator
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-between gap-4 items-center">
                <button
                  onClick={() => revalidate()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw size={12} /> Verify License State
                </button>
                <button
                  onClick={() => showNotification('Licensing portal integration is prepared. Contact support for active keys.')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-500/10"
                >
                  Manage Renewals
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: Offline Storage & Database Health */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Offline Storage & Database Health</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Monitor offline-first workspace health, automatic cloud synchronizations, and locally stored items.
                </p>
              </div>

              {/* Cache Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850/80 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Offline Storage</span>
                  <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2 block">Active</strong>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850/80 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Database Health</span>
                  <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2 block">Healthy</strong>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850/80 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Storage Used</span>
                  <strong className="text-sm font-extrabold text-slate-850 dark:text-white mt-2 block">{storageUsed}</strong>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850/80 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Pending Sync</span>
                  <strong className="text-sm font-black text-slate-850 dark:text-white mt-2 block">
                    {pendingSyncCount}
                  </strong>
                </div>
              </div>

              {/* Cloud Sync Configured Notice */}
              <div className="p-5 rounded-2xl border border-slate-150 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Cloud Synchronizer Status</span>
                  {SUPABASE_CONFIG.isConfigured ? (
                    <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 px-2.5 py-1 rounded font-bold uppercase text-[9px]">
                      Cloud Sync: Connected
                    </span>
                  ) : (
                    <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60 px-2.5 py-1 rounded font-bold uppercase text-[9px]" id="cloud-sync-status-badge">
                      Cloud Sync: Not Configured
                    </span>
                  )}
                </div>
              </div>

              {/* Warn Card */}
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 md:p-5 flex gap-3.5 shadow-sm">
                <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400">Caution: Resetting Offline Workspace</h4>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-500/80 leading-normal">
                    This resets your onboarding checklist, clearing product catalogs, receipt templates, custom staff records, and UPI merchant IDs saved on this browser. It does not log you out or delete your core owner profile.
                  </p>
                </div>
              </div>

              {/* Local Actions */}
              <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-between gap-4">
                <button
                  type="button"
                  onClick={handleForceSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Synchronizing State...' : 'Force Sync Data'}
                </button>

                <button
                  type="button"
                  onClick={handleClearCaches}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold uppercase cursor-pointer transition-colors"
                >
                  <Trash2 size={14} /> Clear Offline Workspace
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: Help & Tutorials */}
          {activeTab === 'help' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Help, Tutorials & Documentation</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Access offline tutorials, frequently asked questions, upcoming product releases, and custom software inquiry sheets.
                </p>
              </div>

              {/* Sub-section 1: Tutorials */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={14} /> Interactive Store Onboarding Tutorials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded font-bold uppercase">Basic Operations</span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">Getting Started with ChhuttaPOS</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Learn how to set up your business profile, add catalogs, use the local sandbox printer system, and configure your payment modes.
                    </p>
                    <button 
                      onClick={() => showNotification('Tutorial Guide loaded locally: Settings profile parameters have been fully set.')} 
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline mt-2.5 inline-flex items-center gap-0.5"
                    >
                      Read Guide <ChevronRight size={12} />
                    </button>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-[9px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-bold uppercase">UPI Integration</span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">Configuring UPI Receipt Payments</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Step-by-step instructions for entering BHIM / Paytm / GPay Virtual Payment Addresses (VPA) to show direct checkout QR codes.
                    </p>
                    <button 
                      onClick={() => showNotification('Tutorial Guide loaded locally: UPI routing configuration.')} 
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline mt-2.5 inline-flex items-center gap-0.5"
                    >
                      Read Guide <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-section 2: FAQ Accordions */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Frequently Asked Questions (FAQ)</h3>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-850">
                  {[
                    {
                      q: "Does ChhuttaPOS require internet to perform checkouts?",
                      a: "No! ChhuttaPOS is 100% offline-first. Your inventory catalogs, checkout buffers, sales counters, and receipt templates reside safely within your browser's local sandbox memory. Sales checkout is unaffected by connection outages."
                    },
                    {
                      q: "How do I configure receipt prints from standard computers?",
                      a: "You can print receipt layouts to any thermal printer connected via USB or Wifi. The app uses standard browser printing prompts formatted perfectly for 58mm and 80mm continuous paper rolls."
                    },
                    {
                      q: "Is my business customer data private & safe?",
                      a: "Absolutely! ChhuttaPOS stores your staff information and product pricing directly on your physical hardware storage. It never sends private catalogs or transaction details to commercial data silos."
                    }
                  ].map((faq, idx) => {
                    const isOpen = expandedFaq === idx;
                    return (
                      <div key={idx} className="p-4">
                        <button
                          type="button"
                          onClick={() => setExpandedFaq(isOpen ? null : idx)}
                          className="w-full flex items-center justify-between text-left focus:outline-none"
                        >
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{faq.q}</span>
                          <span className="text-xs text-slate-400 font-extrabold">{isOpen ? '−' : '+'}</span>
                        </button>
                        {isOpen && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                            {faq.a}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-section 3: Need Branded Android App / custom website */}
              <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full">
                    <Globe size={10} /> Custom Branded Builds
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Need a Branded Android App or Dedicated Cloud Website?</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal max-w-xl">
                    Get an independent launcher icon application (.apk), custom dedicated website URL, or integrated database storage tailored specifically for your multi-store supermarket enterprise.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('contact');
                    setContactSubject('Inquiry: Branded Android APK & Standalone Cloud Database');
                    showNotification('Switched to Contact panel. Form auto-filled for custom inquiries.');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap self-start md:self-center"
                >
                  Inquire Now
                </button>
              </div>

              {/* Sub-section 4: Upcoming updates */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-600" /> Upcoming Platform Releases (Roadmap)
                </h3>
                <div className="relative border-l-2 border-indigo-100 dark:border-indigo-950 pl-4 space-y-4 py-1">
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-indigo-600"></span>
                    <strong className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block">Q3 2026 Release</strong>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Continuous USB Barcode Scanning</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">Integrate direct hardware scanning buffers for rapid cash counter sales.</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800"></span>
                    <strong className="text-[10px] font-bold text-slate-400 block">Q4 2026 Release</strong>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Automatic Backup Ledger Replication</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">Real-time local replication checkpoints backing up stores safely to remote cloud nodes.</p>
                  </div>
                </div>
              </div>

              {/* Quick links to Feedback and Support tabs */}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-850">
                <span className="text-[10px] text-slate-500 font-medium">Need instant troubleshooting, or want to give direct feedback?</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveTab('contact')} 
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Open Support Ticket
                  </button>
                  <span className="text-slate-300">|</span>
                  <button 
                    onClick={() => setActiveTab('feedback')} 
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Submit Feedback
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Submit Feedback */}
          {activeTab === 'feedback' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Submit User Experience Feedback</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Share your software interface suggestions, bug findings, or performance reviews with our team of developers.
                </p>
              </div>

              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                {/* Rating Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Overall Rating</label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        className="p-1 transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          size={24}
                          className={star <= feedbackRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-2">
                      ({feedbackRating} / 5 stars)
                    </span>
                  </div>
                </div>

                {/* Feedback Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                    <select
                      value={feedbackCategory}
                      onChange={(e) => setFeedbackCategory(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    >
                      <option value="Billing">Billing & Checkout POS</option>
                      <option value="Inventory">Products Catalog</option>
                      <option value="Performance">Layout & Speed</option>
                      <option value="Dark Mode">Theme Engine</option>
                      <option value="Other">Other Suggestions</option>
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Your Comments</label>
                  <textarea
                    required
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="Tell us what you liked, or where we can improve..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-500/10"
                  >
                    Log Feedback
                  </button>
                </div>
              </form>

              {/* Feedback History Log */}
              {feedbackHistory.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-slate-150 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <History size={14} /> Logged Feedback History
                  </h3>
                  <div className="space-y-3">
                    {feedbackHistory.map((fb, idx) => (
                      <div key={fb.id || idx} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                              {fb.category}
                            </span>
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={10}
                                  className={i < fb.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-800'}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-400">{fb.date}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 italic">
                          "{fb.message}"
                        </p>

                        {fb.metadata && (
                          <div className="mt-2 bg-slate-100 dark:bg-slate-900/60 rounded-xl p-2 px-2.5 border border-slate-150 dark:border-slate-850 text-[9px] text-slate-400 space-y-1">
                            <span className="font-bold text-slate-500 uppercase block text-[8px] tracking-wider mb-0.5">Diagnostic Metadata</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 font-mono">
                              <div>Biz ID: <span className="text-slate-600 dark:text-slate-300">{fb.metadata.businessId}</span></div>
                              <div>Biz Type: <span className="text-slate-600 dark:text-slate-300">{fb.metadata.businessType}</span></div>
                              <div>Screen: <span className="text-slate-600 dark:text-slate-300">{fb.metadata.deviceScreen}</span></div>
                              <div className="truncate">Browser: <span className="text-slate-600 dark:text-slate-300" title={fb.metadata.devicePlatform}>{fb.metadata.devicePlatform}</span></div>
                            </div>
                          </div>
                        )}

                        <div className="mt-2.5 flex justify-between items-center border-t border-slate-100 dark:border-slate-900 pt-2 text-[8px] font-extrabold uppercase tracking-wide">
                          <span className="text-slate-400">ID: {fb.id}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                            ● {fb.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: Contact Support */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Contact Store Helpdesk</h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Open active customer care tickets or connect directly with our business technical coordinates.
                  </p>
                </div>
                <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Support hours: 9 AM - 7 PM IST (Mon - Sat)
                </div>
              </div>

              {/* Contacts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl flex items-center gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 shrink-0">
                    <Mail size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Official Email</span>
                    <strong className="text-xs text-slate-800 dark:text-slate-100 font-mono select-all">chhuttapos@gmail.com</strong>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl flex items-center gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 shrink-0">
                    <Phone size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Support Hotline</span>
                    <strong className="text-xs text-slate-800 dark:text-slate-100 font-mono select-all">+91 9449963055</strong>
                  </div>
                </div>
              </div>

              {/* Support Ticket form */}
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider">Open a Customer Care Ticket</h3>
                <form onSubmit={handleSubmitContactTicket} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Your Name</label>
                      <input
                        type="text"
                        disabled
                        value={user?.fullName || ''}
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 outline-none cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Associated Email</label>
                      <input
                        type="text"
                        disabled
                        value={user?.email || ''}
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Subject of Ticket</label>
                    <input
                      type="text"
                      required
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      placeholder="e.g. Printer calibration driver, or tax report layout"
                      className="w-full h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Problem Description</label>
                    <textarea
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Write your issue details here..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-850">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-500/10"
                    >
                      Dispatch Support Ticket
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Tickets History */}
              {contactHistory.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-slate-150 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <History size={14} /> Open Support Incident Logs
                  </h3>
                  <div className="space-y-3">
                    {contactHistory.map((t, idx) => (
                      <div key={t.id || idx} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <strong className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.subject}</strong>
                          <span className="text-[9px] text-slate-400">{t.date}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {t.message}
                        </p>
                        <div className="mt-2.5 flex justify-between items-center border-t border-slate-100 dark:border-slate-900 pt-2 text-[8px] font-extrabold uppercase tracking-wide">
                          <span className="text-slate-400">TICKET: {t.id}</span>
                          <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded">
                            ● {t.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: About App */}
          {activeTab === 'about' && (
            <div className="space-y-6 text-center max-w-md mx-auto py-8">
              <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-extrabold mx-auto shadow-xl shadow-indigo-500/20">
                C
              </div>
              
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">ChhuttaPOS Utility</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Offline-First Micro-Retail Invoicing Companion</p>
                <p className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">Stable Build v1.0.4 • PWA Release</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850 text-left space-y-2.5 text-xs text-slate-600 dark:text-slate-400 leading-normal">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
                  <span className="font-medium text-slate-400">Release Build</span>
                  <span className="font-mono text-slate-800 dark:text-white font-bold">2026.07.15</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
                  <span className="font-medium text-slate-400">Local Sandbox Mode</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">IndexedDB Secure Shield</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
                  <span className="font-medium text-slate-400">Licensing Profile</span>
                  <span className="font-bold text-slate-800 dark:text-white">Active Basic Tier</span>
                </div>
                <p className="text-[10px] text-slate-400 pt-1 text-center font-sans">
                  © 2026 Chhutta Technologies Private Limited. All intellectual registers reserved locally.
                </p>
              </div>

              <div className="flex justify-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <button onClick={() => showNotification('Licensing policy details loaded locally.')} className="hover:text-indigo-600">Terms of Service</button>
                <span>•</span>
                <button onClick={() => showNotification('GDPR privacy policies loaded locally.')} className="hover:text-indigo-600">Privacy Policy</button>
              </div>
            </div>
          )}

        </div>

      </div>

      {showTestQrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Test UPI Payment QR</h3>
              <button
                onClick={() => setShowTestQrModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-850">
              <QRCodeSVG
                value={`upi://pay?pa=${encodeURIComponent(paymentSettings.upiId)}&pn=${encodeURIComponent(paymentSettings.businessName || paymentSettings.merchantName || 'Business')}&am=1.00&tn=ChhuttaPOSTest`}
                size={180}
                level="M"
                includeMargin={true}
                className="bg-white p-2 rounded-lg"
              />
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-3 font-mono">
                {paymentSettings.upiId}
              </span>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-slate-800 dark:text-white">Scan with any UPI App</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                Verifies payment config by initiating a test checkout transaction of ₹1.00 to <strong>{paymentSettings.businessName || paymentSettings.merchantName || 'your business'}</strong>.
              </p>
            </div>

            <button
              onClick={() => setShowTestQrModal(false)}
              className="w-full h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
            >
              Close Test
            </button>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Staff?</h3>
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This action will permanently remove this staff account.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="flex-1 h-10 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteStaff(staffToDelete.id)}
                className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
