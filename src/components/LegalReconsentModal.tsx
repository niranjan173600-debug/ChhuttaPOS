/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, FileText, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CURRENT_LEGAL_VERSIONS } from '../config/legalConfig';
import { LegalPolicyModal } from './LegalPolicyModal';
import { db } from '../database/db';

export const LegalReconsentModal: React.FC = () => {
  const { user, business, updateUser, updateBusiness } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePolicyModal, setActivePolicyModal] = useState<'privacy' | 'terms' | 'refund' | null>(null);

  if (!user) return null;

  // Check if current user or business has agreed to latest versions
  const hasOutdatedConsent = 
    !user.legal_consent ||
    user.privacy_policy_version !== CURRENT_LEGAL_VERSIONS.privacy_policy_version ||
    user.terms_version !== CURRENT_LEGAL_VERSIONS.terms_version ||
    user.refund_policy_version !== CURRENT_LEGAL_VERSIONS.refund_policy_version ||
    (business && (
      !business.legal_consent ||
      business.privacy_policy_version !== CURRENT_LEGAL_VERSIONS.privacy_policy_version ||
      business.terms_version !== CURRENT_LEGAL_VERSIONS.terms_version ||
      business.refund_policy_version !== CURRENT_LEGAL_VERSIONS.refund_policy_version
    ));

  if (!hasOutdatedConsent) return null;

  const handleAcceptUpdatedTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) {
      setValidationError('You must accept the Privacy Policy, Terms & Conditions, and Refund & Cancellation Policy to continue.');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const nowIso = new Date().toISOString();
      const legalData = {
        legal_consent: true,
        legal_consent_timestamp: nowIso,
        privacy_policy_version: CURRENT_LEGAL_VERSIONS.privacy_policy_version,
        terms_version: CURRENT_LEGAL_VERSIONS.terms_version,
        refund_policy_version: CURRENT_LEGAL_VERSIONS.refund_policy_version,
      };

      // 1. Update user profile state & DB
      await updateUser(legalData);

      // 2. Update business config if applicable
      if (business) {
        await updateBusiness(legalData);
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to update consent records.');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reconsent-title"
      >
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-6 space-y-5">
          
          <div className="text-center space-y-2">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 items-center justify-center mb-1">
              <ShieldAlert size={24} />
            </div>
            <h3 id="reconsent-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Updated Legal Policies
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              We have updated our Privacy Policy, Terms &amp; Conditions, and Refund &amp; Cancellation Policy. Please review and accept the latest versions to continue using ChhutaPOS safely.
            </p>
          </div>

          {validationError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <Lock size={16} className="shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          <form onSubmit={handleAcceptUpdatedTerms} className="space-y-4">
            {/* Legal Consent Checkbox */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="reconsent-legal-checkbox"
                  checked={accepted}
                  onChange={(e) => {
                    setAccepted(e.target.checked);
                    if (e.target.checked) setValidationError(null);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                />
                <label 
                  htmlFor="reconsent-legal-checkbox" 
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
              disabled={!accepted || isSubmitting}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
            >
              <CheckCircle2 size={16} />
              {isSubmitting ? 'Updating Acceptance...' : 'Accept & Continue'}
            </button>
          </form>

        </div>
      </div>

      <LegalPolicyModal 
        type={activePolicyModal} 
        onClose={() => setActivePolicyModal(null)} 
      />
    </>
  );
};
