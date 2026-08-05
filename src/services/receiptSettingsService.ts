/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ReceiptSettings {
  logoUrl: string;
  receiptHeader: string;
  receiptFooter: string;
  showGst: boolean;
  showCustomerDetails: boolean;
  showQr: boolean;
  showBusinessEmail: boolean;
  showBusinessPhone: boolean;
  showAddress: boolean;
  defaultPaperSize: 'A4' | '58mm' | '80mm';
  defaultShareMethod: 'whatsapp' | 'email' | 'sms' | 'none';
  autoPrint: boolean;
}

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  logoUrl: '',
  receiptHeader: 'Thank you for shopping with us!',
  receiptFooter: 'Please visit again! Have a great day.',
  showGst: true,
  showCustomerDetails: true,
  showQr: true,
  showBusinessEmail: true,
  showBusinessPhone: true,
  showAddress: true,
  defaultPaperSize: '80mm',
  defaultShareMethod: 'whatsapp',
  autoPrint: false,
};

const STORAGE_KEY = 'chhutta_receipt_settings';

export const getReceiptSettings = (): ReceiptSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_RECEIPT_SETTINGS,
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Error loading receipt settings:', e);
  }
  return DEFAULT_RECEIPT_SETTINGS;
};

export const saveReceiptSettings = (settings: Partial<ReceiptSettings>): ReceiptSettings => {
  const current = getReceiptSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving receipt settings:', e);
  }
  return updated;
};
