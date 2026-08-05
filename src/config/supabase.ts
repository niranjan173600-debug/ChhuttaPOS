/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Safely create Supabase client without throwing on initialization if keys are missing
export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  isConfigured: !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')),
};

if (!SUPABASE_CONFIG.isConfigured) {
  console.info('Supabase: Configuration required. Connect with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}
