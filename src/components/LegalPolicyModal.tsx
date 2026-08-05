/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X, ShieldCheck, ExternalLink, FileText } from 'lucide-react';
import { LEGAL_DOCUMENTS } from '../config/legalConfig';

interface LegalPolicyModalProps {
  type: 'privacy' | 'terms' | 'refund' | null;
  onClose: () => void;
}

export const LegalPolicyModal: React.FC<LegalPolicyModalProps> = ({ type, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!type) return null;

  const doc = LEGAL_DOCUMENTS[type];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <FileText size={20} />
            </div>
            <div>
              <h3 id="legal-modal-title" className="text-base font-bold text-slate-800 dark:text-slate-100">
                {doc.title}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Version {doc.version} &bull; Last Updated: {doc.lastUpdated}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {doc.sections.map((section, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {section.heading}
              </h4>
              <p className="text-slate-600 dark:text-slate-400">
                {section.content}
              </p>
            </div>
          ))}

          <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between gap-3 text-[11px] text-indigo-700 dark:text-indigo-300">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>For full legal inquiries, contact legal@chhutapos.com</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close &amp; Return
          </button>
        </div>
      </div>
    </div>
  );
};
