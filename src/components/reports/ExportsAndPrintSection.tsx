/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Share2, 
  MessageSquare, 
  Mail, 
  Copy, 
  Check, 
  Sparkles, 
  Briefcase, 
  Scissors, 
  Package, 
  BarChart3,
  Layers,
  Coins
} from 'lucide-react';
import { DbBill, DbProduct, DbBusinessConfig } from '../../database/db';
import { WorkerReportSummary, ServiceReportSummary, WorkerAdvancesReportData } from '../../services/reportEngine';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ExportReportType, 
  ExportFormat, 
  ExportDataPayload, 
  handleReportExport, 
  triggerReportPrint, 
  shareReport 
} from '../../services/exportService';

interface ExportsAndPrintSectionProps {
  businessInfo?: DbBusinessConfig | null;
  dateFilterLabel: string;
  filteredBills: DbBill[];
  workerSummaries: WorkerReportSummary[];
  serviceSummaries: ServiceReportSummary[];
  products: DbProduct[];
  advancesReport?: WorkerAdvancesReportData;
  totalSales: number;
  totalBills: number;
  avgBillValue: number;
  discountsGiven: number;
  totalCustomers: number;
}

export const ExportsAndPrintSection: React.FC<ExportsAndPrintSectionProps> = ({
  businessInfo,
  dateFilterLabel,
  filteredBills,
  workerSummaries,
  serviceSummaries,
  products,
  advancesReport,
  totalSales,
  totalBills,
  avgBillValue,
  discountsGiven,
  totalCustomers
}) => {
  const { user } = useAuth();
  const [selectedReportType, setSelectedReportType] = useState<ExportReportType>('complete');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [printLayout, setPrintLayout] = useState<'a4' | 'thermal'>('a4');
  const [isCopied, setIsCopied] = useState(false);

  const payload: ExportDataPayload = {
    businessInfo,
    dateFilterLabel,
    filteredBills,
    workerSummaries,
    serviceSummaries,
    products,
    advancesReport,
    totalSales,
    totalBills,
    avgBillValue,
    discountsGiven,
    totalCustomers,
    userInfo: {
      role: user?.role,
      id: user?.id,
      fullName: user?.fullName
    }
  };

  const onExportClick = () => {
    handleReportExport(selectedReportType, selectedFormat, payload);
  };

  const onPrintClick = () => {
    triggerReportPrint(printLayout, payload);
  };

  const onShareClick = (channel: 'whatsapp' | 'email' | 'native' | 'copy') => {
    shareReport(channel, payload);
    if (channel === 'copy') {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-800/50 rounded-2xl p-6 text-white shadow-sm space-y-2">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
          <Sparkles size={12} />
          <span>Sprint 3.3 • Professional Exports & Print</span>
        </div>
        <h2 className="text-xl font-bold">
          Report Downloads & Multi-Channel Sharing
        </h2>
        <p className="text-xs text-indigo-200/80 max-w-xl leading-relaxed">
          Export full business performance metrics, worker commission sheets, service breakdowns, and product inventory as PDF, Excel (.xlsx), or CSV. Print formatted thermal receipts or share directly via WhatsApp & Email.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: DOCUMENT EXPORT CONTROL */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Download size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Download Business Reports
              </h3>
              <p className="text-[11px] text-slate-400">
                Respects selected date range: <strong className="text-indigo-600 dark:text-indigo-400">{dateFilterLabel}</strong>
              </p>
            </div>
          </div>

          {/* STEP 1: SELECT REPORT TYPE */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              1. Select Report Content
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedReportType('complete')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 ${
                  selectedReportType === 'complete'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Layers size={16} />
                <div>
                  <div className="block">Complete Business Report</div>
                  <span className="text-[10px] text-slate-400 font-normal">All metrics, staff, services & inventory</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReportType('dashboard')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 ${
                  selectedReportType === 'dashboard'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <BarChart3 size={16} />
                <div>
                  <div className="block">Dashboard Summary</div>
                  <span className="text-[10px] text-slate-400 font-normal">KPIs, totals & transaction log</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReportType('workers')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 ${
                  selectedReportType === 'workers'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Briefcase size={16} />
                <div>
                  <div className="block">Worker Reports</div>
                  <span className="text-[10px] text-slate-400 font-normal">Staff sales, commission & days</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReportType('services')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 ${
                  selectedReportType === 'services'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Scissors size={16} />
                <div>
                  <div className="block">Service Reports</div>
                  <span className="text-[10px] text-slate-400 font-normal">Top services & revenue breakdown</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReportType('products')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 ${
                  selectedReportType === 'products'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Package size={16} />
                <div>
                  <div className="block">Product Inventory Report</div>
                  <span className="text-[10px] text-slate-400 font-normal">Current stock levels, pricing & alerts</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReportType('advances')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 ${
                  selectedReportType === 'advances'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Coins size={16} />
                <div>
                  <div className="block">Worker Advances Report</div>
                  <span className="text-[10px] text-slate-400 font-normal">Given, recovered & outstanding balances</span>
                </div>
              </button>
            </div>
          </div>

          {/* STEP 2: SELECT FORMAT */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              2. Choose File Format
            </label>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSelectedFormat('pdf')}
                className={`py-3 px-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  selectedFormat === 'pdf'
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileText size={18} />
                <span>PDF Document</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('excel')}
                className={`py-3 px-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  selectedFormat === 'excel'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileSpreadsheet size={18} />
                <span>Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('csv')}
                className={`py-3 px-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  selectedFormat === 'csv'
                    ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileText size={18} />
                <span>CSV Sheet</span>
              </button>
            </div>
          </div>

          {/* ACTION BUTTON */}
          <button
            type="button"
            onClick={onExportClick}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            <Download size={16} />
            <span>Generate & Download {selectedFormat.toUpperCase()}</span>
          </button>
        </div>

        {/* CARD 2: PRINTING & SOCIAL SHARING */}
        <div className="space-y-6">
          {/* PRINT REPORTS BOX */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
                <Printer size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Print Reports
                </h3>
                <p className="text-[11px] text-slate-400">Print-friendly layouts for physical printers</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPrintLayout('a4')}
                className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                  printLayout === 'a4'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                📄 Standard A4 Paper
              </button>

              <button
                type="button"
                onClick={() => setPrintLayout('thermal')}
                className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                  printLayout === 'thermal'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                🧾 Thermal Slip (80mm)
              </button>
            </div>

            <button
              type="button"
              onClick={onPrintClick}
              className="w-full h-10 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Printer size={15} />
              <span>Print ({printLayout.toUpperCase()} Layout)</span>
            </button>
          </div>

          {/* SHARING BOX */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Share2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Share Report Summary
                </h3>
                <p className="text-[11px] text-slate-400">Instantly dispatch summary to owner or manager</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => onShareClick('whatsapp')}
                className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <MessageSquare size={15} />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => onShareClick('email')}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Mail size={15} />
                <span>Email</span>
              </button>

              <button
                type="button"
                onClick={() => onShareClick('native')}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all col-span-2 sm:col-span-1"
              >
                <Share2 size={15} />
                <span>Native Share</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onShareClick('copy')}
              className="w-full h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{isCopied ? 'Report Text Copied!' : 'Copy Summary to Clipboard'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
