/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PWAPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if user is on iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // If PWA is already installed or running as standalone, don't show
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show after a short period so it's not obtrusive on load
      const timer = setTimeout(() => {
        const wasDismissed = localStorage.getItem('chhuta_pwa_dismissed');
        if (!wasDismissed) {
          setIsVisible(true);
        }
      }, 5000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS prompt fallback (iOS safari does not support beforeinstallprompt)
    if (isIosDevice) {
      const timer = setTimeout(() => {
        const wasDismissed = localStorage.getItem('chhuta_pwa_dismissed');
        if (!wasDismissed) {
          setIsVisible(true);
        }
      }, 6000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA installation user choice: ${outcome}`);

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('chhuta_pwa_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-sm z-40">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 50 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-150 dark:border-gray-700 p-5 pr-10 relative overflow-hidden"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            id="pwa-dismiss-btn"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Download size={22} />
            </div>
            
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Install ChhuttaPOS
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Add to your home screen to launch in full-screen mode, completely offline, even without network!
              </p>

              {isIOS ? (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/60 p-2 rounded-lg leading-tight">
                  <Share size={12} className="text-blue-500 flex-shrink-0" />
                  <span>Tap <strong>Share</strong> then <strong>Add to Home Screen</strong> on Safari.</span>
                </div>
              ) : (
                <button
                  onClick={handleInstallClick}
                  disabled={!deferredPrompt}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
                  id="pwa-install-action"
                >
                  <Download size={12} />
                  Install App
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
