/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, BusinessType } from '../types';
import { 
  Mail, 
  User, 
  ShieldAlert, 
  CheckCircle, 
  Briefcase, 
  Lock, 
  Building2, 
  Phone, 
  MapPin, 
  FileText, 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Chrome
} from 'lucide-react';
import { LegalPolicyModal } from '../components/LegalPolicyModal';
import { CredentialSummaryModal } from '../components/CredentialSummaryModal';

export const Signup: React.FC = () => {
  const { signup, registerBusiness, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  // Stage 1 vs Stage 2 state
  const [stage, setStage] = useState<1 | 2>(1);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Stage 1 Inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Credential summary modal state
  const [createdCreds, setCreatedCreds] = useState<{
    businessId: string;
    ownerUsername: string;
    appPassword: string;
    businessName: string;
  } | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.OWNER);
  const [legalConsent, setLegalConsent] = useState(false);
  const [activePolicyModal, setActivePolicyModal] = useState<'privacy' | 'terms' | 'refund' | null>(null);

  // Stage 2 Inputs (Business Details)
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>(BusinessType.SERVICE);
  const [currency, setCurrency] = useState('INR');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Execution Progress State
  const [activeStep, setActiveStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Create Account
  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!legalConsent) {
      setError('You must accept the Privacy Policy, Terms & Conditions, and Refund Policy to continue.');
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(email, password, fullName, role);
      setOwnerName(fullName);
      setStage(2);
    } catch (err: any) {
      setError(err?.message || 'Account creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Complete Transactional Registration
  const handleBusinessRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!businessName.trim()) {
      setError('Business Name is required.');
      return;
    }

    setIsSubmitting(true);
    setActiveStep(1);

    try {
      setActiveStep(1);
      setActiveStep(2);
      setActiveStep(3);

      // Execute single, idempotent registration flow via registerBusiness
      const regRes: any = await registerBusiness({
        name: businessName,
        type: businessType,
        currency,
        timezone: 'Asia/Kolkata',
        ownerName: ownerName || fullName,
        phone,
        address,
        taxNumber,
        logoUrl,
        email
      });

      setActiveStep(4);

      setCreatedCreds({
        businessId: regRes.id,
        ownerUsername: regRes.ownerUsername || 'owner',
        appPassword: regRes.appPassword || 'X9K4-PQ7M-L2TR',
        businessName: businessName,
      });
    } catch (err: any) {
      setError(err?.message || 'Business onboarding failed.');
      setActiveStep(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-xl bg-indigo-600 items-center justify-center text-white font-bold text-2xl shadow-md shadow-indigo-500/10 mb-3">
            C
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            {stage === 1 ? 'Create Your POS Account' : 'Configure Business Workspace'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {stage === 1 
              ? 'Step 1 of 2: Create account credentials' 
              : 'Step 2 of 2: Setup store details & activate 7-day free trial'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STAGE 1: ACCOUNT CREATION FORM */}
        {stage === 1 && (
          <div className="space-y-4">
            {/* Google OAuth Option */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={async () => {
                  setError(null);
                  setIsGoogleLoading(true);
                  try {
                    await loginWithGoogle();
                  } catch (err: any) {
                    setError(err?.message || 'Google registration failed.');
                    setIsGoogleLoading(false);
                  }
                }}
                disabled={isGoogleLoading}
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                id="signup-google-btn"
              >
                <Chrome size={16} className="text-red-500" />
                {isGoogleLoading ? 'Connecting Google Account...' : 'Continue with Google'}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
                <span className="flex-shrink mx-4 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">or email registration</span>
                <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
              </div>
            </div>

            <form onSubmit={handleAccountCreation} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  id="signup-fullname-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@mystore.com"
                  className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  id="signup-email-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    id="signup-password-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    id="signup-confirmpassword-input"
                  />
                </div>
              </div>
            </div>

            {/* Legal Consent Checkbox Section */}
            <div className="pt-2">
              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                <input
                  type="checkbox"
                  id="signup-legal-consent-checkbox"
                  checked={legalConsent}
                  onChange={(e) => {
                    setLegalConsent(e.target.checked);
                    if (e.target.checked) setError(null);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                />
                <label 
                  htmlFor="signup-legal-consent-checkbox"
                  className="text-[11px] leading-snug text-slate-600 dark:text-slate-300 select-none"
                >
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setActivePolicyModal('privacy');
                    }}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold underline hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  ,{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setActivePolicyModal('terms');
                    }}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold underline hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Terms &amp; Conditions
                  </button>
                  , and{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setActivePolicyModal('refund');
                    }}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold underline hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Refund &amp; Cancellation Policy
                  </button>
                  .
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !legalConsent}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/10"
              id="signup-continue-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Continue to Store Details
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Already have a registered account?{' '}
                <Link
                  to="/login"
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Sign In Securely
                </Link>
              </p>
            </div>
          </form>
        </div>
        )}

        {/* STAGE 2: BUSINESS DETAILS & TRIAL ACTIVATION */}
        {stage === 2 && (
          <form onSubmit={handleBusinessRegistration} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Business / Store Name *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Building2 size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Supermarket"
                  className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  id="wizard-businessname-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Owner Name"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white outline-none"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Business Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: BusinessType.SERVICE, label: 'Service' },
                  { key: BusinessType.PRODUCT, label: 'Retail Product' },
                  { key: BusinessType.HYBRID, label: 'Hybrid Store' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setBusinessType(item.key)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      businessType === item.key
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Tax / GSTIN Number
                </label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value.toUpperCase())}
                  placeholder="27AABCU9603R1ZM"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white outline-none uppercase font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Store Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Market Street, Commercial Hub"
                className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white outline-none"
              />
            </div>

            {/* Trial Info Banner */}
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">7-Day Free Trial Included</h4>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400">Full feature access. No payment card required.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-1 rounded-md uppercase">FREE</span>
            </div>

            {/* Transactional Progress Status */}
            {activeStep > 0 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  {activeStep >= 1 ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Loader2 size={16} className="animate-spin text-indigo-500" />}
                  <span className={activeStep >= 1 ? 'text-emerald-600 dark:text-emerald-400' : ''}>1. Creating Business Record...</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  {activeStep >= 2 ? <CheckCircle2 size={16} className="text-emerald-500" /> : activeStep === 1 ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <span className="w-4" />}
                  <span className={activeStep >= 2 ? 'text-emerald-600 dark:text-emerald-400' : ''}>2. Initializing 7-Day Free Trial...</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  {activeStep >= 3 ? <CheckCircle2 size={16} className="text-emerald-500" /> : activeStep === 2 ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <span className="w-4" />}
                  <span className={activeStep >= 3 ? 'text-emerald-600 dark:text-emerald-400' : ''}>3. Generating License &amp; Launching Workspace...</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-500/10"
              id="wizard-complete-btn"
            >
              {isSubmitting ? 'Executing Onboarding Transaction...' : 'Activate Free Trial & Launch Workspace'}
            </button>
          </form>
        )}

      </div>

      <LegalPolicyModal 
        type={activePolicyModal} 
        onClose={() => setActivePolicyModal(null)} 
      />

      <CredentialSummaryModal
        isOpen={!!createdCreds}
        businessId={createdCreds?.businessId || ''}
        ownerUsername={createdCreds?.ownerUsername || ''}
        appPassword={createdCreds?.appPassword || ''}
        businessName={createdCreds?.businessName || businessName}
        authMethod={user?.email ? `Email / Google (${user.email})` : email ? `Email (${email})` : 'Google OAuth / Email'}
        onConfirm={() => {
          setCreatedCreds(null);
          navigate('/');
        }}
      />
    </div>
  );
};
