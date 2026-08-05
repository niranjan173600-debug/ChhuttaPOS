/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DbBill } from '../database/db';

export interface ShareData {
  businessName: string;
  customerPhone?: string;
  customerEmail?: string;
  bill: DbBill;
}

export const formatReceiptText = (data: ShareData): string => {
  const { businessName, bill } = data;
  const itemsList = bill.items
    .map(
      (item) =>
        `• ${item.productName} (x${item.quantity}) - ₹${item.lineTotal.toFixed(2)}`
    )
    .join('\n');

  const paymentInfo =
    bill.paymentMethod === 'SPLIT'
      ? `Split Pay (Cash: ₹${bill.cashAmount.toFixed(2)}, UPI: ₹${bill.upiAmount.toFixed(2)})`
      : bill.paymentMethod;

  return (
    `*${businessName.toUpperCase()}*\n` +
    `=============================\n` +
    `Receipt No: ${bill.billNumber}\n` +
    `Date & Time: ${bill.date} ${bill.time}\n` +
    `Cashier / Worker: ${bill.workerName || bill.cashierName}\n` +
    `Customer: ${bill.customerName || 'Valued Customer'}\n` +
    `=============================\n` +
    `ITEMS:\n${itemsList}\n` +
    `=============================\n` +
    `Subtotal: ₹${bill.subtotal.toFixed(2)}\n` +
    (bill.discountAmount > 0 ? `Discount: -₹${bill.discountAmount.toFixed(2)}\n` : '') +
    `*GRAND TOTAL: ₹${bill.grandTotal.toFixed(2)}*\n` +
    `Payment Method: ${paymentInfo}\n` +
    `=============================\n` +
    `Thank you for shopping with us! 🙏`
  );
};

/**
 * Clean and format Indian / international phone number
 */
export const cleanPhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
};

/**
 * Open WhatsApp Share
 */
export const shareViaWhatsApp = (data: ShareData): boolean => {
  const phone = data.customerPhone || data.bill.customerMobile;
  const text = formatReceiptText(data);

  if (!phone) {
    return false; // Prompt needed
  }

  const cleanPhone = cleanPhoneNumber(phone);
  const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
  return true;
};

/**
 * Open Email Client
 */
export const shareViaEmail = (data: ShareData): boolean => {
  const email = data.customerEmail;
  if (!email) {
    return false; // Prompt needed
  }

  const subject = `Receipt - ${data.businessName} (#${data.bill.billNumber})`;
  const body = formatReceiptText(data);

  const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
  return true;
};

/**
 * Open SMS Client
 */
export const shareViaSMS = (data: ShareData): boolean => {
  const phone = data.customerPhone || data.bill.customerMobile;
  const text = formatReceiptText(data);

  if (!phone) {
    return false; // Prompt needed
  }

  const cleanPhone = cleanPhoneNumber(phone);
  // Using standard SMS URL scheme
  const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
  window.location.href = smsUrl;
  return true;
};
