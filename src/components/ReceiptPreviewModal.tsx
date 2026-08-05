/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  Share2, 
  Mail, 
  MessageSquare, 
  X, 
  CheckCircle2, 
  QrCode, 
  Plus, 
  Smartphone,
  Sparkles,
  FileText
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { DbBill } from '../database/db';
import { getReceiptSettings, ReceiptSettings } from '../services/receiptSettingsService';
import { downloadReceiptPDFFromElement, PaperSize } from '../services/pdfService';
import { shareViaWhatsApp, shareViaEmail, shareViaSMS } from '../services/shareService';
import { triggerBrowserPrint } from '../services/printerService';
import { useAuth } from '../contexts/AuthContext';

interface ReceiptPreviewModalProps {
  bill: DbBill;
  onClose: () => void;
  onNewSale?: () => void;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  bill,
  onClose,
  onNewSale,
}) => {
  const { business } = useAuth();
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>(getReceiptSettings());
  const [paperSize, setPaperSize] = useState<PaperSize>(receiptSettings.defaultPaperSize || '80mm');

  // Input Prompts for missing contact details
  const [promptType, setPromptType] = useState<'whatsapp' | 'email' | 'sms' | null>(null);
  const [promptPhone, setPromptPhone] = useState(bill.customerMobile || '');
  const [promptEmail, setPromptEmail] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setReceiptSettings(getReceiptSettings());
  }, []);

  const businessName = business?.name || 'ChhuttaPOS Store';
  const businessAddress = receiptSettings.showAddress ? (business?.address || '') : '';
  const businessPhone = receiptSettings.showBusinessPhone ? (business?.phone || '') : '';
  const businessEmail = receiptSettings.showBusinessEmail ? (business?.email || '') : '';
  const gstNumber = receiptSettings.showGst ? (business?.taxNumber || '') : '';
  const logoUrl = receiptSettings.logoUrl || business?.logoUrl || '';

  // Owner payment VPA settings for UPI QR
  const paymentSettings = (() => {
    try {
      const saved = localStorage.getItem('chhutta_owner_payment_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return { upiId: '' };
  })();

  const showToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handlePrint = () => {
    triggerBrowserPrint();
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      await downloadReceiptPDFFromElement({
        elementId: 'printable-receipt-container',
        fileName: `Receipt_${bill.billNumber}.pdf`,
        paperSize: paperSize,
      });
      showToast('Receipt PDF downloaded successfully!');
    } catch (err) {
      console.error(err);
      alert('Error generating PDF download.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleWhatsAppClick = () => {
    const success = shareViaWhatsApp({
      businessName,
      customerPhone: promptPhone,
      bill,
    });
    if (!success) {
      setPromptType('whatsapp');
    } else {
      showToast('Opened WhatsApp composer.');
    }
  };

  const handleEmailClick = () => {
    const success = shareViaEmail({
      businessName,
      customerEmail: promptEmail,
      bill,
    });
    if (!success) {
      setPromptType('email');
    } else {
      showToast('Opened Email client.');
    }
  };

  const handleSMSClick = () => {
    const success = shareViaSMS({
      businessName,
      customerPhone: promptPhone,
      bill,
    });
    if (!success) {
      setPromptType('sms');
    } else {
      showToast('Opened SMS app.');
    }
  };

  const handleConfirmPromptShare = () => {
    if (promptType === 'whatsapp') {
      if (!promptPhone.trim()) return alert('Please enter customer phone number.');
      shareViaWhatsApp({ businessName, customerPhone: promptPhone.trim(), bill });
    } else if (promptType === 'sms') {
      if (!promptPhone.trim()) return alert('Please enter customer phone number.');
      shareViaSMS({ businessName, customerPhone: promptPhone.trim(), bill });
    } else if (promptType === 'email') {
      if (!promptEmail.trim()) return alert('Please enter customer email address.');
      shareViaEmail({ businessName, customerEmail: promptEmail.trim(), bill });
    }
    setPromptType(null);
  };

  // Determine width styling based on paper size preview
  const getContainerWidth = () => {
    if (paperSize === 'A4') return 'max-w-xl';
    if (paperSize === '58mm') return 'max-w-xs';
    return 'max-w-sm'; // 80mm
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 no-print">
      
      {/* Toast banner */}
      <AnimatePresence>
        {actionSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle2 size={16} />
            <span>{actionSuccessMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-4 md:p-6 shadow-2xl relative text-slate-800 dark:text-slate-100 space-y-4 my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-100/50">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                Receipt Preview & Operations
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200/40">
                  {bill.billNumber}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Verified bill transaction stored in database. Select paper format to print or download.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Paper Format Selector Bar */}
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 shrink-0">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider pl-2">
            Paper Size Format:
          </span>
          <div className="flex gap-1.5">
            {(['58mm', '80mm', 'A4'] as PaperSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setPaperSize(size)}
                className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                  paperSize === size
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {size} {size === '58mm' ? '(Small Thermal)' : size === '80mm' ? '(Std Thermal)' : '(Full Sheet)'}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Receipt Canvas Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-center scrollbar-thin">
          <div
            id="printable-receipt-container"
            className={`bg-white text-slate-900 p-5 shadow-lg rounded-xl font-mono text-xs w-full transition-all duration-300 ${getContainerWidth()}`}
            style={{ minHeight: '380px' }}
          >
            {/* Business Logo */}
            {logoUrl && (
              <div className="text-center mb-3 flex justify-center">
                <img
                  src={logoUrl}
                  alt={businessName}
                  className="max-h-16 max-w-xs object-contain"
                />
              </div>
            )}

            {/* Business Details Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-0.5">
              <h3 className="font-extrabold text-base text-slate-950 uppercase tracking-tight">
                {businessName}
              </h3>
              {receiptSettings.receiptHeader && (
                <p className="text-[10px] text-slate-600 font-semibold italic">
                  {receiptSettings.receiptHeader}
                </p>
              )}
              {businessAddress && <p className="text-[10px] text-slate-600 leading-tight">{businessAddress}</p>}
              {businessPhone && <p className="text-[10px] text-slate-600">Phone: {businessPhone}</p>}
              {businessEmail && <p className="text-[10px] text-slate-600">Email: {businessEmail}</p>}
              {gstNumber && <p className="text-[10px] font-bold text-slate-800 mt-1">GSTIN: {gstNumber}</p>}
            </div>

            {/* Receipt Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px] leading-tight">
              <div className="flex justify-between">
                <span>Receipt No:</span>
                <strong className="font-extrabold">{bill.billNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span>{bill.date} {bill.time}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier / Worker:</span>
                <span>{bill.workerName || bill.cashierName}</span>
              </div>
              {receiptSettings.showCustomerDetails && bill.customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{bill.customerName}</span>
                </div>
              )}
              {receiptSettings.showCustomerDetails && bill.customerMobile && (
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{bill.customerMobile}</span>
                </div>
              )}
            </div>

            {/* Itemized List */}
            <div className="py-2.5 space-y-2 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold border-b border-slate-200 pb-1 text-[11px]">
                <span>ITEM</span>
                <span>TOTAL (₹)</span>
              </div>

              {bill.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5 text-[11px]">
                  <div className="font-bold flex justify-between">
                    <span>
                      {item.productName}{' '}
                      {(item.brand || item.variant) && (
                        <span className="font-normal text-[9px] text-slate-500">
                          ({[item.brand, item.variant].filter(Boolean).join(' - ')})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>{item.quantity} x ₹{item.sellingPrice.toFixed(2)}</span>
                    <span>₹{item.lineTotal.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal & Discounts & Tips */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{bill.subtotal.toFixed(2)}</span>
              </div>
              {(bill.tipAmount || 0) > 0 && (
                <div className="flex justify-between text-indigo-700 font-bold">
                  <span>Staff Tip</span>
                  <span>+₹{(bill.tipAmount || 0).toFixed(2)}</span>
                </div>
              )}
              {bill.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Discount ({bill.discountType === 'percentage' ? `${bill.discountValue}%` : 'Fixed'})</span>
                  <span>-₹{bill.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-950 pt-1.5 border-t border-slate-200">
                <span>FINAL TOTAL</span>
                <span>₹{bill.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between font-bold">
                <span>Payment Method:</span>
                <span>{bill.paymentMethod}</span>
              </div>
              {bill.paymentMethod === 'SPLIT' && (
                <div className="pl-3 text-[10px] text-slate-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Cash Received:</span>
                    <span>₹{bill.cashAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UPI Received:</span>
                    <span>₹{bill.upiAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* QR / Payment Confirmation */}
            {receiptSettings.showQr && (
              <div className="py-3 text-center border-b border-dashed border-slate-300">
                {bill.paymentMethod === 'CASH' ? (
                  paymentSettings.upiId ? (
                    <div className="bg-white p-2 border border-slate-200 rounded-lg inline-block text-center mx-auto">
                      <QRCodeSVG
                        value={`upi://pay?pa=${encodeURIComponent(paymentSettings.upiId)}&pn=${encodeURIComponent(businessName)}&am=${bill.grandTotal.toFixed(2)}&tn=${bill.billNumber}`}
                        size={80}
                        level="M"
                      />
                      <div className="text-[8px] font-bold mt-1 uppercase text-slate-600">
                        Pay ₹{bill.grandTotal.toFixed(2)} via UPI
                      </div>
                      <div className="text-[7px] text-slate-500 font-mono">{paymentSettings.upiId}</div>
                    </div>
                  ) : null
                ) : bill.paymentMethod === 'UPI' ? (
                  <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    ✓ Paid Successfully via UPI
                  </div>
                ) : (
                  <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50 p-2 rounded-lg border border-indigo-200">
                    ✓ Paid via Split Mode (Cash ₹{bill.cashAmount.toFixed(2)}, UPI ₹{bill.upiAmount.toFixed(2)})
                  </div>
                )}
              </div>
            )}

            {/* Footer Message */}
            <div className="pt-3 text-center text-[10px] text-slate-500 space-y-1">
              <p className="font-semibold">{receiptSettings.receiptFooter || 'Thank you for your visit!'}</p>
              <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Powered by ChhuttaPOS</p>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
          {/* Print */}
          <button
            onClick={handlePrint}
            className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            <Printer size={13} />
            <span>Print</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="h-9 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
          >
            <Download size={13} />
            <span>{isGeneratingPdf ? 'PDF...' : 'Download PDF'}</span>
          </button>

          {/* Share WhatsApp */}
          <button
            onClick={handleWhatsAppClick}
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            <Share2 size={13} />
            <span>WhatsApp</span>
          </button>

          {/* Share Email */}
          <button
            onClick={handleEmailClick}
            className="h-9 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            <Mail size={13} />
            <span>Email</span>
          </button>

          {/* Share SMS */}
          <button
            onClick={handleSMSClick}
            className="h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            <MessageSquare size={13} />
            <span>SMS</span>
          </button>

          {/* New Sale / Close */}
          {onNewSale ? (
            <button
              onClick={() => {
                onClose();
                onNewSale();
              }}
              className="h-9 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-xl text-[11px] font-black uppercase cursor-pointer border border-emerald-200 dark:border-emerald-900"
            >
              New Sale
            </button>
          ) : (
            <button
              onClick={onClose}
              className="h-9 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-bold cursor-pointer"
            >
              Close
            </button>
          )}
        </div>

        {/* Prompt Dialog for missing contact info */}
        {promptType && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs rounded-3xl flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Smartphone size={14} className="text-indigo-500" />
                  Enter Customer {promptType === 'email' ? 'Email' : 'Mobile Number'}
                </h4>
                <button
                  onClick={() => setPromptType(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Customer {promptType === 'email' ? 'email' : 'phone number'} was not saved for this bill. Please enter it below to send the receipt via {promptType.toUpperCase()}.
              </p>

              {promptType === 'email' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">Customer Email</label>
                  <input
                    type="email"
                    value={promptEmail}
                    onChange={(e) => setPromptEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">Mobile Number (e.g. 9876543210)</label>
                  <input
                    type="tel"
                    value={promptPhone}
                    onChange={(e) => setPromptPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setPromptType(null)}
                  className="flex-1 h-9 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPromptShare}
                  className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  Share Now
                </button>
              </div>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
};
