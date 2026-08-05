/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  TrendingUp, 
  Users, 
  Receipt, 
  Calculator, 
  Tag, 
  UserCheck, 
  Wallet, 
  QrCode, 
  Layers, 
  Scissors, 
  Calendar, 
  Clock, 
  Eye, 
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  BarChart3,
  Sparkles,
  ChevronRight,
  Briefcase,
  Download,
  FileSpreadsheet,
  FileText,
  Coins
} from 'lucide-react';
import { db, DbBill, DbWorkerProfile } from '../../database/db';
import { ReceiptPreviewModal } from '../ReceiptPreviewModal';
import { 
  DateFilterType, 
  filterBillsByDate, 
  filterAdvancesByDate,
  computeWorkerReports, 
  computeServiceReports,
  computeBusinessFinancialSummary,
  computeWorkerAdvancesReport
} from '../../services/reportEngine';
import { WorkerReports } from './WorkerReports';
import { ServiceReports } from './ServiceReports';
import { AdvancedTrendsAndCharts } from './AdvancedTrendsAndCharts';
import { ExportsAndPrintSection } from './ExportsAndPrintSection';

export const BusinessDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trends' | 'workers' | 'services' | 'advances' | 'exports'>('dashboard');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  
  // Custom date range inputs YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const [customStart, setCustomStart] = useState<string>(todayStr);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  // Selected bill for receipt preview modal
  const [previewBill, setPreviewBill] = useState<DbBill | null>(null);

  // Live Queries from Dexie DB
  const allBills = useLiveQuery(() => db.bills.toArray(), []) || [];
  const allWorkerProfiles = useLiveQuery(() => db.workerProfiles.toArray(), []) || [];
  const allAttendanceRecords = useLiveQuery(() => db.attendanceRecords.toArray(), []) || [];
  const allProducts = useLiveQuery(() => db.products.toArray(), []) || [];
  const allAdvances = useLiveQuery(() => db.workerAdvances.toArray(), []) || [];
  const businessConfigs = useLiveQuery(() => db.businessConfigs.toArray(), []) || [];
  const businessInfo = businessConfigs[0] || null;

  // Filter bills using dynamic reporting engine
  const filteredBills = filterBillsByDate(allBills, dateFilter, customStart, customEnd);
  const filteredAdvances = filterAdvancesByDate(allAdvances, dateFilter, customStart, customEnd);

  // Compute reports in real time from filtered bills and advances
  const workerSummaries = computeWorkerReports(filteredBills, allWorkerProfiles, allAttendanceRecords);
  const serviceSummaries = computeServiceReports(filteredBills);
  const advancesReport = computeWorkerAdvancesReport(allAdvances, filteredAdvances, allWorkerProfiles);

  // Date filter label helper
  const getDateFilterLabel = (): string => {
    if (dateFilter === 'today') return 'Today';
    if (dateFilter === 'yesterday') return 'Yesterday';
    if (dateFilter === 'week') return 'This Week';
    if (dateFilter === 'month') return 'This Month';
    if (dateFilter === 'last_month') return 'Last Month';
    if (dateFilter === 'custom') return `${customStart} to ${customEnd}`;
    return 'All Time';
  };

  // --- KPI CALCULATIONS ---
  const financialSummary = computeBusinessFinancialSummary(filteredBills);
  const totalSales = financialSummary.netSales;
  const totalSubtotal = financialSummary.subtotal;
  const totalTips = financialSummary.totalTips;
  const totalBills = filteredBills.length;
  const avgBillValue = totalBills > 0 ? Math.round(totalSales / totalBills) : 0;
  const discountsGiven = financialSummary.totalDiscounts;

  // Distinct customer names or mobile numbers
  const uniqueCustomersSet = new Set<string>();
  filteredBills.forEach(b => {
    const custKey = (b.customerMobile || b.customerName || 'Walk-in Customer').trim().toLowerCase();
    uniqueCustomersSet.add(custKey);
  });
  const totalCustomers = uniqueCustomersSet.size;

  // Active workers count
  const activeWorkersInBills = new Set<string>();
  filteredBills.forEach(b => {
    if (b.workerName) activeWorkersInBills.add(b.workerName);
    else if (b.cashierName) activeWorkersInBills.add(b.cashierName);
  });
  const activeWorkersTodayCount = activeWorkersInBills.size > 0 
    ? activeWorkersInBills.size 
    : allWorkerProfiles.filter(w => w.status === 'ACTIVE').length;

  // --- PAYMENT SUMMARY BREAKDOWN ---
  let cashTxCount = 0;
  let cashTotalAmount = 0;
  let upiTxCount = 0;
  let upiTotalAmount = 0;
  let splitTxCount = 0;
  let splitTotalAmount = 0;

  filteredBills.forEach(b => {
    const mode = b.paymentMethod;
    if (mode === 'CASH') {
      cashTxCount++;
      cashTotalAmount += (b.grandTotal || 0);
    } else if (mode === 'UPI') {
      upiTxCount++;
      upiTotalAmount += (b.grandTotal || 0);
    } else if (mode === 'SPLIT') {
      splitTxCount++;
      splitTotalAmount += (b.grandTotal || 0);
      cashTotalAmount += (b.cashAmount || 0);
      upiTotalAmount += (b.upiAmount || 0);
    }
  });

  // Top services for dashboard summary card
  const topServices = serviceSummaries.slice(0, 5);

  // Recent transactions
  const recentBills = [...filteredBills]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 10);

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-12">
      {/* Top Header & Section Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-md">
            <BarChart3 size={13} />
            <span>Reports & Analytics</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Business Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time sales performance, payment channels, and service metrics.
          </p>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <Filter size={14} className="text-slate-400 ml-1.5 hidden sm:block" />
          
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateFilter === 'today'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Today
          </button>

          <button
            onClick={() => setDateFilter('yesterday')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateFilter === 'yesterday'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Yesterday
          </button>

          <button
            onClick={() => setDateFilter('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateFilter === 'week'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            This Week
          </button>

          <button
            onClick={() => setDateFilter('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateFilter === 'month'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            This Month
          </button>

          <button
            onClick={() => setDateFilter('last_month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateFilter === 'last_month'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Last Month
          </button>

          <button
            onClick={() => setDateFilter('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateFilter === 'custom'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Custom Range
          </button>
        </div>
      </div>

      {/* Custom Date Pickers (Shown if Custom is selected) */}
      {dateFilter === 'custom' && (
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/40 rounded-xl p-3.5 flex flex-wrap items-center gap-4 text-xs font-medium animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-slate-700 dark:text-slate-300">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold ml-auto">
            Showing {filteredBills.length} transaction(s)
          </span>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 size={16} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('trends')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'trends'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp size={16} />
          <span>Trends & Insights</span>
        </button>

        <button
          onClick={() => setActiveTab('workers')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'workers'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <Briefcase size={16} />
          <span>Worker Reports</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'services'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <Scissors size={16} />
          <span>Service Reports</span>
        </button>

        <button
          onClick={() => setActiveTab('advances')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'advances'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <Coins size={16} />
          <span>Worker Advances</span>
        </button>

        <button
          onClick={() => setActiveTab('exports')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'exports'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <Download size={16} />
          <span>Exports & Print</span>
        </button>
      </div>

      {/* TAB CONTENT 1: TRENDS & INSIGHTS */}
      {activeTab === 'trends' && (
        <AdvancedTrendsAndCharts
          filteredBills={filteredBills}
          workerSummaries={workerSummaries}
          serviceSummaries={serviceSummaries}
          dateFilterLabel={getDateFilterLabel()}
        />
      )}

      {/* TAB CONTENT 2: WORKER REPORTS */}
      {activeTab === 'workers' && (
        <WorkerReports 
          workerSummaries={workerSummaries} 
          allWorkerProfiles={allWorkerProfiles} 
        />
      )}

      {/* TAB CONTENT 3: SERVICE REPORTS */}
      {activeTab === 'services' && (
        <ServiceReports 
          serviceSummaries={serviceSummaries} 
        />
      )}

      {/* TAB CONTENT 4: WORKER ADVANCES */}
      {activeTab === 'advances' && (
        <div className="space-y-6">
          {/* ADVANCES KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Advances Given ({getDateFilterLabel()})</span>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                ₹{advancesReport.totalGivenInPeriod.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-slate-400">Total advances disbursed in selected period</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Advances Recovered ({getDateFilterLabel()})</span>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <ArrowDownRight size={18} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                ₹{advancesReport.totalRecoveredInPeriod.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-slate-400">Total advance recoveries collected in period</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Period Balance</span>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Coins size={18} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                ₹{advancesReport.netAdvanceBalanceInPeriod.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-slate-400">Given minus Recovered in period</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Outstanding (All Time)</span>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
                  <Wallet size={18} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                ₹{advancesReport.totalOutstandingAllTime.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-slate-400">Cumulative unrecovered advances across all workers</p>
            </div>
          </div>

          {/* WORKER-WISE SUMMARY TABLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Briefcase size={16} className="text-indigo-600 dark:text-indigo-400" />
                  Worker-wise Advance Summary
                </h3>
                <p className="text-xs text-slate-400">Advances given, recovered and cumulative outstanding per staff member</p>
              </div>
            </div>

            {advancesReport.workerSummaries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No worker advance records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="p-3">Worker Name</th>
                      <th className="p-3">Given ({getDateFilterLabel()})</th>
                      <th className="p-3">Recovered ({getDateFilterLabel()})</th>
                      <th className="p-3">Net Period Balance</th>
                      <th className="p-3">Total Outstanding (All Time)</th>
                      <th className="p-3 text-right">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {advancesReport.workerSummaries.map((w) => (
                      <tr key={w.workerId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{w.workerName}</td>
                        <td className="p-3 text-amber-600 dark:text-amber-400 font-mono font-bold">₹{w.advancesGiven.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-emerald-600 dark:text-emerald-400 font-mono font-bold">₹{w.advancesRecovered.toLocaleString('en-IN')}</td>
                        <td className="p-3 font-mono font-bold">
                          <span className={w.netBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600'}>
                            ₹{w.netBalance.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold">
                          <span className={w.totalOutstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}>
                            ₹{w.totalOutstanding.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="p-3 text-right text-slate-500 font-mono">{w.transactionCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* DATE-WISE SUMMARY TABLE */}
          {advancesReport.dateSummaries.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
                    Date-wise Advance Summary
                  </h3>
                  <p className="text-xs text-slate-400">Daily breakdown of advance cash movements</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="p-3">Date</th>
                      <th className="p-3">Advances Given</th>
                      <th className="p-3">Advances Recovered</th>
                      <th className="p-3">Net Balance</th>
                      <th className="p-3 text-right">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {advancesReport.dateSummaries.map((d) => (
                      <tr key={d.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{d.date}</td>
                        <td className="p-3 text-amber-600 dark:text-amber-400 font-mono font-bold">₹{d.given.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-emerald-600 dark:text-emerald-400 font-mono font-bold">₹{d.recovered.toLocaleString('en-IN')}</td>
                        <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">₹{d.net.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right text-slate-500 font-mono">{d.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ADVANCE TRANSACTIONS LOG */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
                  Advance Transactions Log
                </h3>
                <p className="text-xs text-slate-400">Detailed history of all advance payments and recoveries</p>
              </div>
            </div>

            {advancesReport.transactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No advance transactions recorded for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Worker Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Reason / Notes</th>
                      <th className="p-3 text-right">Created By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {advancesReport.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-slate-500 font-mono">{tx.date} {tx.time}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{tx.workerName}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            tx.type === 'GIVE' 
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' 
                              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {tx.type === 'GIVE' ? 'GIVEN' : 'RECOVERED'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">₹{tx.amount.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">{tx.notes || tx.reason || '-'}</td>
                        <td className="p-3 text-right text-slate-400 text-[11px]">{tx.createdBy || 'Owner'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: EXPORTS & PRINT */}
      {activeTab === 'exports' && (
        <ExportsAndPrintSection
          businessInfo={businessInfo}
          dateFilterLabel={getDateFilterLabel()}
          filteredBills={filteredBills}
          workerSummaries={workerSummaries}
          serviceSummaries={serviceSummaries}
          products={allProducts}
          advancesReport={advancesReport}
          totalSales={totalSales}
          totalBills={totalBills}
          avgBillValue={avgBillValue}
          discountsGiven={discountsGiven}
          totalCustomers={totalCustomers}
        />
      )}

      {/* DASHBOARD TAB CONTENT */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {/* Card 1: Net Sales */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2 relative overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sales</span>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  ₹{totalSales.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Net collected sales</span>
              </div>
            </div>

            {/* Card 2: Total Staff Tips */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2 relative overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staff Tips</span>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Coins size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                  ₹{totalTips.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Tips collected for staff</span>
              </div>
            </div>

            {/* Card 3: Total Customers */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2 relative overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Customers</span>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Users size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {totalCustomers}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Unique visitors</span>
              </div>
            </div>

            {/* Card 4: Total Bills */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2 relative overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bills</span>
                <div className="p-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Receipt size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {totalBills}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Completed receipts</span>
              </div>
            </div>

            {/* Card 5: Avg Bill Value */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2 relative overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Bill Value</span>
                <div className="p-2 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl">
                  <Calculator size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  ₹{avgBillValue.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Per checkout ticket</span>
              </div>
            </div>

            {/* Card 6: Discounts Given */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2 relative overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Discounts Given</span>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Tag size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  ₹{discountsGiven.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Promotional concessions</span>
              </div>
            </div>

            {/* Card 7: Active Workers Today */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2 relative overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Workers</span>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
                  <UserCheck size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {activeWorkersTodayCount}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Workers active in period</span>
              </div>
            </div>
          </div>

          {/* MIDDLE SECTION: PAYMENT BREAKDOWN & TOP SERVICES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PAYMENT SUMMARY */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Wallet size={16} className="text-indigo-600 dark:text-indigo-400" />
                  Payment Summary
                </h2>
                <span className="text-[10px] text-slate-400 font-mono">
                  Total: ₹{totalSales.toLocaleString('en-IN')}
                </span>
              </div>

              {filteredBills.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No transaction payment records found for this period.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* CASH */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-850 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                        <Wallet size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-white">Cash Payment</div>
                        <div className="text-[10px] text-slate-400">{cashTxCount} transaction(s)</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                        ₹{cashTotalAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {totalSales > 0 ? `${Math.round((cashTotalAmount / totalSales) * 100)}% of sales` : '0%'}
                      </div>
                    </div>
                  </div>

                  {/* UPI */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-850 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-lg flex items-center justify-center shrink-0">
                        <QrCode size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-white">UPI / QR Payment</div>
                        <div className="text-[10px] text-slate-400">{upiTxCount} transaction(s)</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                        ₹{upiTotalAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {totalSales > 0 ? `${Math.round((upiTotalAmount / totalSales) * 100)}% of sales` : '0%'}
                      </div>
                    </div>
                  </div>

                  {/* SPLIT PAYMENT */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-850 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center shrink-0">
                        <Layers size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-white">Split Payment (Cash + UPI)</div>
                        <div className="text-[10px] text-slate-400">{splitTxCount} transaction(s)</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                        ₹{splitTotalAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Combined split transactions
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* TOP SERVICES */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Scissors size={16} className="text-indigo-600 dark:text-indigo-400" />
                  Top Performed Services & Items
                </h2>
                <span className="text-[10px] text-slate-400">
                  By Revenue
                </span>
              </div>

              {topServices.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No service records found for this period.
                </div>
              ) : (
                <div className="space-y-3">
                  {topServices.map((svc, idx) => {
                    const percentage = totalSales > 0 ? Math.min(100, Math.round((svc.revenueGenerated / totalSales) * 100)) : 0;
                    return (
                      <div key={svc.serviceName} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-white truncate max-w-[160px] sm:max-w-xs">
                              {svc.serviceName}
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              ₹{svc.revenueGenerated.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-2">
                              ({svc.timesPerformed}x)
                            </span>
                          </div>
                        </div>

                        {/* Visual Progress bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all duration-300" 
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* WORKER ADVANCES SUMMARY WIDGET ON DASHBOARD */}
          <div className="bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900/90 border border-amber-200/80 dark:border-amber-900/30 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Coins size={16} className="text-amber-600 dark:text-amber-400" />
                  Worker Advances Financial Status
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Employee cash movements & advance balances (Excluded from Sales, Revenue & Profit)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('advances')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs"
              >
                <span>Full Worker Advance Report</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-950/60 border border-amber-100 dark:border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Advances Given</span>
                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                  ₹{advancesReport.todayGiven.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-slate-400">Disbursed to staff today</span>
              </div>

              <div className="bg-white dark:bg-slate-950/60 border border-emerald-100 dark:border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Recoveries</span>
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  ₹{advancesReport.todayRecovered.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-slate-400">Collected from staff today</span>
              </div>

              <div className="bg-white dark:bg-slate-950/60 border border-rose-100 dark:border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Outstanding Advances</span>
                <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                  ₹{advancesReport.totalOutstandingAllTime.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-slate-400">Cumulative unrecovered balance (All Time)</span>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: RECENT TRANSACTIONS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Receipt size={16} className="text-indigo-600 dark:text-indigo-400" />
                  Recent Transactions
                </h2>
                <p className="text-[10px] text-slate-400">
                  Tap any transaction to view the complete printed receipt.
                </p>
              </div>

              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg font-mono font-bold">
                {recentBills.length} displayed
              </span>
            </div>

            {recentBills.length === 0 ? (
              <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No transactions found.</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  No billing records match the selected date filter. Complete new transactions in the POS terminal to populate this dashboard.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-2.5 pl-2">Invoice No</th>
                      <th className="pb-2.5">Customer</th>
                      <th className="pb-2.5">Assigned Worker</th>
                      <th className="pb-2.5">Payment</th>
                      <th className="pb-2.5 text-right">Amount</th>
                      <th className="pb-2.5 text-right pr-2">Date & Time</th>
                      <th className="pb-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {recentBills.map((bill) => (
                      <tr 
                        key={bill.id} 
                        onClick={() => setPreviewBill(bill)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 pl-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {bill.billNumber || bill.id}
                        </td>
                        <td className="py-3 font-medium text-slate-800 dark:text-white">
                          {bill.customerName || 'Walk-in Customer'}
                          {bill.customerMobile ? (
                            <span className="text-[10px] text-slate-400 block font-normal">{bill.customerMobile}</span>
                          ) : null}
                        </td>
                        <td className="py-3 font-bold text-slate-700 dark:text-slate-300">
                          {bill.workerName || bill.cashierName || 'Staff'}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                            bill.paymentMethod === 'CASH' 
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : bill.paymentMethod === 'UPI'
                              ? 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                              : 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                          }`}>
                            {bill.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                          ₹{(bill.grandTotal || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 text-right text-[11px] text-slate-500 pr-2">
                          <div>{bill.date}</div>
                          <div className="text-[9px] text-slate-400">{bill.time}</div>
                        </td>
                        <td className="py-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewBill(bill);
                            }}
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-400 rounded-lg text-slate-500 transition-colors cursor-pointer"
                            title="View Printed Receipt"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {previewBill && (
        <ReceiptPreviewModal
          bill={previewBill}
          onClose={() => setPreviewBill(null)}
        />
      )}
    </div>
  );
};
