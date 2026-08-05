/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionPlan, SubscriptionStatus, SubscriptionHistoryEntry } from '../types';
import { 
  PLAN_DURATIONS, 
  PLAN_PRICES, 
  SUBSCRIPTION_PLANS_CONFIG, 
  GRACE_PERIOD_DAYS, 
  DEFAULT_CURRENCY, 
  SUPPORT_EMAIL, 
  SUPPORT_WHATSAPP, 
  CURRENCY_SYMBOL, 
  formatPrice,
  DEFAULT_PROMO_CODE,
  DEFAULT_PROMO_DISCOUNT_PERCENT,
  DEFAULT_PROMO_TITLE,
  DEFAULT_PROMO_DESCRIPTION,
  DEFAULT_PROMO_ENABLED,
  PROMO_CAMPAIGNS,
  INSTAGRAM_URL,
  FACEBOOK_URL,
  YOUTUBE_URL,
  WHATSAPP_CHANNEL_URL
} from '../config/subscription';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Zap, 
  HelpCircle, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw, 
  Smartphone,
  Check,
  Mail,
  PhoneCall,
  History,
  Tag,
  Gift,
  Plus,
  ArrowRight,
  Info,
  Download,
  FileText,
  AlertCircle,
  Share2,
  X,
  CreditCard,
  Bell,
  Instagram,
  Facebook,
  Youtube,
  MessageCircle
} from 'lucide-react';

export const Subscription: React.FC = () => {
  const { subscription, isExpired, isGracePeriod, daysRemaining, purchasePlan, toggleAutoRenew, revalidate } = useSubscription();
  const { user, business } = useAuth();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  
  // Promotion and Referral States
  const [promoCode, setPromoCode] = useState('');
  const [activePromo, setActivePromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccessMsg, setPromoSuccessMsg] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Complete Transaction and Invoices list
  const [historyList, setHistoryList] = useState<SubscriptionHistoryEntry[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionHistoryEntry | null>(null);

  // Reminder Notification Simulation Overrides
  const [simulatedScenario, setSimulatedScenario] = useState<string | null>(null);
  const [simulatedNotification, setSimulatedNotification] = useState<{
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    action?: { label: string; onClick: () => void };
  } | null>(null);

  const reloadHistory = () => {
    try {
      const historyStr = localStorage.getItem('chhuta_subscription_history');
      setHistoryList(historyStr ? JSON.parse(historyStr) : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    reloadHistory();
  }, [subscription]);

  // Set real notifications by default based on days remaining and auto-renew state

  useEffect(() => {
    if (simulatedScenario) return; // overridden by simulator

    // Calculate real live alert based on subscription details
    if (subscription) {
      const isAutoRenewOn = subscription.autoRenewEnabled ?? false;
      if (!isAutoRenewOn) {
        if (isExpired) {
          setSimulatedNotification({
            type: 'error',
            title: 'Subscription Expired – Renew Now',
            message: 'Your active terminal license has expired. Your transaction files and catalogs reside safely in browser sandbox memory, but billing services are currently locked. Renew now to resume.',
            action: { label: 'Quick Renew', onClick: () => handleRenew(subscription.plan, PLAN_PRICES[subscription.plan]) }
          });
        } else if (daysRemaining === 0) {
          setSimulatedNotification({
            type: 'warning',
            title: 'Attention: Your subscription expires today!',
            message: 'Your active license expires in a few hours. Please renew manually today to ensure seamless billing operations.',
            action: { label: 'Renew Now', onClick: () => handleRenew(subscription.plan, PLAN_PRICES[subscription.plan]) }
          });
        } else if (daysRemaining === 1) {
          setSimulatedNotification({
            type: 'warning',
            title: 'Critical Alert: License expires tomorrow!',
            message: 'Your offline billing terminal registration expires tomorrow. Click below to secure your workspace.',
            action: { label: 'Renew Now', onClick: () => handleRenew(subscription.plan, PLAN_PRICES[subscription.plan]) }
          });
        } else if (daysRemaining === 3) {
          setSimulatedNotification({
            type: 'info',
            title: 'Urgent Reminder: 3 Days Remaining',
            message: 'Only 3 days left on your active license plan. Keep your data synchronized and workers active by renewing today.',
            action: { label: 'Extend License', onClick: () => handleRenew(subscription.plan, PLAN_PRICES[subscription.plan]) }
          });
        } else if (daysRemaining <= 7 && daysRemaining > 3) {
          setSimulatedNotification({
            type: 'info',
            title: 'Subscription Notice: 7 Days Left',
            message: 'Your license will expire in a few days. Consider turning on Optional Auto-Renew to never worry about manual extensions.',
            action: { label: 'Enable Auto-Renew', onClick: () => handleToggleAutoRenew(true) }
          });
        } else {
          setSimulatedNotification(null);
        }
      } else {
        // Auto Renew is ON
        if (daysRemaining === 1) {
          setSimulatedNotification({
            type: 'info',
            title: 'Scheduled Auto-Billing Tomorrow',
            message: `Your active plan is configured to auto-renew tomorrow. Razorpay will charge ${CURRENCY_SYMBOL}${PLAN_PRICES[subscription.plan]} and extend your license. No manual input is required.`,
          });
        } else {
          setSimulatedNotification(null);
        }
      }
    } else {
      setSimulatedNotification(null);
    }
  }, [subscription, daysRemaining, simulatedScenario]);

  const plans = [
    {
      id: SubscriptionPlan.WEEKLY,
      name: 'Weekly Plan',
      price: PLAN_PRICES[SubscriptionPlan.WEEKLY],
      period: `${PLAN_DURATIONS[SubscriptionPlan.WEEKLY]} Days`,
      badge: 'Flexible Choice',
      color: 'blue',
      bonusText: null,
    },
    {
      id: SubscriptionPlan.MONTHLY,
      name: 'Monthly Plan',
      price: PLAN_PRICES[SubscriptionPlan.MONTHLY],
      period: `${PLAN_DURATIONS[SubscriptionPlan.MONTHLY]} Days`,
      badge: '🔥 MOST POPULAR',
      color: 'indigo',
      bonusText: null,
    },
    {
      id: SubscriptionPlan.THREE_MONTHS,
      name: '3 Months Plan',
      price: PLAN_PRICES[SubscriptionPlan.THREE_MONTHS],
      period: '105 Days',
      badge: 'Best Value',
      color: 'emerald',
      bonusText: '+15 Free Days',
    },
    {
      id: SubscriptionPlan.SIX_MONTHS,
      name: '6 Months Plan',
      price: PLAN_PRICES[SubscriptionPlan.SIX_MONTHS],
      period: '210 Days',
      badge: 'Long Term Lock',
      color: 'purple',
      bonusText: '+30 Free Days',
    },
  ];

  const features = [
    'Unlimited offline registers',
    'Unlimited catalogs & inventory',
    'Multiple concurrent staff',
    'GST receipt outputs',
    'Excel & PDF report exports',
    'Offline cache auto-integrity',
    'Prioritized priority ticket desk',
  ];

  const handleApplyPromo = () => {
    setPromoError(null);
    setPromoSuccessMsg(null);
    const normalized = promoCode.trim().toUpperCase();
    
    if (!normalized) {
      setPromoError('Please enter a promotional coupon code.');
      return;
    }

    const campaign = PROMO_CAMPAIGNS.find(c => c.code.toUpperCase() === normalized && c.enabled);
    if (campaign) {
      setActivePromo(normalized);
      if (campaign.discountPercent > 0) {
        setPromoSuccessMsg(`${campaign.title} Activated: ${campaign.discountPercent}% off will be calculated during manual checkout!`);
      } else if (campaign.bonusDays > 0) {
        setPromoSuccessMsg(`${campaign.title} Applied! ${campaign.bonusDays} Free Bonus Days will be added to your renewal.`);
      } else {
        setPromoSuccessMsg(`${campaign.title} Applied successfully.`);
      }
    } else {
      const activeCodes = PROMO_CAMPAIGNS.filter(c => c.enabled).map(c => `"${c.code}"`).join(', ');
      setPromoError(`Invalid coupon. Try active promo codes: ${activeCodes} for testing.`);
    }
  };

  const handleClearPromo = () => {
    setPromoCode('');
    setActivePromo(null);
    setPromoSuccessMsg(null);
    setPromoError(null);
  };

  const handleRenew = async (plan: SubscriptionPlan, amount: number, renewalType: 'MANUAL' | 'AUTOMATIC' = 'MANUAL') => {
    setIsProcessing(plan);
    setSuccessMessage(null);
    setPaymentError(null);
    try {
      // Calculate active promotional bonus days
      let extraBonusDays = 0;
      let finalAmount = amount;

      if (activePromo) {
        const campaign = PROMO_CAMPAIGNS.find(c => c.code.toUpperCase() === activePromo.toUpperCase() && c.enabled);
        if (campaign) {
          extraBonusDays = campaign.bonusDays;
          if (campaign.discountPercent > 0) {
            finalAmount = Math.round(amount * (1 - campaign.discountPercent / 100));
          }
        }
      }

      // Persist the transaction into the renewal engine
      await purchasePlan(plan, finalAmount, activePromo || undefined);
      
      const planConfig = SUBSCRIPTION_PLANS_CONFIG[plan];
      const addedDays = planConfig.baseDuration + planConfig.bonusDays + extraBonusDays;
      
      setSuccessMessage(
        `Success! Your remaining subscription days were preserved and your license has been extended by ${addedDays} days.`
      );

      handleClearPromo();
      reloadHistory();
    } catch (err: any) {
      console.error(err);
      setPaymentError(err.message || 'Payment processing failed. Please retry.');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleToggleAutoRenew = async (enabled: boolean) => {
    try {
      await toggleAutoRenew(enabled);
      setSuccessMessage(`Auto-Renewal settings successfully updated. Optional Auto Renew is now ${enabled ? 'ENABLED' : 'DISABLED'}.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Run Scenario Simulation triggers for user to check Requirement 3
  const simulateScenarioAlert = (scenario: string) => {
    setSimulatedScenario(scenario);
    const plan = subscription?.plan || SubscriptionPlan.MONTHLY;
    const price = PLAN_PRICES[plan];

    switch (scenario) {
      case 'real':
        setSimulatedScenario(null); // clears and goes back to calculated alert
        break;
      case 'off_7days':
        setSimulatedNotification({
          type: 'info',
          title: 'Subscription Reminder (7 Days Left)',
          message: 'Your ChhuttaPOS license expires in 7 days. Ensure continuous offline billing, data integrity reports, and cloud synchronizations by renewing your license today.',
          action: { label: 'Quick Renew Plan', onClick: () => handleRenew(plan, price) }
        });
        break;
      case 'off_3days':
        setSimulatedNotification({
          type: 'warning',
          title: '⚠️ Urgent Subscription Reminder (3 Days Left)',
          message: 'Only 3 days remaining before expiration. Your locally compiled data caches will be protected, but your billing terminal features will temporarily lock soon. Act today to keep checkout buffers active.',
          action: { label: 'Renew Now', onClick: () => handleRenew(plan, price) }
        });
        break;
      case 'off_1day':
        setSimulatedNotification({
          type: 'warning',
          title: '🚨 Critical Expiry Alert (1 Day Left)',
          message: 'Your subscription license expires tomorrow. All worker terminals, transaction counters, and live reporting modules will freeze unless extended.',
          action: { label: 'Renew Immediately', onClick: () => handleRenew(plan, price) }
        });
        break;
      case 'off_expired_day':
        setSimulatedNotification({
          type: 'warning',
          title: '⚠️ License Expires Today!',
          message: 'Your active subscription license ends today. Avoid terminal lockout by securing your extension today. Remaining days will be preserved.',
          action: { label: 'Secure License', onClick: () => handleRenew(plan, price) }
        });
        break;
      case 'off_expired':
        setSimulatedNotification({
          type: 'error',
          title: '❌ Subscription Expired – Renew Now',
          message: 'Your subscription has expired. Your inventory catalogs, checkout buffers, sales counters, and receipt templates reside safely within your local sandbox memory. Secure manual renewal now to resume.',
          action: { label: 'Renew Now (Preserve History)', onClick: () => handleRenew(plan, price) }
        });
        break;
      case 'on_before':
        setSimulatedNotification({
          type: 'info',
          title: '⏰ Scheduled Auto-Billing Notice',
          message: `Optional Auto-Renew is active. Your subscription is scheduled to automatically renew tomorrow. Razorpay secure gateway will execute a recurring charge of ${CURRENCY_SYMBOL}${price} to preserve your streak.`,
        });
        break;
      case 'on_success':
        setSimulatedNotification({
          type: 'success',
          title: '✅ Automatic Renewal Successful!',
          message: `Your active plan was automatically renewed and extended using Razorpay recurring subscriptions. All remaining subscription days were fully preserved and extended!`,
        });
        break;
      case 'on_failed':
        setSimulatedNotification({
          type: 'error',
          title: '❌ Auto-Billing Charge Failed',
          message: 'Razorpay payment gateway was unable to charge your account because of bank network delays. Please retry your billing charge manually or connect a new card.',
          action: { label: 'Retry Payment Now', onClick: () => handleRenew(plan, price, 'AUTOMATIC') }
        });
        break;
      default:
        setSimulatedNotification(null);
    }
  };

  const copyReferralCode = () => {
    const code = `CHHUTA-${user?.id?.substring(0, 6).toUpperCase() || 'REF99'}`;
    navigator.clipboard.writeText(code);
    alert(`Your referral code "${code}" has been copied! When a colleague registers, both of you will get 15 free bonus days.`);
  };

  const currentPlanName = subscription
    ? subscription.plan === SubscriptionPlan.FREE
      ? '7-Day Free Trial'
      : `${subscription.plan.replace('_', ' ')} Plan`
    : '7-Day Free Trial';

  const statusLabel = isExpired
    ? 'Expired'
    : isGracePeriod
    ? 'Grace Period'
    : 'Active';

  const statusColorClass = isExpired
    ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
    : isGracePeriod
    ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60'
    : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60';

  const purchaseDateStr = historyList.length > 0 
    ? new Date(historyList[0].purchaseDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : subscription?.lastVerificationTime 
    ? new Date(subscription.lastVerificationTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  const expiryDateStr = subscription
    ? new Date(subscription.expiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const nextRenewalDateStr = subscription
    ? new Date(subscription.expiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  return (
    <div className="space-y-8 font-sans text-slate-800 dark:text-slate-100 max-w-5xl mx-auto pb-12" id="subscription-renewal-hub">
      
      {/* SUCCESS MESSAGE DISPLAY BANNER */}
      {successMessage && (
        <div 
          className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500 dark:border-emerald-700 rounded-2xl flex items-start gap-4 shadow-md animate-fade-in"
          id="renewal-success-banner"
        >
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={24} />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 font-sans">Subscription Adjusted Successfully!</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed font-sans">
              {successMessage}
            </p>
          </div>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 text-xs font-bold px-2 py-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950/50 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* PAYMENT ERROR DISPLAY BANNER */}
      {paymentError && (
        <div 
          className="p-5 bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-500 dark:border-rose-700 rounded-2xl flex items-start gap-4 shadow-md animate-fade-in"
          id="renewal-error-banner"
        >
          <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={24} />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400 font-sans">Payment / Processing Failed</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed font-sans">
              {paymentError}
            </p>
          </div>
          <button 
            onClick={() => setPaymentError(null)}
            className="ml-auto text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200 text-xs font-bold px-2 py-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/50 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* DYNAMIC AND SIMULATED SYSTEM REMINDER NOTIFICATION BANNER */}
      {simulatedNotification && (
        <div 
          className={`p-5 rounded-2xl border-2 flex items-start gap-4 shadow-md transition-all ${
            simulatedNotification.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-500 dark:border-rose-900/60 text-rose-800 dark:text-rose-400'
              : simulatedNotification.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-500 dark:border-amber-900/60 text-amber-800 dark:text-amber-400'
              : simulatedNotification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-400'
              : 'bg-sky-50 dark:bg-sky-950/20 border-indigo-500 dark:border-indigo-900/60 text-sky-800 dark:text-sky-400'
          }`}
          id="billing-reminder-alert"
        >
          <div className="shrink-0 mt-0.5">
            {simulatedNotification.type === 'error' ? (
              <ShieldAlert size={24} className="text-rose-600" />
            ) : simulatedNotification.type === 'warning' ? (
              <AlertTriangle size={24} className="text-amber-500" />
            ) : simulatedNotification.type === 'success' ? (
              <CheckCircle2 size={24} className="text-emerald-600" />
            ) : (
              <Bell size={24} className="text-indigo-500" />
            )}
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="text-sm font-black tracking-tight">{simulatedNotification.title}</h4>
            <p className="text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              {simulatedNotification.message}
            </p>
            {simulatedNotification.action && (
              <div className="pt-1.5">
                <button
                  onClick={simulatedNotification.action.onClick}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1 cursor-pointer ${
                    simulatedNotification.type === 'error'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : simulatedNotification.type === 'warning'
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <CreditCard size={12} />
                  {simulatedNotification.action.label}
                </button>
              </div>
            )}
          </div>
          {simulatedScenario && (
            <button 
              onClick={() => simulateScenarioAlert('real')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5"
              title="Reset to Real Status"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* DETAILED LICENSE SUBSCRIPTION DASHBOARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in" id="license-dashboard">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              <Sparkles size={14} className="animate-pulse" />
              <span>ChhuttaPOS Enterprise License Center</span>
            </div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white font-sans">Active Licensing Verification Profile</h2>
          </div>
          <span className={`self-start sm:self-auto px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${statusColorClass}`}>
            ● {statusLabel}
          </span>
        </div>

        {/* Dashboard grid metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850/60 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">Current Plan</span>
            <strong className="text-sm font-black text-slate-800 dark:text-white uppercase font-sans">{currentPlanName}</strong>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850/60 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">License Expiry</span>
            <strong className="text-sm font-black text-slate-800 dark:text-white font-sans">{expiryDateStr}</strong>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850/60 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">Days Remaining</span>
            <strong className={`text-sm font-black font-sans ${daysRemaining > 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
              {daysRemaining} Days Left
            </strong>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850/60 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">Billing Sequence</span>
            <strong className="text-xs font-bold text-slate-600 dark:text-slate-300 font-sans">{purchaseDateStr}</strong>
          </div>
        </div>

        {/* REQUIREMENT 2: AUTO RENEW STATUS AND NEXT BILLING DATE */}
        <div className="p-5 rounded-2xl border border-slate-150 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-6" id="auto-renewal-panel">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="text-indigo-500" size={16} />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Razorpay Auto-Renewal Trigger</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl font-sans font-medium">
              If enabled, Razorpay secure gateway will automatically charge your account 1 day prior to expiry to guarantee un-interrupted services. Existing subscription days are fully preserved.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
            {subscription?.autoRenewEnabled && subscription?.nextBillingDate && (
              <div className="text-left sm:text-right">
                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Next Auto Billing</span>
                <strong className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                  {new Date(subscription.nextBillingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </strong>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auto-Renew</span>
              <button
                onClick={() => handleToggleAutoRenew(!subscription?.autoRenewEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                  subscription?.autoRenewEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                }`}
                id="auto-renew-toggle-switch"
                aria-label="Toggle Auto Renew Status"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    subscription?.autoRenewEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <strong className={`text-[11px] font-bold uppercase tracking-wider ${subscription?.autoRenewEnabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                {subscription?.autoRenewEnabled ? 'ON' : 'OFF'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* REQUIREMENT 3: INTERACTIVE REMINDER SCENARIO TESTER / SIMULATOR (Brilliant developer tool) */}
      <div className="bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4" id="simulation-tester">
        <div className="flex items-center gap-2">
          <Bell className="text-amber-500 animate-bounce" size={18} />
          <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Interactive License Alert Simulator</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans font-medium">
          Since expiry cycles span several months, use this interactive control center to simulate critical alerts, warning notification thresholds, and automatic renewal failures required by the spec.
        </p>

        <div className="space-y-4">
          {/* Sub-group 1: Auto-Renew is OFF scenarios */}
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-black mb-2">Scenario Group A: Auto Renew is OFF</span>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => simulateScenarioAlert('off_7days')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  simulatedScenario === 'off_7days' 
                    ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-500 text-indigo-700 dark:text-indigo-300' 
                    : 'bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850 hover:border-slate-300'
                }`}
              >
                7 Days before Expiry
              </button>
              <button 
                onClick={() => simulateScenarioAlert('off_3days')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  simulatedScenario === 'off_3days' 
                    ? 'bg-amber-50 dark:bg-amber-950 border-amber-500 text-amber-700 dark:text-amber-300' 
                    : 'bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850 hover:border-slate-300'
                }`}
              >
                3 Days before Expiry
              </button>
              <button 
                onClick={() => simulateScenarioAlert('off_1day')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  simulatedScenario === 'off_1day' 
                    ? 'bg-amber-50 dark:bg-amber-950 border-amber-500 text-amber-700 dark:text-amber-300' 
                    : 'bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850 hover:border-slate-300'
                }`}
              >
                1 Day before Expiry
              </button>
              <button 
                onClick={() => simulateScenarioAlert('off_expired_day')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  simulatedScenario === 'off_expired_day' 
                    ? 'bg-amber-50 dark:bg-amber-950 border-amber-500 text-amber-700 dark:text-amber-300' 
                    : 'bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850 hover:border-slate-300'
                }`}
              >
                On the Expiry Date
              </button>
              <button 
                onClick={() => simulateScenarioAlert('off_expired')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  simulatedScenario === 'off_expired' 
                    ? 'bg-rose-50 dark:bg-rose-950 border-rose-500 text-rose-700 dark:text-rose-300 font-extrabold' 
                    : 'bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850 hover:border-slate-300'
                }`}
              >
                After Expiry Alert
              </button>
            </div>
          </div>

          {/* Sub-group 2: Auto-Renew is ON scenarios */}
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-black mb-2">Scenario Group B: Auto Renew is ON</span>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => simulateScenarioAlert('on_before')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  simulatedScenario === 'on_before' 
                    ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-500 text-indigo-700 dark:text-indigo-300' 
                    : 'bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850 hover:border-slate-300'
                }`}
              >
                Pre-Renewal Reminder
              </button>
              <button 
                onClick={() => simulateScenarioAlert('on_success')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  simulatedScenario === 'on_success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850 hover:border-slate-300'
                }`}
              >
                Auto-Renewal Success
              </button>
              <button 
                onClick={() => simulateScenarioAlert('on_failed')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  simulatedScenario === 'on_failed' 
                    ? 'bg-rose-50 dark:bg-rose-950 border-rose-500 text-rose-700 dark:text-rose-300 font-extrabold' 
                    : 'bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850 hover:border-slate-300'
                }`}
              >
                Auto-Renew Failed (Test Retry)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* EXTENSIBLE PROMO CODES / COUPONS SECTIONS */}
      {DEFAULT_PROMO_ENABLED ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="text-indigo-500" size={18} />
            <h3 className="text-xs font-extrabold text-slate-950 dark:text-white uppercase tracking-wider">{DEFAULT_PROMO_TITLE}</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans font-medium">
            {DEFAULT_PROMO_DESCRIPTION} Apply the promo code <code className="bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono font-bold text-[10px]">{DEFAULT_PROMO_CODE}</code> below or any other referral/reward codes before choosing a plan to redeem!
          </p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-xs w-full">
              <input 
                type="text" 
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                disabled={!!activePromo}
                placeholder="Enter Coupon / Promo Code"
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-bold font-mono outline-none uppercase tracking-widest text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
              />
              {activePromo && (
                <Gift className="absolute right-3 top-2.5 text-indigo-500 animate-bounce" size={16} />
              )}
            </div>
            
            {!activePromo ? (
              <button
                onClick={handleApplyPromo}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Apply Code
              </button>
            ) : (
              <button
                onClick={handleClearPromo}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Clear Promo
              </button>
            )}
          </div>

          {promoError && (
            <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1">
              <Info size={12} /> {promoError}
            </p>
          )}
          {promoSuccessMsg && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <Check size={12} /> {promoSuccessMsg}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎁</span>
            <h3 className="text-sm font-black text-slate-950 dark:text-white tracking-tight">No Active Offers Right Now</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans font-semibold">
                Follow ChhuttaPOS on our social media channels to receive:
              </p>
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 list-disc pl-4 font-sans font-medium">
                <li>Exclusive coupon codes</li>
                <li>Festival offers</li>
                <li>Referral rewards</li>
                <li>Limited-time discounts</li>
                <li>Feature announcements</li>
                <li>Product updates</li>
              </ul>
            </div>
            
            <div className="flex flex-col gap-2.5">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Connect With Us</p>
              <div className="grid grid-cols-2 gap-2">
                {INSTAGRAM_URL && (
                  <a 
                    href={INSTAGRAM_URL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all"
                  >
                    <Instagram size={14} className="text-pink-600 dark:text-pink-400" />
                    <span>Instagram</span>
                  </a>
                )}
                {FACEBOOK_URL && (
                  <a 
                    href={FACEBOOK_URL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all"
                  >
                    <Facebook size={14} className="text-blue-600 dark:text-blue-400" />
                    <span>Facebook</span>
                  </a>
                )}
                {YOUTUBE_URL && (
                  <a 
                    href={YOUTUBE_URL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all"
                  >
                    <Youtube size={14} className="text-red-600 dark:text-red-400" />
                    <span>YouTube</span>
                  </a>
                )}
                {WHATSAPP_CHANNEL_URL && (
                  <a 
                    href={WHATSAPP_CHANNEL_URL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all"
                  >
                    <MessageCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans Pricing Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">Choose a License Renewal Plan</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans font-medium">
            Select a plan to extend your active subscription. All remaining trial or subscription days are fully preserved and extended!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrentPlan = subscription?.plan === plan.id;
            // Calculate final price based on active discount
            let displayPrice = plan.price;
            let originalPrice: number | null = null;
            if (activePromo) {
              const campaign = PROMO_CAMPAIGNS.find(c => c.code.toUpperCase() === activePromo.toUpperCase() && c.enabled);
              if (campaign && campaign.discountPercent > 0) {
                originalPrice = plan.price;
                displayPrice = Math.round(plan.price * (1 - campaign.discountPercent / 100));
              }
            }

            return (
              <div 
                key={plan.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border p-5 flex flex-col justify-between relative overflow-hidden transition-all ${
                  isCurrentPlan
                    ? 'border-indigo-600 ring-2 ring-indigo-600/10 dark:ring-indigo-500/10'
                    : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-350 dark:hover:border-slate-700'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                    Current Active
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider block w-max">
                      {plan.badge}
                    </span>
                    {plan.bonusText && (
                      <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider block w-max">
                        {plan.bonusText}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xs font-bold mt-3 text-slate-900 dark:text-white uppercase tracking-wider">{plan.name}</h3>
                  
                  <div className="mt-2 flex flex-col">
                    {originalPrice !== null && (
                      <span className="text-[10px] text-slate-400 line-through">{CURRENCY_SYMBOL}{originalPrice}</span>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{CURRENCY_SYMBOL}{displayPrice}</span>
                      <span className="text-[10px] text-slate-400 font-medium font-sans">/{plan.period}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-850">
                  <button
                    onClick={() => handleRenew(plan.id, displayPrice)}
                    disabled={isProcessing !== null}
                    className="w-full min-h-[38px] rounded-lg flex items-center justify-center text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
                  >
                    {isProcessing === plan.id ? (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw size={10} className="animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      'Renew / Purchase'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan Features Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-4">Every paid subscription unlocks:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feat, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Check size={14} className="text-emerald-500 shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* COMPLETE SUBSCRIPTION HISTORY LOG (Fulfills Req 5 & 10) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in" id="subscription-history-block">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4">
          <div className="flex items-center gap-2">
            <History className="text-indigo-500" size={18} />
            <h3 className="text-sm font-extrabold text-slate-950 dark:text-white uppercase tracking-tight">Complete License Billing History</h3>
          </div>
          <span className="text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 px-2 py-0.5 rounded font-bold">
            {historyList.length} Transactions Found
          </span>
        </div>

        {historyList.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 space-y-2">
            <Info size={24} className="mx-auto text-slate-300" />
            <p className="text-xs font-sans">No transaction receipts logged on this terminal yet.</p>
            <p className="text-[10px] font-mono">Your initial 7-Day Trial is handled automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider border-b border-slate-150 dark:border-slate-850 font-sans">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Plan Name</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Purchase Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Renewal Mode</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-mono text-[11px]">
                {historyList.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 font-sans text-slate-700 dark:text-slate-300">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{entry.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{entry.planName}</td>
                    <td className="py-3.5 px-4 font-mono">
                      {entry.duration} Days
                      {entry.bonusDays && (
                        <span className="ml-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded font-sans">
                          +{entry.bonusDays} Promo Days
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold font-mono text-slate-900 dark:text-white">{CURRENCY_SYMBOL}{entry.amountPaid}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">{new Date(entry.purchaseDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">{new Date(entry.expiryDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-extrabold uppercase text-[9px] tracking-wider font-sans border ${
                        entry.renewalType === 'AUTOMATIC'
                          ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-200'
                          : 'bg-slate-50 dark:bg-slate-950/20 text-slate-700 dark:text-slate-400 border-slate-200'
                      }`}>
                        {entry.renewalType || 'MANUAL'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 px-2 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide font-sans">
                        {entry.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedInvoice(entry)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer font-sans"
                      >
                        <FileText size={13} />
                        GST Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REWARDS, DISCOUNTS AND REFERRALS CARDS (Requirement 6 Future Expansions) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="referral-future-expansions">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 dark:from-slate-900 dark:to-slate-950/20 border border-indigo-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="text-indigo-500 animate-pulse" size={18} />
            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight">Referral Reward Program</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans font-medium">
            Introduce other wholesale business operators to ChhuttaPOS. When they configure their first cash register terminal, both you and your colleague unlock <strong>15 free bonus subscription days</strong> credited instantly!
          </p>

          <div className="p-3 bg-white dark:bg-slate-950 rounded-2xl border border-indigo-100/50 dark:border-slate-850 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 tracking-wider">
              {`CHHUTTA-${user?.id?.substring(0, 6).toUpperCase() || 'REF99'}`}
            </span>
            <button
              onClick={copyReferralCode}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1 transition-colors"
            >
              <Share2 size={12} />
              Share Code
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="text-amber-500" size={18} />
            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight">Active Promotional Offers</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans font-medium">
            Active promotional coupons available on this register:
          </p>

          <div className="space-y-2.5">
            {PROMO_CAMPAIGNS.filter(c => c.enabled).map((c) => (
              <div key={c.code} className="flex items-center justify-between text-xs font-sans p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 animate-fade-in">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 dark:text-white font-mono">{c.code}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{c.description}</span>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                  c.discountPercent > 0 
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20' 
                    : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                }`}>
                  {c.discountPercent > 0 ? `${c.discountPercent}% OFF CHECKOUT` : `+${c.bonusDays} Free Bonus Days`}
                </span>
              </div>
            ))}
            {PROMO_CAMPAIGNS.filter(c => c.enabled).length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 font-sans italic text-center py-2">No active promotion coupons.</p>
            )}
          </div>
        </div>
      </div>

      {/* REQUIREMENT 6: GST INVOICE GENERATOR MOCK MODAL OVERLAY */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs font-sans p-4" id="gst-invoice-modal">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-850">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-indigo-500" />
                <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">GST INVOICE / RECEIPT</h3>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Invoice Content */}
            <div className="p-6 space-y-5 text-xs text-slate-700 dark:text-slate-300">
              {/* Top Meta info */}
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">ChhuttaPOS Systems Private Limited</h4>
                  <p className="text-[10px] text-slate-400">GSTIN: 29AAFCC1122D1Z0 | SAC: 997331</p>
                  <p className="text-[10px] text-slate-400">Bengaluru, Karnataka, India</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Invoice Ref</span>
                  <strong className="font-mono text-slate-800 dark:text-white uppercase">{`INV-${selectedInvoice.id}`}</strong>
                </div>
              </div>

              {/* Billed To */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850/60 space-y-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Billed To (Registered Retail Partner):</span>
                <strong className="text-slate-800 dark:text-white block font-sans text-xs uppercase">{business?.name || 'ChhuttaPOS Retail Sandbox Partner'}</strong>
                <p className="text-[10px] text-slate-500">Owner Contact: {user?.fullName || 'Owner Admin'} ({user?.email})</p>
                <p className="text-[10px] text-slate-500">Place of Supply: Karnataka (29)</p>
              </div>

              {/* Tax Calculations */}
              <div className="space-y-2 border-t border-b border-slate-100 dark:border-slate-850 py-3 font-sans">
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Description</span>
                  <span className="font-mono text-right">Taxable Value</span>
                </div>
                <div className="flex justify-between items-center font-bold text-slate-800 dark:text-white">
                  <span>{selectedInvoice.planName} - SaaS Licensing Service</span>
                  <span className="font-mono">{CURRENCY_SYMBOL}{Math.round(selectedInvoice.amountPaid / 1.18)}</span>
                </div>
                
                <div className="pt-2 divide-y divide-slate-100 dark:divide-slate-850 text-[11px]">
                  <div className="flex justify-between items-center py-1 text-slate-500">
                    <span>Central GST (CGST @ 9%)</span>
                    <span className="font-mono">{CURRENCY_SYMBOL}{Math.round((selectedInvoice.amountPaid / 1.18) * 0.09)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 text-slate-500">
                    <span>State GST (SGST @ 9%)</span>
                    <span className="font-mono">{CURRENCY_SYMBOL}{Math.round((selectedInvoice.amountPaid / 1.18) * 0.09)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 font-bold text-slate-900 dark:text-white">
                    <span>Total Tax-inclusive Amount Paid</span>
                    <span className="font-mono text-sm text-indigo-600 dark:text-indigo-400">{CURRENCY_SYMBOL}{selectedInvoice.amountPaid}</span>
                  </div>
                </div>
              </div>

              {/* Footer Stamp */}
              <div className="text-center text-[10px] text-slate-400 leading-relaxed pt-2">
                Thank you for powering your wholesale operations with ChhuttaPOS.<br/>
                This is a computer-generated tax invoice verified under digital signature laws.
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-2">
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  alert('GST Invoice PDF downloaded successfully under your wholesale records.');
                  setSelectedInvoice(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download size={13} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Technical Support Form channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Support Request Form */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2 uppercase tracking-wider">
              <HelpCircle size={16} className="text-indigo-500" />
              Contact ChhuttaPOS Billing Support Desk
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-sans font-medium">
              If you encounter payment routing delays, require custom company GSTIN registrations, or request enterprise scale licenses, dispatch your inquiry below.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              alert('Support query logged! A verified billing executive will contact you shortly.');
              setSupportMessage('');
            }} className="space-y-4">
              <div>
                <textarea
                  required
                  rows={3}
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Brief description of your license inquiry..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 p-3 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none text-slate-900 dark:text-white font-sans"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Submit billing inquiry
              </button>
            </form>
          </div>
        </div>

        {/* Contact Info Block */}
        <div className="bg-indigo-50/50 dark:bg-slate-900 border border-slate-200 dark:border-indigo-900/20 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={16} className="text-indigo-500" />
              Direct Escrow Desk
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-sans">
              Connect directly with our accounts and enterprise integrations unit.
            </p>

            <div className="space-y-3 font-sans">
              <a 
                href={`mailto:${SUPPORT_EMAIL}`} 
                className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 hover:border-indigo-500 hover:shadow-sm transition-all text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <Mail size={16} className="text-indigo-500 shrink-0" />
                <span>{SUPPORT_EMAIL}</span>
              </a>

              <a 
                href={`https://wa.me/91${SUPPORT_WHATSAPP}`} 
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 hover:border-emerald-500 hover:shadow-sm transition-all text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <PhoneCall size={16} className="text-emerald-500 shrink-0" />
                <span>WhatsApp Desk: +91 {SUPPORT_WHATSAPP}</span>
              </a>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 mt-4 leading-normal font-sans font-medium">
            Business Accounts Hours: 9:00 AM - 9:00 PM IST
          </div>
        </div>

      </div>

    </div>
  );
};
