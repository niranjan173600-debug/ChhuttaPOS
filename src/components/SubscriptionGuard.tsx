/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionGuardProps {
  children: React.ReactElement;
  fallback?: React.ReactNode;
  /**
   * Action behaviour if expired: 'disable', 'hide', or 'overlay'
   */
  action?: 'disable' | 'hide' | 'overlay';
  message?: string;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  children,
  fallback,
  action = 'disable',
  message = 'Subscription Expired. Please renew to access this action.',
}) => {
  const { isExpired } = useSubscription();
  const navigate = useNavigate();

  if (!isExpired) {
    return children;
  }

  if (action === 'hide') {
    return fallback ? <>{fallback}</> : null;
  }

  if (action === 'overlay') {
    return (
      <div className="relative group">
        <div className="absolute inset-0 bg-gray-100/30 dark:bg-gray-950/30 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-10">
          <button
            onClick={() => navigate('/subscription')}
            className="p-1.5 rounded-full bg-white dark:bg-gray-800 text-red-500 shadow-md border border-gray-100 dark:border-gray-700 hover:scale-105 transition-transform"
            title={message}
          >
            <Lock size={14} />
          </button>
        </div>
        <div className="opacity-50 pointer-events-none select-none">
          {children}
        </div>
      </div>
    );
  }

  // Default: Disable child button/element
  const childElement = children as React.ReactElement<any>;
  return React.cloneElement(childElement, {
    disabled: true,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      alert(message);
      navigate('/subscription');
    },
    className: `${childElement.props.className || ''} opacity-50 cursor-not-allowed relative pointer-events-auto`,
    title: message,
  });
};
