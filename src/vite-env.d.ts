/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_RAZORPAY_KEY_ID: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_SUPPORT_EMAIL: string;
  readonly VITE_SUPPORT_WHATSAPP: string;
  readonly VITE_DEFAULT_PROMO_CODE: string;
  readonly VITE_DEFAULT_PROMO_DISCOUNT_PERCENT: string;
  readonly VITE_DEFAULT_PROMO_TITLE: string;
  readonly VITE_DEFAULT_PROMO_DESCRIPTION: string;
  readonly VITE_DEFAULT_PROMO_ENABLED: string;
  readonly VITE_INSTAGRAM_URL: string;
  readonly VITE_FACEBOOK_URL: string;
  readonly VITE_YOUTUBE_URL: string;
  readonly VITE_WHATSAPP_CHANNEL_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
