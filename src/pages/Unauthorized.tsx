/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-6">
        <ShieldAlert size={32} />
      </div>

      <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-2 text-slate-900 dark:text-white">
        Access Denied
      </h1>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-6 leading-relaxed">
        You do not have permission to access this page.
      </p>

      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </button>
    </div>
  );
};
