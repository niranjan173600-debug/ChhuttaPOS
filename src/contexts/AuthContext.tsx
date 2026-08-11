/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, BusinessConfig, BusinessType } from '../types';
import { supabaseService } from '../services/supabase';
import { subscriptionService } from '../services/subscription';
import { billingRepository } from '../repositories/billing.repository';
import { db } from '../database/db';
import { CURRENT_LEGAL_VERSIONS } from '../config/legalConfig';
import { supabase, SUPABASE_CONFIG } from '../config/supabase';

interface AuthContextType {
  user: UserProfile | null;
  business: BusinessConfig | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<UserProfile>;
  signup: (email: string, pass: string, fullName: string, role: UserRole) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<void>;
  staffLogin: (businessId: string, email: string, pass: string) => Promise<UserProfile>;
  registerBusiness: (config: Omit<BusinessConfig, 'id' | 'isConfigured'>, explicitBusinessId?: string) => Promise<BusinessConfig>;
  updateUser: (updatedData: Partial<UserProfile>) => Promise<void>;
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
  const isInitializingRef = useRef(false);

  useEffect(() => {
    async function initSession() {
      if (isInitializingRef.current) {
        console.log('[AuthContext] Session init already in progress. Skipping duplicate.');
        return;
      }
      isInitializingRef.current = true;
      try {
        let currentUser: UserProfile | null = null;

        // CRITICAL RULE: The absolute source of truth for owner identity is a real Supabase Auth session
        if (supabase && SUPABASE_CONFIG.isConfigured) {
          const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
          if (sessionErr) {
            console.warn('[AuthContext] Supabase session lookup warning:', sessionErr.message);
          }

          if (session?.user) {
            const u = session.user;
            currentUser = {
              id: u.id,
              email: u.email || '',
              role: (u.user_metadata?.role as UserRole) || UserRole.OWNER,
              fullName: u.user_metadata?.fullName || u.user_metadata?.full_name || u.user_metadata?.name || (u.email ? u.email.split('@')[0].toUpperCase() : 'BUSINESS OWNER'),
              createdAt: u.created_at || new Date().toISOString(),
              businessId: u.user_metadata?.businessId,
            };
            supabaseService.setCurrentUser(currentUser);
          } else {
            // No active Supabase Auth session exists. Check if active user is a Staff account.
            const cachedUser = supabaseService.getCurrentUser();
            if (cachedUser && cachedUser.role === UserRole.STAFF) {
              currentUser = cachedUser;
            } else {
              // Non-staff cached profiles are NOT valid without an active Supabase session
              currentUser = null;
              supabaseService.setCurrentUser(null);
            }
          }
        } else {
          // Fallback if Supabase SDK is disabled
          currentUser = supabaseService.getCurrentUser();
        }

        if (currentUser) {
          try {
            const savedProfile = await db.userProfiles.get(currentUser.id);
            if (savedProfile) {
              currentUser = {
                ...currentUser,
                legal_consent: savedProfile.legal_consent ?? currentUser.legal_consent ?? true,
                legal_consent_timestamp: savedProfile.legal_consent_timestamp || currentUser.legal_consent_timestamp,
                privacy_policy_version: savedProfile.privacy_policy_version || currentUser.privacy_policy_version || CURRENT_LEGAL_VERSIONS.privacy_policy_version,
                terms_version: savedProfile.terms_version || currentUser.terms_version || CURRENT_LEGAL_VERSIONS.terms_version,
                refund_policy_version: savedProfile.refund_policy_version || currentUser.refund_policy_version || CURRENT_LEGAL_VERSIONS.refund_policy_version,
              };
            } else {
              currentUser = {
                ...currentUser,
                legal_consent: currentUser.legal_consent ?? true,
                privacy_policy_version: currentUser.privacy_policy_version || CURRENT_LEGAL_VERSIONS.privacy_policy_version,
                terms_version: currentUser.terms_version || CURRENT_LEGAL_VERSIONS.terms_version,
                refund_policy_version: currentUser.refund_policy_version || CURRENT_LEGAL_VERSIONS.refund_policy_version,
              };
            }
          } catch (pErr) {
            currentUser = {
              ...currentUser,
              legal_consent: currentUser.legal_consent ?? true,
              privacy_policy_version: currentUser.privacy_policy_version || CURRENT_LEGAL_VERSIONS.privacy_policy_version,
              terms_version: currentUser.terms_version || CURRENT_LEGAL_VERSIONS.terms_version,
              refund_policy_version: currentUser.refund_policy_version || CURRENT_LEGAL_VERSIONS.refund_policy_version,
            };
          }

          // Source of Truth: Retrieve Business, Subscription, License exclusively from Supabase / Cloud API
          let matchedBizConfig: BusinessConfig | null = null;
          let cloudSub: any = null;
          let cloudLic: any = null;

          if (currentUser.email || currentUser.businessId) {
            console.log(`[Supabase Auth] Restoring session & querying business for owner: ${currentUser.email || currentUser.businessId}`);
            try {
              const queryParams = new URLSearchParams();
              if (currentUser.email) queryParams.set('email', currentUser.email);
              if (currentUser.businessId) queryParams.set('businessId', currentUser.businessId);

              const ownerRes = await fetch(`/api/business/owner?${queryParams.toString()}`);
              if (ownerRes.ok) {
                const ownerData = await ownerRes.json();
                if (ownerData.exists && ownerData.business) {
                  console.log(`[Supabase Source of Truth] Existing business found: ${ownerData.business.id}`);
                  const remoteB = ownerData.business;
                  matchedBizConfig = {
                    id: remoteB.id,
                    name: remoteB.name,
                    type: (remoteB.type as BusinessType) || BusinessType.SERVICE,
                    currency: remoteB.currency || 'INR',
                    timezone: remoteB.timezone || 'Asia/Kolkata',
                    ownerName: remoteB.ownerName || currentUser.fullName,
                    address: remoteB.address,
                    taxNumber: remoteB.taxNumber,
                    logoUrl: remoteB.logoUrl,
                    phone: remoteB.phone,
                    email: remoteB.email || currentUser.email,
                    isConfigured: true,
                    legal_consent: true,
                    privacy_policy_version: CURRENT_LEGAL_VERSIONS.privacy_policy_version,
                    terms_version: CURRENT_LEGAL_VERSIONS.terms_version,
                    refund_policy_version: CURRENT_LEGAL_VERSIONS.refund_policy_version,
                  };
                  cloudSub = ownerData.subscription;
                  cloudLic = ownerData.license;
                } else {
                  console.log(`[Supabase Source of Truth] No business found for owner '${currentUser.email}'. Registration required.`);
                }
              }
            } catch (cloudErr) {
              console.warn('[Session Init Cloud Verification Warning]', cloudErr);
            }
          }

          const businessId = matchedBizConfig?.id || currentUser.businessId;

          if (businessId) {
            currentUser.businessId = businessId;
            supabaseService.setCurrentUser(currentUser);
          }

          setBusiness(matchedBizConfig);

          // ONLY AFTER Cloud Verification succeeds: Synchronize required records into Dexie local operational cache
          if (matchedBizConfig) {
            try {
              await db.businessConfigs.put({
                id: matchedBizConfig.id,
                name: matchedBizConfig.name,
                type: matchedBizConfig.type,
                currency: matchedBizConfig.currency,
                timezone: matchedBizConfig.timezone,
                ownerName: matchedBizConfig.ownerName,
                address: matchedBizConfig.address,
                taxNumber: matchedBizConfig.taxNumber,
                logoUrl: matchedBizConfig.logoUrl,
                phone: matchedBizConfig.phone,
                email: matchedBizConfig.email,
                isConfigured: 1,
                legal_consent: true,
                legal_consent_timestamp: new Date().toISOString(),
                privacy_policy_version: CURRENT_LEGAL_VERSIONS.privacy_policy_version,
                terms_version: CURRENT_LEGAL_VERSIONS.terms_version,
                refund_policy_version: CURRENT_LEGAL_VERSIONS.refund_policy_version,
              });
            } catch (dexBizErr) {
              console.warn('[Dexie Business Sync Warning]', dexBizErr);
            }

            if (cloudSub) {
              try {
                await billingRepository.saveSubscription(cloudSub);
              } catch (dexSubErr) {
                console.warn('[Dexie Subscription Sync Warning]', dexSubErr);
              }
            } else if (businessId) {
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
                console.warn('[Subscription Sync Warning]', subErr);
              }
            }

            if (cloudLic) {
              localStorage.setItem(`chhuta_license_${matchedBizConfig.id}`, JSON.stringify(cloudLic));
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
        } else {
          setUser(null);
          setBusiness(null);
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        isInitializingRef.current = false;
        setIsLoading(false);
      }
    }

    initSession();

    if (supabase && SUPABASE_CONFIG.isConfigured) {
      const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
          await initSession();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setBusiness(null);
          setIsLoading(false);
        }
      });
      return () => {
        authListener.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      // Step 1: Authenticate with Supabase Auth
      const profile = await supabaseService.loginWithEmail(email, pass);

      // Step 2: Query Cloud / Supabase API for owner's Business, Subscription, License (Source of Truth)
      let matchedBizConfig: BusinessConfig | null = null;
      let cloudSub: any = null;
      let cloudLic: any = null;

      if (profile.email || profile.businessId) {
        console.log(`[Supabase Auth - Login] Querying Supabase for owner: ${profile.email || profile.businessId}`);
        try {
          const queryParams = new URLSearchParams();
          if (profile.email) queryParams.set('email', profile.email);
          if (profile.businessId) queryParams.set('businessId', profile.businessId);

          const ownerRes = await fetch(`/api/business/owner?${queryParams.toString()}`);
          if (ownerRes.ok) {
            const ownerData = await ownerRes.json();
            if (ownerData.exists && ownerData.business) {
              console.log(`[Supabase Source of Truth - Login] Business found: ${ownerData.business.id}`);
              const remoteB = ownerData.business;
              matchedBizConfig = {
                id: remoteB.id,
                name: remoteB.name,
                type: (remoteB.type as BusinessType) || BusinessType.SERVICE,
                currency: remoteB.currency || 'INR',
                timezone: remoteB.timezone || 'Asia/Kolkata',
                ownerName: remoteB.ownerName || profile.fullName,
                address: remoteB.address,
                taxNumber: remoteB.taxNumber,
                logoUrl: remoteB.logoUrl,
                phone: remoteB.phone,
                email: remoteB.email || profile.email,
                isConfigured: true,
                legal_consent: true,
                privacy_policy_version: CURRENT_LEGAL_VERSIONS.privacy_policy_version,
                terms_version: CURRENT_LEGAL_VERSIONS.terms_version,
                refund_policy_version: CURRENT_LEGAL_VERSIONS.refund_policy_version,
              };
              cloudSub = ownerData.subscription;
              cloudLic = ownerData.license;
            }
          }
        } catch (cloudErr) {
          console.warn('[Login Cloud Verification Warning]', cloudErr);
        }
      }

      const businessId = matchedBizConfig?.id || profile.businessId;

      if (businessId) {
        profile.businessId = businessId;
        supabaseService.setCurrentUser(profile);
      }

      setBusiness(matchedBizConfig);

      // Step 3: Synchronize required records into Dexie local cache AFTER cloud verification succeeds
      if (matchedBizConfig) {
        try {
          await db.businessConfigs.put({
            id: matchedBizConfig.id,
            name: matchedBizConfig.name,
            type: matchedBizConfig.type,
            currency: matchedBizConfig.currency,
            timezone: matchedBizConfig.timezone,
            ownerName: matchedBizConfig.ownerName,
            address: matchedBizConfig.address,
            taxNumber: matchedBizConfig.taxNumber,
            logoUrl: matchedBizConfig.logoUrl,
            phone: matchedBizConfig.phone,
            email: matchedBizConfig.email,
            isConfigured: 1,
          });
        } catch (dexErr) {
          console.warn('[Dexie Business Sync Warning]', dexErr);
        }

        if (cloudSub) {
          try {
            await billingRepository.saveSubscription(cloudSub);
          } catch (subErr) {
            console.warn('[Dexie Subscription Sync Warning]', subErr);
          }
        } else if (businessId) {
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
            console.warn('[Login Subscription Sync Warning]', subErr);
          }
        }

        if (cloudLic) {
          localStorage.setItem(`chhuta_license_${matchedBizConfig.id}`, JSON.stringify(cloudLic));
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
      await supabaseService.loginWithGoogle();
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

  const signup = async (email: string, pass: string, fullName: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const profile = await supabaseService.signupWithEmail(email, pass, fullName, role);
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
      const ownerEmail = (config.email || user?.email || '').trim().toLowerCase();
      const requestBizId = explicitBusinessId || (config as any).id;

      // Step 1: Query Supabase / Cloud API directly (Source of Truth) for existing business ownership
      if (ownerEmail || requestBizId) {
        console.log(`[Supabase Auth - Register] Checking Supabase for existing business ownership (${ownerEmail || requestBizId})...`);
        try {
          const queryParams = new URLSearchParams();
          if (ownerEmail) queryParams.set('email', ownerEmail);
          if (requestBizId) queryParams.set('businessId', requestBizId);

          const ownerRes = await fetch(`/api/business/owner?${queryParams.toString()}`);
          if (ownerRes.ok) {
            const ownerData = await ownerRes.json();
            if (ownerData.exists && ownerData.business) {
              console.log(`[Supabase Source of Truth] Existing business found: ${ownerData.business.id}. Preserving record.`);
              const remoteB = ownerData.business;
              const existingBizConfig: BusinessConfig = {
                id: remoteB.id,
                name: remoteB.name,
                type: (remoteB.type as BusinessType) || BusinessType.SERVICE,
                currency: remoteB.currency || 'INR',
                timezone: remoteB.timezone || 'Asia/Kolkata',
                ownerName: remoteB.ownerName || config.ownerName,
                address: remoteB.address,
                taxNumber: remoteB.taxNumber,
                logoUrl: remoteB.logoUrl,
                phone: remoteB.phone,
                email: remoteB.email || ownerEmail,
                isConfigured: true,
              };

              // Synchronize to Dexie after cloud verification
              await db.businessConfigs.put({ ...existingBizConfig, isConfigured: 1 });
              if (ownerData.subscription) {
                await billingRepository.saveSubscription(ownerData.subscription);
              }
              if (ownerData.license) {
                localStorage.setItem(`chhuta_license_${remoteB.id}`, JSON.stringify(ownerData.license));
              }

              setBusiness(existingBizConfig);
              const activeUser = user || supabaseService.getCurrentUser();
              if (activeUser) {
                const updatedUser = { ...activeUser, businessId: remoteB.id };
                setUser(updatedUser);
                supabaseService.setCurrentUser(updatedUser);
              }
              return existingBizConfig;
            }
          }
        } catch (checkErr) {
          console.warn('[registerBusiness Owner Check Warning]', checkErr);
        }
      }

      console.log(`[Supabase Auth - Register] No existing business found in Supabase. Creating new business in Supabase.`);

      // Execute 3-step sequential onboarding transaction via server
      const transactionResp = await fetch('/api/onboarding/complete-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: explicitBusinessId || (config as any).id,
          ownerEmail,
          ownerName: config.ownerName,
          businessName: config.name,
          businessType: config.type,
          currency: config.currency,
          phone: config.phone,
          address: config.address,
          taxNumber: config.taxNumber,
          logoUrl: config.logoUrl
        })
      });

      const transactionData = await transactionResp.json();
      if (!transactionResp.ok || !transactionData.success) {
        throw new Error(transactionData.error || 'Server business registration transaction failed.');
      }

      const newId = transactionData.businessId;
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

      // Save Business in local Dexie
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

      // Save Trial Subscription in local Dexie
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

      // Save License in local storage
      localStorage.setItem(`chhuta_license_${newBiz.id}`, JSON.stringify({
        id: newBiz.id,
        business_id: newBiz.id,
        subscription_id: newBiz.id,
        status: 'ACTIVE',
        created_at: nowIso
      }));

      // STEP 4: CREATE OWNER STAFF ACCOUNT & CREDENTIALS
      const cleanOwnerName = newBiz.ownerName || 'Owner';
      const defaultUsername = (newBiz.email || user?.email || cleanOwnerName).split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'owner';
      const ownerUsername = (config as any).ownerUsername || defaultUsername;

      const charSet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      const getRandomBlock = (len: number) => Array.from({ length: len }, () => charSet[Math.floor(Math.random() * charSet.length)]).join('');
      const appPassword = (config as any).appPassword || `${getRandomBlock(4)}-${getRandomBlock(4)}-${getRandomBlock(4)}`;

      const ownerStaffAccount = {
        id: `ST-OWNER-${newBiz.id}`,
        name: cleanOwnerName,
        email: newBiz.email || user?.email || '',
        username: ownerUsername,
        role: UserRole.OWNER,
        businessId: newBiz.id,
        passwordHash: appPassword,
        status: 'ACTIVE',
        loginEnabled: true,
        createdAt: nowIso,
      };

      const existingStaffJson = localStorage.getItem('chhuta_staff_accounts') || localStorage.getItem('chhuta_mock_staff') || '[]';
      let existingStaff: any[] = [];
      try {
        existingStaff = JSON.parse(existingStaffJson);
      } catch (e) {
        existingStaff = [];
      }
      existingStaff = existingStaff.filter((s: any) => s.id !== ownerStaffAccount.id);
      existingStaff.unshift(ownerStaffAccount);
      localStorage.setItem('chhuta_staff_accounts', JSON.stringify(existingStaff));
      localStorage.setItem('chhuta_mock_staff', JSON.stringify(existingStaff));

      try {
        await db.workerProfiles.put({
          id: `WORKER-OWNER-${newBiz.id}`,
          businessId: newBiz.id,
          name: cleanOwnerName,
          role: UserRole.OWNER,
          status: 'ACTIVE',
          loginEnabled: true,
          staffAccountId: ownerStaffAccount.id,
          username: ownerUsername,
          email: newBiz.email || user?.email || '',
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      } catch (wErr) {
        console.warn('Worker profile put warning:', wErr);
      }

      const ownerCreds = {
        businessId: newBiz.id,
        ownerUsername,
        appPassword,
        primaryAuthMethod: (user?.email || newBiz.email) ? `Email / Google (${user?.email || newBiz.email})` : 'Google OAuth / Email',
        createdAt: nowIso,
      };
      localStorage.setItem(`chhuta_owner_creds_${newBiz.id}`, JSON.stringify(ownerCreds));

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
      return {
        ...newBiz,
        ownerUsername,
        appPassword,
      };
    } catch (error) {
      console.error('Failed to register business:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (updatedData: Partial<UserProfile>) => {
    if (!user) return;
    const mergedUser = { ...user, ...updatedData };
    setUser(mergedUser);
    supabaseService.setCurrentUser(mergedUser);
    localStorage.setItem('chhuta_session_user', JSON.stringify(mergedUser));
    await db.userProfiles.put({
      id: mergedUser.id,
      email: mergedUser.email,
      role: mergedUser.role,
      fullName: mergedUser.fullName,
      phoneNumber: mergedUser.phoneNumber,
      businessId: mergedUser.businessId,
      createdAt: mergedUser.createdAt,
      legal_consent: mergedUser.legal_consent,
      legal_consent_timestamp: mergedUser.legal_consent_timestamp,
      privacy_policy_version: mergedUser.privacy_policy_version,
      terms_version: mergedUser.terms_version,
      refund_policy_version: mergedUser.refund_policy_version,
    });
  };

  const updateBusiness = async (updatedConfig: Partial<BusinessConfig>) => {
    if (!business) return;
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
        updateUser,
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
