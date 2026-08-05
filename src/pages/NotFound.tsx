/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center mb-6">
        <Compass size={32} />
      </div>

      <h1 className="text-xl font-bold tracking-tight mb-2">
        Page Not Found
      </h1>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-6 leading-relaxed">
        The route you are trying to visit does not exist or has been relocated to another workspace panel.
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
