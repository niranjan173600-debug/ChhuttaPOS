/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, UserRole, SubscriptionPlan, SubscriptionStatus, SubscriptionState } from '../types';
import { db } from '../database/db';
import { supabase, SUPABASE_CONFIG } from '../config/supabase';

/**
 * SupabaseService serves as our API adapter for user accounts, authentication, and central licensing.
 * Uses the official Supabase SDK when configured, with offline-resilient local caching.
 */
export class SupabaseService {
  private static instance: SupabaseService;
  private currentSessionUser: UserProfile | null = null;

  private constructor() {
    this.restoreSession();
    this.initAuthListener();
  }

  static getInstance(): SupabaseService {
    if (!this.instance) {
      this.instance = new SupabaseService();
    }
    return this.instance;
  }

  private initAuthListener() {
    if (!supabase) return;

    try {
      supabase.auth.onAuthStateChange((event, session) => {
        console.log(`[Supabase Auth Listener] Event: ${event}, Session user: ${session?.user?.id || 'none'}`);
        if (session?.user) {
          const u = session.user;
          const userProfile: UserProfile = {
            id: u.id,
            email: u.email || '',
            role: (u.user_metadata?.role as UserRole) || UserRole.OWNER,
            fullName: u.user_metadata?.fullName || u.user_metadata?.full_name || (u.email ? u.email.split('@')[0].toUpperCase() : 'BUSINESS OWNER'),
            createdAt: u.created_at || new Date().toISOString(),
            businessId: u.user_metadata?.businessId,
          };
          this.currentSessionUser = userProfile;
          localStorage.setItem('chhuta_session_user', JSON.stringify(userProfile));
        } else if (event === 'SIGNED_OUT') {
          this.currentSessionUser = null;
          localStorage.removeItem('chhuta_session_user');
        }
      });
    } catch (err) {
      console.warn('[Supabase Auth Listener Warning]', err);
    }
  }

  private restoreSession() {
    try {
      const cached = localStorage.getItem('chhuta_session_user');
      if (cached) {
        this.currentSessionUser = JSON.parse(cached);
      }
    } catch (e) {
      console.error('[Supabase Session Restore Error]', e);
    }
  }

  getCurrentUser(): UserProfile | null {
    return this.currentSessionUser;
  }

  setCurrentUser(user: UserProfile | null) {
    this.currentSessionUser = user;
    if (user) {
      localStorage.setItem('chhuta_session_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('chhuta_session_user');
    }
  }

  /**
   * Authenticates user via email (Owner login).
   */
  async loginWithEmail(email: string, pass: string): Promise<UserProfile> {
    const cleanEmail = email.trim();
    const cleanPass = pass ? pass.trim() : '';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!cleanPass) {
      throw new Error('Please enter your password.');
    }

    if (supabase && SUPABASE_CONFIG.isConfigured) {
      console.log(`[Supabase Auth] Attempting signInWithPassword for email: ${cleanEmail}`);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (error) {
        console.error(`[Supabase Auth Error] ${error.message}`);
        throw new Error(error.message || 'Authentication failed. Please check your email and password.');
      }

      if (data?.user) {
        const u = data.user;
        const user: UserProfile = {
          id: u.id,
          email: u.email || cleanEmail,
          role: (u.user_metadata?.role as UserRole) || UserRole.OWNER,
          fullName: u.user_metadata?.fullName || u.user_metadata?.full_name || cleanEmail.split('@')[0].toUpperCase(),
          createdAt: u.created_at || new Date().toISOString(),
          businessId: u.user_metadata?.businessId,
        };
        this.currentSessionUser = user;
        localStorage.setItem('chhuta_session_user', JSON.stringify(user));
        return user;
      }
    }

    throw new Error('Supabase Auth is not configured. Please verify your Supabase URL and key.');
  }

  /**
   * Authenticates staff members with Business ID, Username/Email and Password.
   * Validates strictly against accounts created by the business owner.
   */
  async loginStaff(businessId: string, usernameOrEmail: string, pass: string): Promise<UserProfile> {
    const upperBusId = (businessId || '').trim().toUpperCase();
    const cleanUser = (usernameOrEmail || '').trim();
    const cleanPass = (pass || '').trim();

    if (!upperBusId || !cleanUser || !cleanPass) {
      throw new Error('Business ID, Username/Email, and Password are all required.');
    }

    // 1. Validate Business Code against Supabase / Cloud API
    let bizExists = false;
    try {
      const ownerRes = await fetch(`/api/business/owner?businessId=${encodeURIComponent(upperBusId)}`);
      if (ownerRes.ok) {
        const ownerData = await ownerRes.json();
        if (ownerData.exists) {
          bizExists = true;
        }
      }
    } catch (e) {
      console.warn('Cloud API business lookup failed, checking Dexie fallback:', e);
    }

    if (!bizExists) {
      const matchedBiz = await db.businessConfigs.get(upperBusId);
      if (matchedBiz) {
        bizExists = true;
      }
    }

    if (!bizExists) {
      throw new Error('Invalid Business ID. Business workspace not found.');
    }

    // 2. Fetch staff accounts created by owner from storage
    const staffJson = localStorage.getItem('chhuta_staff_accounts') || localStorage.getItem('chhuta_mock_staff') || '[]';
    let staffList: any[] = [];
    try {
      staffList = JSON.parse(staffJson);
    } catch (e) {
      staffList = [];
    }

    // Also check Dexie workerProfiles
    try {
      const dexieWorkers = await db.workerProfiles.toArray();
      dexieWorkers.forEach(w => {
        if (!staffList.some(s => s.id === w.id || s.id === w.staffAccountId)) {
          staffList.push({
            id: w.staffAccountId || w.id,
            name: w.name,
            username: w.username || w.name,
            email: w.email,
            role: w.role,
            businessId: upperBusId,
            passwordHash: (w as any).passwordHash || (w as any).password,
            status: w.status,
            createdAt: w.createdAt
          });
        }
      });
    } catch (err) {
      console.warn('Error reading Dexie workers during staff login:', err);
    }

    // Look up staff account by Staff ID, Username, Email, Phone, or Name under upperBusId
    const matchingStaff = staffList.filter((s: any) => {
      const sBusId = (s.businessId || '').trim().toUpperCase();
      const bMatch = !sBusId || sBusId === upperBusId;
      const uMatch = (s.id || '').trim().toLowerCase() === cleanUser.toLowerCase() ||
                     (s.email || '').trim().toLowerCase() === cleanUser.toLowerCase() ||
                     (s.username || '').trim().toLowerCase() === cleanUser.toLowerCase() ||
                     (s.phone || '').trim() === cleanUser ||
                     (s.name || '').trim().toLowerCase() === cleanUser.toLowerCase();
      return bMatch && uMatch;
    });

    if (matchingStaff.length === 0) {
      throw new Error('Invalid Username or Business ID. Staff account not found.');
    }

    // Verify Password strictly
    const staff = matchingStaff.find((s: any) => {
      const storedPass = s.passwordHash || s.password || s.tempPassword || s.pass || s.pin;
      if (!storedPass) return false;
      return storedPass === pass || storedPass === cleanPass || storedPass.toString().toLowerCase() === cleanPass.toLowerCase();
    });

    if (!staff) {
      throw new Error('Incorrect Password. Please check your password and try again.');
    }

    if (staff.status === 'DISABLED' || staff.status === 'INACTIVE' || staff.status === 'SUSPENDED') {
      throw new Error('Staff account disabled. Please contact your business owner.');
    }

    // Record last login
    const updatedStaff = staffList.map((s: any) => {
      if (s.id === staff.id) {
        return { ...s, lastLogin: new Date().toISOString() };
      }
      return s;
    });
    localStorage.setItem('chhuta_staff_accounts', JSON.stringify(updatedStaff));

    const user: UserProfile = {
      id: staff.id,
      email: staff.email || `${staff.username || staff.id}@store.com`,
      role: staff.role as UserRole,
      fullName: staff.name || staff.fullName || staff.username,
      businessId: upperBusId,
      createdAt: staff.createdAt || new Date().toISOString(),
      mustChangePassword: staff.status === 'FORCE_CHANGE_PASSWORD',
      status: staff.status,
      lastLogin: new Date().toISOString(),
    };

    this.currentSessionUser = user;
    localStorage.setItem('chhuta_session_user', JSON.stringify(user));
    return user;
  }

  /**
   * Updates staff password on first login.
   */
  async changeStaffPassword(staffId: string, newPass: string): Promise<void> {
    const staffJson = localStorage.getItem('chhuta_staff_accounts') || localStorage.getItem('chhuta_mock_staff') || '[]';
    const staffList = JSON.parse(staffJson);
    
    let updated = false;
    const updatedStaff = staffList.map((s: any) => {
      if (s.id === staffId) {
        updated = true;
        return {
          ...s,
          passwordHash: newPass,
          status: 'ACTIVE' as const
        };
      }
      return s;
    });
    
    if (!updated) {
      throw new Error('Staff member not found.');
    }
    
    localStorage.setItem('chhuta_staff_accounts', JSON.stringify(updatedStaff));
    
    // Also update session user if active
    if (this.currentSessionUser && this.currentSessionUser.id === staffId) {
      this.currentSessionUser.mustChangePassword = false;
      this.currentSessionUser.status = 'ACTIVE';
      localStorage.setItem('chhuta_session_user', JSON.stringify(this.currentSessionUser));
    }
  }

  /**
   * Integrates Google Login using Supabase Authentication OAuth flow.
   */
  async loginWithGoogle(): Promise<void> {
    if (supabase && SUPABASE_CONFIG.isConfigured) {
      console.log('[Supabase Auth] Initiating Google OAuth flow...');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) {
        throw new Error(`Google login error: ${error.message}`);
      }
    } else {
      throw new Error('Supabase Auth is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to environment variables.');
    }
  }

  /**
   * Creates a new user profile inside Supabase Auth.
   */
  async signupWithEmail(email: string, pass: string, fullName: string, role: UserRole): Promise<UserProfile> {
    const cleanEmail = email.trim();
    const cleanPass = pass ? pass.trim() : '';
    const cleanName = fullName.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!cleanPass || cleanPass.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    if (!cleanName) {
      throw new Error('Please provide your full name.');
    }

    const nowIso = new Date().toISOString();

    if (supabase && SUPABASE_CONFIG.isConfigured) {
      console.log(`[Supabase Auth] Executing signUp for email: ${cleanEmail}`);
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: {
            fullName: cleanName,
            role,
          }
        }
      });

      if (error) {
        console.error(`[Supabase Auth SignUp Error] ${error.message}`);
        throw new Error(error.message || 'Failed to create account via Supabase Auth.');
      }

      if (data?.user) {
        const u = data.user;
        const user: UserProfile = {
          id: u.id,
          email: u.email || cleanEmail,
          role,
          fullName: cleanName,
          createdAt: u.created_at || nowIso,
          legal_consent: true,
          legal_consent_timestamp: nowIso,
          privacy_policy_version: 'v1.0',
          terms_version: 'v1.0',
          refund_policy_version: 'v1.0',
        };
        this.currentSessionUser = user;
        localStorage.setItem('chhuta_session_user', JSON.stringify(user));
        return user;
      }
    }

    throw new Error('Supabase Auth is not configured. Unable to register user.');
  }

  /**
   * Initiates password recovery.
   */
  async resetPassword(email: string): Promise<void> {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Account email not found.');
    }

    if (supabase && SUPABASE_CONFIG.isConfigured) {
      console.log(`[Supabase Auth] Requesting password reset for: ${cleanEmail}`);
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) {
        console.warn(`[Supabase Auth Reset Password Warning] ${error.message}`);
      }
    }
  }

  /**
   * Terminate active user sessions.
   */
  async logout(): Promise<void> {
    if (supabase && SUPABASE_CONFIG.isConfigured) {
      console.log('[Supabase Auth] Signing out active Supabase session...');
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[Supabase SignOut Warning]', err);
      }
    }
    this.currentSessionUser = null;
    localStorage.removeItem('chhuta_session_user');
  }

  /**
   * Validates License or Subscription state against Supabase.
   * If offline, returns null to trigger local offline policy engine.
   */
  async checkSubscriptionStatus(userId: string): Promise<SubscriptionState | null> {
    try {
      const records = await db.subscriptions.toArray();
      if (records && records.length > 0) {
        const active = records[0];
        const now = new Date();
        const expiry = new Date(active.expiryDate);
        const graceEnds = active.offlineGracePeriodEnds 
          ? new Date(active.offlineGracePeriodEnds)
          : new Date(expiry.getTime() + 2 * 24 * 60 * 60 * 1000); // 2-day grace period

        let status = active.status as SubscriptionStatus;
        if (now <= expiry) {
          status = active.plan === 'FREE' ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE;
        } else if (now <= graceEnds) {
          status = SubscriptionStatus.GRACE_PERIOD;
        } else {
          status = SubscriptionStatus.EXPIRED;
        }

        return {
          plan: active.plan as SubscriptionPlan,
          status,
          subscription_status: active.subscription_status || (status === SubscriptionStatus.TRIAL ? 'trial' : status === SubscriptionStatus.ACTIVE ? 'active' : status === SubscriptionStatus.GRACE_PERIOD ? 'grace_period' : 'expired'),
          trial_start_date: active.trial_start_date,
          trial_end_date: active.trial_end_date,
          subscription_start: active.subscription_start,
          subscription_end: active.subscription_end,
          expiryDate: active.expiryDate,
          lastVerificationTime: active.lastVerificationTime,
          verificationToken: active.verificationToken,
          offlineGracePeriodEnds: graceEnds.toISOString(),
          gracePeriodExpiry: active.gracePeriodExpiry || graceEnds.toISOString(),
          autoRenewEnabled: active.autoRenewEnabled ?? false,
          nextBillingDate: active.nextBillingDate,
          baseDuration: active.baseDuration,
          bonusDays: active.bonusDays,
          graceDays: active.graceDays ?? 2,
        };
      }
    } catch (e) {
      console.error('Failed to check subscription status from DB:', e);
    }
    return null;
  }
}

export const supabaseService = SupabaseService.getInstance();
