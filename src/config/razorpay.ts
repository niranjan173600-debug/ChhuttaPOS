/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Razorpay Payment Integration Configuration
 * 
 * Developer Note:
 * When deploying ChhuttaPOS in your production environment or after downloading the source ZIP,
 * please define the following environment variables in your .env file:
 * 
 * VITE_RAZORPAY_KEY_ID="rzp_test_your_key_id" (for frontend Checkout SDK initialization)
 * RAZORPAY_KEY_SECRET="your_razorpay_secret_key" (for backend payment verification - NEVER expose this in frontend)
 * 
 * If these keys are not set, the application will degrade gracefully to simulation mode
 * with a friendly reminder, and will not crash during production builds.
 */

export const RAZORPAY_CONFIG = {
  // Safe client-side read of Razorpay Key ID
  keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
  
  // Checks if the client-side Razorpay key ID is configured
  isConfigured: !!import.meta.env.VITE_RAZORPAY_KEY_ID,
};
