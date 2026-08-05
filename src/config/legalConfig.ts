/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const CURRENT_LEGAL_VERSIONS = {
  privacy_policy_version: 'v1.0',
  terms_version: 'v1.0',
  refund_policy_version: 'v1.0',
};

export interface LegalConsentData {
  legal_consent: boolean;
  legal_consent_timestamp: string;
  privacy_policy_version: string;
  terms_version: string;
  refund_policy_version: string;
}

export const LEGAL_DOCUMENTS = {
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'July 2026',
    version: CURRENT_LEGAL_VERSIONS.privacy_policy_version,
    sections: [
      {
        heading: '1. Information We Collect',
        content: 'ChhuttaPOS operates an offline-first Point of Sale application. We collect account registration information such as your full name, email address, business name, and store operational details to facilitate offline synchronization and account verification.'
      },
      {
        heading: '2. Local Storage and Data Protection',
        content: 'Your transaction records, product catalogs, customer data, and worker profiles are stored locally on your device via encrypted IndexedDB storage. Syncing to our central server occurs securely when an internet connection is established.'
      },
      {
        heading: '3. Usage of Information',
        content: 'We use your account details solely to manage subscriptions, provide technical support, generate optional cloud backups, and enforce license validity. We do not sell or rent your personal or business data to third parties.'
      },
      {
        heading: '4. Third-Party Integrations',
        content: 'When utilizing integrated payment services (e.g., Razorpay) or authentication services (e.g., Supabase/Google), data relevant to transaction processing and authentication is processed in accordance with respective partner security standards.'
      }
    ]
  },
  terms: {
    title: 'Terms & Conditions',
    lastUpdated: 'July 2026',
    version: CURRENT_LEGAL_VERSIONS.terms_version,
    sections: [
      {
        heading: '1. Acceptable Use of Service',
        content: 'By creating a store workspace on ChhuttaPOS, you agree to comply with all applicable local commercial regulations, tax reporting laws, and consumer protection guidelines for your jurisdiction.'
      },
      {
        heading: '2. Offline Registers and Synchronization',
        content: 'ChhuttaPOS provides offline-first billing capabilities. You acknowledge responsibility for maintaining physical device security and connecting periodically to synchronize transaction logs and keep licensing active.'
      },
      {
        heading: '3. Subscription and Access Grants',
        content: 'Account features are enabled based on your selected trial or active subscription plan. Subscriptions auto-renew where configured, subject to grace periods as specified in your billing settings.'
      },
      {
        heading: '4. Intellectual Property & License',
        content: 'ChhuttaPOS software, logos, trademarks, and user interfaces are protected under intellectual property laws. Users receive a non-exclusive, non-transferable license to operate the software for business operations.'
      }
    ]
  },
  refund: {
    title: 'Refund & Cancellation Policy',
    lastUpdated: 'July 2026',
    version: CURRENT_LEGAL_VERSIONS.refund_policy_version,
    sections: [
      {
        heading: '1. 7-Day Free Trial',
        content: 'All new business registrations include a 7-day fully functional free trial with no upfront payment requirement. You may evaluate all features during this period without financial obligation.'
      },
      {
        heading: '2. Plan Cancellations',
        content: 'You may cancel auto-renewal for any active subscription at any time through the Licensing & Subscription tab in your settings. Your account will remain active until the end of your current paid billing period.'
      },
      {
        heading: '3. Refund Eligibility',
        content: 'Subscription payments are eligible for a full refund within 48 hours of purchase if no automated transaction sync services were rendered and tech support confirms a software defect. Refund requests can be raised via business support.'
      },
      {
        heading: '4. Grace Period Policy',
        content: 'If a payment fails or a subscription expires, a grace period allows continued operational access to allow time for renewal before workspace features become restricted.'
      }
    ]
  }
};
