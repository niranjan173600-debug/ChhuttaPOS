/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, BusinessConfig, BusinessType } from '../types';
import { supabaseService } from '../services/supabase';
import { subscriptionService } from '../services/subscription';
import { billingRepository } from '../repositories/billing.repository';
import { db } from '../database/db';
import { CURRENT_LEGAL_VERSIONS } from '../config/legalConfig';

interface AuthContextType {
  user: UserProfile | null;
  business: BusinessConfig | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<UserProfile>;
  signup: (email: string, fullName: string, role: UserRole) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  staffLogin: (businessId: string, email: string, pass: string) => Promise<UserProfile>;
  registerBusiness: (config: Omit<BusinessConfig, 'id' | 'isConfigured'>, explicitBusinessId?: string) => Promise<BusinessConfig>;
  updateBusiness: (updatedConfig: Partial<BusinessConfig>) => Promise<void>;
  changeStaffPassword: (staffId: string, newPass: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isOwner: boolean;
  isManager: boolean;
  isStaff: boolean;
  isWorker: boolean;
  checkRolePermission: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<BusinessConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initSession() {
      try {
        const currentUser = supabaseService.getCurrentUser();
        if (currentUser) {
          const bizList = await db.businessConfigs.toArray();
          const matched = bizList.find(b => b.id === currentUser.businessId || (b.email && b.email.toLowerCase() === currentUser.email.toLowerCase()));
          const businessId = matched?.id || currentUser.businessId;

          if (businessId) {
            currentUser.businessId = businessId;
            supabaseService.setCurrentUser(currentUser);
          }

          if (matched) {
            setBusiness({
              id: matched.id,
              name: matched.name,
              type: matched.type as BusinessType,
              currency: matched.currency,
              timezone: matched.timezone,
              ownerName: matched.ownerName,
              address: matched.address,
              taxNumber: matched.taxNumber,
              logoUrl: matched.logoUrl,
              phone: matched.phone,
              email: matched.email,
              isConfigured: matched.isConfigured === 1,
              legal_consent: matched.legal_consent,
              legal_consent_timestamp: matched.legal_consent_timestamp,
              privacy_policy_version: matched.privacy_policy_version,
              terms_version: matched.terms_version,
              refund_policy_version: matched.refund_policy_version,
            });
          }

          // Fetch latest subscription from Supabase as Source of Truth & update local Dexie cache
          if (businessId) {
            try {
              const res = await fetch(`/api/subscription/status?businessId=${businessId}`);
              if (res.ok) {
                const data = await res.json();
                if (data.subscription) {
                  await billingRepository.saveSubscription(data.subscription);
                  if (data.history) {
                    localStorage.setItem('chhuta_subscription_history', JSON.stringify(data.history));
                  }
                }
              }
            } catch (subErr) {
              console.warn('[Init Session Subscription Sync Warning]', subErr);
            }
          }

          // Sync profile to local store
          await db.userProfiles.put({
            id: currentUser.id,
            email: currentUser.email,
            role: currentUser.role,
            fullName: currentUser.fullName,
            phoneNumber: currentUser.phoneNumber,
            businessId: currentUser.businessId,
            createdAt: currentUser.createdAt,
            legal_consent: currentUser.legal_consent,
            legal_consent_timestamp: currentUser.legal_consent_timestamp,
            privacy_policy_version: currentUser.privacy_policy_version,
            terms_version: currentUser.terms_version,
            refund_policy_version: currentUser.refund_policy_version,
          });

          setUser(currentUser);
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    initSession();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      // Step 1: Authenticate with Supabase Auth
      const profile = await supabaseService.loginWithEmail(email, pass);

      // Step 2: Retrieve the owner's Business ID & Business Config
      const bizList = await db.businessConfigs.toArray();
      let matched = bizList.find(b => b.id === profile.businessId || (b.email && b.email.toLowerCase() === profile.email.toLowerCase()));
      let businessId = matched?.id || profile.businessId;

      if (businessId) {
        profile.businessId = businessId;
        supabaseService.setCurrentUser(profile);
      }

      if (matched) {
        setBusiness({
          id: matched.id,
          name: matched.name,
          type: matched.type as BusinessType,
          currency: matched.currency,
          timezone: matched.timezone,
          ownerName: matched.ownerName,
          address: matched.address,
          taxNumber: matched.taxNumber,
          logoUrl: matched.logoUrl,
          phone: matched.phone,
          email: matched.email,
          isConfigured: matched.isConfigured === 1,
        });
      } else {
        setBusiness(null);
      }

      // Step 3, 4, 5: Fetch latest Subscription & License from Supabase and replace Dexie cache
      if (businessId) {
        try {
          const res = await fetch(`/api/subscription/status?businessId=${businessId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.subscription) {
              await billingRepository.saveSubscription(data.subscription);
              if (data.history) {
                localStorage.setItem('chhuta_subscription_history', JSON.stringify(data.history));
              }
              console.log(`[Login Subscription Sync] Business ${businessId} subscription fetched from Supabase: Plan ${data.subscription.plan}, Status ${data.subscription.status}`);
            }
          }
        } catch (subErr) {
          console.warn('[Login Subscription Sync Warning]', subErr);
        }

        try {
          await fetch('/api/license/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ businessId, subscriptionId: businessId, status: 'ACTIVE' })
          });
        } catch (licErr) {
          console.warn('[Login License Sync Warning]', licErr);
        }
      }

      await db.userProfiles.put({
        id: profile.id,
        email: profile.email,
        role: profile.role,
        fullName: profile.fullName,
        phoneNumber: profile.phoneNumber,
        businessId: profile.businessId,
        createdAt: profile.createdAt,
      });

      // Step 6 & 7: Set user state (triggers SubscriptionContext refresh & renders Dashboard)
      setUser(profile);

      return profile;
    } catch (error) {
      console.error('Login action failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const profile = await supabaseService.loginWithGoogle();
      
      const bizList = await db.businessConfigs.toArray();
      let matched = bizList.find(b => b.id === profile.businessId || (b.email && b.email.toLowerCase() === profile.email.toLowerCase()));
      let businessId = matched?.id || profile.businessId;

      if (businessId) {
        profile.businessId = businessId;
        supabaseService.setCurrentUser(profile);
      }

      if (matched) {
        setBusiness({
          id: matched.id,
          name: matched.name,
          type: matched.type as BusinessType,
          currency: matched.currency,
          timezone: matched.timezone,
          ownerName: matched.ownerName,
          address: matched.address,
          taxNumber: matched.taxNumber,
          logoUrl: matched.logoUrl,
          phone: matched.phone,
          email: matched.email,
          isConfigured: matched.isConfigured === 1,
        });
      } else {
        setBusiness(null);
      }

      if (businessId) {
        try {
          const res = await fetch(`/api/subscription/status?businessId=${businessId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.subscription) {
              await billingRepository.saveSubscription(data.subscription);
              if (data.history) {
                localStorage.setItem('chhuta_subscription_history', JSON.stringify(data.history));
              }
            }
          }
        } catch (subErr) {
          console.warn('[Google Login Subscription Sync Warning]', subErr);
        }

        try {
          await fetch('/api/license/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ businessId, subscriptionId: businessId, status: 'ACTIVE' })
          });
        } catch (licErr) {
          console.warn('[Google Login License Sync Warning]', licErr);
        }
      }

      await db.userProfiles.put({
        id: profile.id,
        email: profile.email,
        role: profile.role,
        fullName: profile.fullName,
        phoneNumber: profile.phoneNumber,
        businessId: profile.businessId,
        createdAt: profile.createdAt,
      });

      setUser(profile);
      return profile;
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const staffLogin = async (businessId: string, emailOrUser: string, pass: string) => {
    setIsLoading(true);
    try {
      const profile = await supabaseService.loginStaff(businessId, emailOrUser, pass);
      const upperBusId = businessId.trim().toUpperCase();
      profile.businessId = upperBusId;
      supabaseService.setCurrentUser(profile);

      let matchedBiz = await db.businessConfigs.get(upperBusId);
      if (!matchedBiz) {
        matchedBiz = {
          id: upperBusId,
          name: 'Staff Outlet Console',
          type: 'HYBRID',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          ownerName: 'Central Admin',
          isConfigured: 1,
        };
        await db.businessConfigs.put(matchedBiz);
      }

      setBusiness({
        id: matchedBiz.id,
        name: matchedBiz.name,
        type: matchedBiz.type as BusinessType,
        currency: matchedBiz.currency,
        timezone: matchedBiz.timezone,
        ownerName: matchedBiz.ownerName,
        address: matchedBiz.address,
        taxNumber: matchedBiz.taxNumber,
        logoUrl: matchedBiz.logoUrl,
        phone: matchedBiz.phone,
        email: matchedBiz.email,
        isConfigured: matchedBiz.isConfigured === 1,
      });

      try {
        const res = await fetch(`/api/subscription/status?businessId=${upperBusId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.subscription) {
            await billingRepository.saveSubscription(data.subscription);
          }
        }
      } catch (subErr) {
        console.warn('[Staff Login Subscription Sync Warning]', subErr);
      }

      await db.userProfiles.put({
        id: profile.id,
        email: profile.email,
        role: profile.role,
        fullName: profile.fullName,
        businessId: profile.businessId,
        createdAt: profile.createdAt,
      });

      setUser(profile);
      return profile;
    } catch (error) {
      console.error('Staff login action failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, fullName: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const profile = await supabaseService.signupWithEmail(email, fullName, role);
      setUser(profile);
      await db.userProfiles.put({
        id: profile.id,
        email: profile.email,
        role: profile.role,
        fullName: profile.fullName,
        createdAt: profile.createdAt,
        legal_consent: true,
        legal_consent_timestamp: profile.legal_consent_timestamp || new Date().toISOString(),
        privacy_policy_version: profile.privacy_policy_version || CURRENT_LEGAL_VERSIONS.privacy_policy_version,
        terms_version: profile.terms_version || CURRENT_LEGAL_VERSIONS.terms_version,
        refund_policy_version: profile.refund_policy_version || CURRENT_LEGAL_VERSIONS.refund_policy_version,
      });
      setBusiness(null); // Reset business for new signups
      return profile;
    } catch (error) {
      console.error('Signup action failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerBusiness = async (config: Omit<BusinessConfig, 'id' | 'isConfigured'>, explicitBusinessId?: string) => {
    setIsLoading(true);
    try {
      const newId = explicitBusinessId || (config as any).id || `CP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const nowIso = new Date().toISOString();

      const newBiz: BusinessConfig = {
        ...config,
        id: newId,
        isConfigured: true,
        legal_consent: true,
        legal_consent_timestamp: nowIso,
        privacy_policy_version: CURRENT_LEGAL_VERSIONS.privacy_policy_version,
        terms_version: CURRENT_LEGAL_VERSIONS.terms_version,
        refund_policy_version: CURRENT_LEGAL_VERSIONS.refund_policy_version,
      };

      // STEP 1: CREATE BUSINESS RECORD IN LOCAL DEXIE & SERVER/SUPABASE
      await db.businessConfigs.put({
        id: newBiz.id,
        name: newBiz.name,
        type: newBiz.type,
        currency: newBiz.currency,
        timezone: newBiz.timezone,
        ownerName: newBiz.ownerName,
        address: newBiz.address,
        taxNumber: newBiz.taxNumber,
        logoUrl: newBiz.logoUrl,
        phone: newBiz.phone,
        email: newBiz.email,
        isConfigured: 1,
        legal_consent: true,
        legal_consent_timestamp: nowIso,
        privacy_policy_version: CURRENT_LEGAL_VERSIONS.privacy_policy_version,
        terms_version: CURRENT_LEGAL_VERSIONS.terms_version,
        refund_policy_version: CURRENT_LEGAL_VERSIONS.refund_policy_version,
      });

      // Verify Business in Dexie
      const verifiedBiz = await db.businessConfigs.get(newBiz.id);
      if (!verifiedBiz) {
        throw new Error('Step 1 Failed: Business record creation failed in local database.');
      }

      // Sync Business to Server / Supabase
      try {
        const syncResp = await fetch('/api/business/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newBiz.id,
            name: newBiz.name,
            type: newBiz.type,
            currency: newBiz.currency,
            timezone: newBiz.timezone,
            ownerName: newBiz.ownerName,
            ownerEmail: newBiz.email || user?.email,
            phone: newBiz.phone,
            address: newBiz.address,
            taxNumber: newBiz.taxNumber,
            logoUrl: newBiz.logoUrl,
            isConfigured: true
          })
        });

        if (syncResp.ok) {
          const syncData = await syncResp.json();
          if (syncData.error) {
            throw new Error(syncData.error);
          }
        }
      } catch (syncErr: any) {
        console.warn('[Business Sync Warning]', syncErr);
      }

      // STEP 2: CREATE FREE 7-DAY TRIAL SUBSCRIPTION
      const trialStart = nowIso;
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const graceEnd = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString();

      const trialSub = {
        id: newBiz.id,
        plan: 'Free Trial',
        status: 'TRIAL',
        subscription_status: 'trial',
        trial_start_date: trialStart,
        trial_end_date: trialEnd,
        expiryDate: trialEnd,
        lastVerificationTime: nowIso,
        verificationToken: `TRIAL_TOKEN_${newBiz.id}`,
        offlineGracePeriodEnds: graceEnd,
        gracePeriodExpiry: graceEnd,
        autoRenewEnabled: false,
        baseDuration: 7,
        bonusDays: 0,
        graceDays: 2
      };

      await db.subscriptions.put(trialSub);

      // Verify Trial Subscription in Dexie
      const verifiedSub = await db.subscriptions.get(newBiz.id);
      if (!verifiedSub) {
        throw new Error('Step 2 Failed: Free 7-day trial creation failed in local database.');
      }

      try {
        await subscriptionService.initializeTrial(newBiz.id);
      } catch (trialErr: any) {
        console.warn('[Trial Initialize Warning]', trialErr);
      }

      // STEP 3: CREATE LICENSE RECORD
      try {
        await fetch('/api/license/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: newBiz.id,
            subscriptionId: newBiz.id,
            status: 'ACTIVE'
          })
        });
      } catch (licErr: any) {
        console.warn('[License Create Warning]', licErr);
      }

      localStorage.setItem(`chhuta_license_${newBiz.id}`, JSON.stringify({
        id: newBiz.id,
        business_id: newBiz.id,
        subscription_id: newBiz.id,
        status: 'ACTIVE',
        created_at: nowIso
      }));

      // Bind business ID to active user profile and update in-memory session
      const activeUser = user || supabaseService.getCurrentUser();
      if (activeUser) {
        const updatedUser = {
          ...activeUser,
          businessId: newBiz.id,
          legal_consent: true,
          legal_consent_timestamp: nowIso,
        };
        setUser(updatedUser);
        supabaseService.setCurrentUser(updatedUser);
        localStorage.setItem('chhuta_session_user', JSON.stringify(updatedUser));
        await db.userProfiles.put({
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          fullName: updatedUser.fullName,
          phoneNumber: updatedUser.phoneNumber,
          businessId: updatedUser.businessId,
          createdAt: updatedUser.createdAt,
          legal_consent: true,
          legal_consent_timestamp: nowIso,
        });
      }

      setBusiness(newBiz);
      return newBiz;
    } catch (error) {
      console.error('Failed to register business:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBusiness = async (updatedConfig: Partial<BusinessConfig>) => {
    if (!business) return;
    setIsLoading(true);
    try {
      const mergedBiz = { ...business, ...updatedConfig };
      
      // Update locally in Dexie database
      await db.businessConfigs.put({
        id: mergedBiz.id,
        name: mergedBiz.name,
        type: mergedBiz.type,
        currency: mergedBiz.currency,
        timezone: mergedBiz.timezone,
        ownerName: mergedBiz.ownerName,
        address: mergedBiz.address,
        taxNumber: mergedBiz.taxNumber,
        logoUrl: mergedBiz.logoUrl,
        phone: mergedBiz.phone,
        email: mergedBiz.email,
        isConfigured: mergedBiz.isConfigured ? 1 : 0,
        legal_consent: mergedBiz.legal_consent,
        legal_consent_timestamp: mergedBiz.legal_consent_timestamp,
        privacy_policy_version: mergedBiz.privacy_policy_version,
        terms_version: mergedBiz.terms_version,
        refund_policy_version: mergedBiz.refund_policy_version,
      });

      setBusiness(mergedBiz);
    } catch (err) {
      console.error('Failed to update business configuration:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const changeStaffPassword = async (staffId: string, newPass: string) => {
    setIsLoading(true);
    try {
      await supabaseService.changeStaffPassword(staffId, newPass);
      const currentUser = supabaseService.getCurrentUser();
      if (currentUser && currentUser.id === staffId) {
        setUser({ ...currentUser });
      }
    } catch (error) {
      console.error('Password change action failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabaseService.logout();
      await billingRepository.clearAll();
      localStorage.removeItem('chhuta_session_user');
      localStorage.removeItem('chhuta_subscription_history');
      setUser(null);
      setBusiness(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = !!user;
  const isOwner = user?.role === UserRole.OWNER;
  const isManager = user?.role === UserRole.MANAGER;
  const isStaff = user?.role === UserRole.STAFF;
  const isWorker = user?.role === UserRole.WORKER;

  const checkRolePermission = (allowedRoles: UserRole[]) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        isLoading,
        login,
        loginWithGoogle,
        signup,
        staffLogin,
        registerBusiness,
        updateBusiness,
        changeStaffPassword,
        logout,
        isAuthenticated,
        isOwner,
        isManager,
        isStaff,
        isWorker,
        checkRolePermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
