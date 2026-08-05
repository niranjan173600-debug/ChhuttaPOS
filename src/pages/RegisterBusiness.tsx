/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BusinessType } from '../types';
import { 
  Building2, 
  User, 
  Briefcase, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LegalPolicyModal } from '../components/LegalPolicyModal';

export const RegisterBusiness: React.FC = () => {
  const { registerBusiness, user } = useAuth();
  const navigate = useNavigate();

  // Wizard Steps: 0 = Core Details, 1 = Location & Contacts, 2 = Brand & Finalize
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState(user?.fullName || '');
  const [businessType, setBusinessType] = useState<BusinessType>(BusinessType.SERVICE);
  
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [gst, setGst] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Legal Consent States
  const [legalConsent, setLegalConsent] = useState(false);
  const [activePolicyModal, setActivePolicyModal] = useState<'privacy' | 'terms' | 'refund' | null>(null);

  const [previewId] = useState(() => {
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `CP-${random}`;
  });

  const handleNext = () => {
    if (step === 0) {
      if (!businessName.trim() || !ownerName.trim()) {
        setError('Please fill in both Business Name and Owner Name.');
        return;
      }
    }
    setError(null);
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !ownerName.trim()) {
      setError('Required fields are missing.');
      setStep(0);
      return;
    }

    if (!legalConsent) {
      setError('You must accept the Privacy Policy, Terms & Conditions, and Refund & Cancellation Policy to continue.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await registerBusiness({
        name: businessName,
        type: businessType,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        ownerName,
        address: address || undefined,
        taxNumber: gst || undefined,
        logoUrl: logoUrl || undefined,
        phone: phone || undefined,
        email: email || undefined,
      });

      // Show success step first, then navigate
      setStep(3);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to register business workspace.');
      setIsSubmitting(false);
    }
  };

  const businessTypes = [
    { 
      type: BusinessType.SERVICE, 
      title: 'Service Business', 
      desc: 'Salons, Car washes, Repair, tailoring, medical consultants', 
      color: 'border-indigo-500 text-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20' 
    },
    { 
      type: BusinessType.PRODUCT, 
      title: 'Product Retail', 
      desc: 'Grocery shops, wholesales, hardware stores, pharmacies', 
      color: 'border-emerald-500 text-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20' 
    },
    { 
      type: BusinessType.HYBRID, 
      title: 'Mixed / Hybrid', 
      desc: 'Restaurants with delivery, medical shops, product-service mixed outlets', 
      color: 'border-amber-500 text-amber-600 bg-amber-50/40 dark:bg-amber-950/20' 
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        
        {/* Dynamic Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-lg font-bold uppercase tracking-widest">
              Setup Wizard
            </span>
            <h2 className="text-xl font-bold tracking-tight mt-2 text-slate-800 dark:text-slate-100">
              {step === 3 ? 'Workspace Created!' : 'Register Your Business'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {step === 0 && 'Tell us about your trade core'}
              {step === 1 && 'Specify contact, billing and location details'}
              {step === 2 && 'Upload logo and preview your business card'}
              {step === 3 && 'Your cloud and offline registers are in sync.'}
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">
              ID: <span className="text-indigo-600 dark:text-indigo-400 font-mono">{previewId}</span>
            </span>
          </div>
        </div>

        {/* Wizard progress line */}
        {step < 3 && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 flex">
            <div 
              className="bg-indigo-600 h-full transition-all duration-300" 
              style={{ width: `${((step + 1) / 3) * 100}%` }}
            />
          </div>
        )}

        {error && (
          <div className="m-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
            <ShieldCheck size={16} className="shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Business Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Business Name <span className="text-red-500">*</span>
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
                      placeholder="e.g. Acme Supermart or Apex Barbershop"
                      className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Owner Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Owner Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Rohan Sharma"
                      className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Business Type Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Core Business Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {businessTypes.map((t) => (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => setBusinessType(t.type)}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                          businessType === t.type
                            ? `border-indigo-600 ring-2 ring-indigo-500/10 dark:bg-indigo-950/30`
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${
                          businessType === t.type ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          <Briefcase size={16} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{t.title}</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">{t.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                      Phone Number (Optional)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                        <Phone size={16} />
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                      Business Email (Optional)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                        <Mail size={16} />
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contact@store.com"
                        className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* GST Tax Number */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    GSTIN / Tax Registration (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                      <FileText size={16} />
                    </span>
                    <input
                      type="text"
                      value={gst}
                      onChange={(e) => setGst(e.target.value.toUpperCase())}
                      placeholder="e.g. 07AAAAA1111A1Z1"
                      className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all uppercase"
                    />
                  </div>
                </div>

                {/* Business Address */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Store Address (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute top-3.5 left-3.5 text-slate-400 pointer-events-none">
                      <MapPin size={16} />
                    </span>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Shop No. 4, Ground Floor, Sector 15, New Delhi"
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Logo URL */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Business Logo URL (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                      <Upload size={16} />
                    </span>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Real-time Business Identity preview card */}
                <div className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-4">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    <Sparkles size={12} className="animate-spin" />
                    <span>Digital License ID Preview</span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                        {businessName || 'Your Business Name'}
                      </h4>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        Category: <strong className="text-slate-600 dark:text-slate-400 capitalize">{businessType.toLowerCase()} Setup</strong>
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Owner: <span className="text-slate-600 dark:text-slate-400">{ownerName || 'Alex'}</span>
                      </p>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center font-bold text-lg text-slate-600 dark:text-slate-300">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        (businessName || 'C').charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-indigo-100/60 dark:border-indigo-900/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase tracking-tight">Assigned Business ID</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm uppercase">{previewId}</strong>
                    </div>
                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      Commercial Sandbox
                    </span>
                  </div>
                </div>

                {/* Legal Consent Checkbox Section for Step 2 */}
                <div className="pt-2">
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                    <input
                      type="checkbox"
                      id="register-business-legal-checkbox"
                      checked={legalConsent}
                      onChange={(e) => {
                        setLegalConsent(e.target.checked);
                        if (e.target.checked) setError(null);
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />
                    <label 
                      htmlFor="register-business-legal-checkbox"
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
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-4"
              >
                <div className="inline-flex w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 items-center justify-center rounded-2xl mb-2">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Workspace Configured!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Your business <strong className="text-slate-800 dark:text-white">{businessName}</strong> with unique code <strong>{previewId}</strong> has been successfully synchronized and registered.
                </p>
                <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">
                  Redirecting to your active console dashboard...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Wizard Footer Actions */}
        {step < 3 && (
          <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-4">
            <button
              onClick={handleBack}
              disabled={step === 0 || isSubmitting}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                step === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <ArrowLeft size={14} />
              Back
            </button>

            {step < 2 ? (
              <button
                onClick={handleNext}
                disabled={step === 0 && (!businessName.trim() || !ownerName.trim())}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !businessName.trim() || !ownerName.trim() || !legalConsent}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Syncing registers...' : 'Finish Registration'}
                <CheckCircle2 size={14} />
              </button>
            )}
          </div>
        )}

      </div>

      <LegalPolicyModal 
        type={activePolicyModal} 
        onClose={() => setActivePolicyModal(null)} 
      />
    </div>
  );
};
