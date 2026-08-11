/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Copy,
  Check,
  Download,
  Printer,
  AlertTriangle,
  ArrowRight,
  Building2,
  User,
  Key,
  Lock
} from 'lucide-react';

interface CredentialSummaryModalProps {
  isOpen: boolean;
  businessId: string;
  ownerUsername: string;
  appPassword: string;
  businessName?: string;
  authMethod?: string;
  onConfirm: () => void;
}

export const CredentialSummaryModal: React.FC<CredentialSummaryModalProps> = ({
  isOpen,
  businessId,
  ownerUsername,
  appPassword,
  businessName = 'Business Workspace',
  authMethod = 'Google OAuth / Email',
  onConfirm,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSavedConfirmed, setIsSavedConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = () => {
    const fullText = `=== ChhuttaPOS Business Workspace Credentials ===
Business Name: ${businessName}
Business ID: ${businessId}
Owner Username: ${ownerUsername}
App Password: ${appPassword}
Primary Auth Method: ${authMethod}
Generated At: ${new Date().toLocaleString()}
=================================================
Keep these credentials safe! Required for Business / Staff login.`;

    navigator.clipboard.writeText(fullText);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownload = () => {
    const textContent = `ChhuttaPOS Business Workspace Credentials
--------------------------------------------------
Business Name:       ${businessName}
Business ID:         ${businessId}
Owner Username:      ${ownerUsername}
App Password:        ${appPassword}
Primary Auth:        ${authMethod}
Date Generated:      ${new Date().toLocaleString()}
--------------------------------------------------
IMPORTANT SECURITY NOTICE:
These credentials allow access to your ChhuttaPOS terminal console.
Save this file in a secure location.`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ChhuttaPOS_Credentials_${businessId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-6 relative my-8 print:shadow-none print:border-none print:p-0">

        {/* Header Badge */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-1">
            <ShieldCheck size={26} />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            One-Time Registration Summary
          </span>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Workspace Security Credentials
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Business registration succeeded! Below are your workspace access credentials.
          </p>
        </div>

        {/* Credentials Card Box */}
        <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">

          {/* Business ID */}
          <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                <Building2 size={12} />
                <span>Business ID</span>
              </div>
              <p className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {businessId}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(businessId, 'biz')}
              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Copy Business ID"
            >
              {copiedField === 'biz' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>

          {/* Owner Username */}
          <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                <User size={12} />
                <span>Owner Username</span>
              </div>
              <p className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                {ownerUsername}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(ownerUsername, 'user')}
              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Copy Username"
            >
              {copiedField === 'user' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>

          {/* App Password */}
          <div className="flex items-center justify-between p-2.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                <Key size={12} />
                <span>Secure App Password</span>
              </div>
              <p className="text-sm font-extrabold font-mono text-amber-900 dark:text-amber-200 tracking-widest">
                {appPassword}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(appPassword, 'pass')}
              className="p-2 text-amber-700 dark:text-amber-400 hover:text-amber-900 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              title="Copy App Password"
            >
              {copiedField === 'pass' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>

          {/* Primary Auth Method */}
          <div className="px-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Primary Auth Method:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{authMethod}</span>
          </div>
        </div>

        {/* Quick Utility Actions */}
        <div className="grid grid-cols-3 gap-2 print:hidden">
          <button
            type="button"
            onClick={handleCopyAll}
            className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedField === 'all' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copiedField === 'all' ? 'Copied All' : 'Copy All'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer size={14} />
            <span>Print</span>
          </button>
        </div>

        {/* Security Warning Callout */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-300 font-medium">
            <strong>Important Security Notice:</strong> These credentials are required for Business Login. Please save them securely. They will not be shown again.
          </p>
        </div>

        {/* Confirmation Checkbox */}
        <div className="pt-1 print:hidden">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isSavedConfirmed}
              onChange={(e) => setIsSavedConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
              id="confirm-saved-credentials-checkbox"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
              I have saved these credentials in a secure location and understand they are required for terminal access.
            </span>
          </label>
        </div>

        {/* Final Confirmation Button */}
        <div className="print:hidden">
          <button
            type="button"
            disabled={!isSavedConfirmed}
            onClick={onConfirm}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/10 cursor-pointer"
            id="launch-workspace-after-summary-btn"
          >
            <span>Confirm &amp; Launch POS Console</span>
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
};
