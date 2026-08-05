/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Briefcase, 
  Trophy, 
  TrendingUp, 
  Receipt, 
  UserCheck, 
  Wallet, 
  Scissors, 
  Calendar, 
  Clock, 
  Eye, 
  X, 
  ChevronRight, 
  Award,
  Phone,
  DollarSign,
  Tag,
  QrCode,
  Layers,
  Sparkles,
  Filter,
  Download
} from 'lucide-react';
import { DbBill, DbWorkerProfile, DbAttendanceRecord } from '../../database/db';
import { WorkerReportSummary } from '../../services/reportEngine';
import { ReceiptPreviewModal } from '../ReceiptPreviewModal';
import { useAuth } from '../../contexts/AuthContext';
import { exportSingleWorkerReport } from '../../services/exportService';

interface WorkerReportsProps {
  workerSummaries: WorkerReportSummary[];
  allWorkerProfiles: DbWorkerProfile[];
}

export const WorkerReports: React.FC<WorkerReportsProps> = ({
  workerSummaries,
  allWorkerProfiles
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [rankingMetric, setRankingMetric] = useState<'sales' | 'customers' | 'bills'>('sales');

  // Selected worker for detailed modal
  const [selectedWorker, setSelectedWorker] = useState<WorkerReportSummary | null>(null);

  // Selected bill for receipt preview
  const [previewBill, setPreviewBill] = useState<DbBill | null>(null);

  // Extract unique roles for filter dropdown
  const uniqueRoles = Array.from(new Set(allWorkerProfiles.map(w => w.role))).filter(Boolean);

  // Filter workers by search term and role
  const filteredWorkers = workerSummaries.filter(w => {
    const matchesSearch = w.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          w.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRoleFilter === 'ALL' || w.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Ranked Top Workers
  const rankedWorkers = [...workerSummaries].sort((a, b) => {
    if (rankingMetric === 'sales') return b.totalSales - a.totalSales;
    if (rankingMetric === 'customers') return b.customersServed - a.customersServed;
    if (rankingMetric === 'bills') return b.totalBills - a.totalBills;
    return 0;
  }).slice(0, 3);

  return (
    <div className="space-y-6 font-sans">
      {/* HEADER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search worker by name or role..."
            className="w-full h-10 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400 shrink-0" />
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Roles ({allWorkerProfiles.length})</option>
            {uniqueRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TOP WORKERS LEADERBOARD RANKINGS */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 border border-indigo-800/50 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/50 pb-3">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Top Performers Leaderboard
            </h2>
          </div>

          <div className="flex items-center gap-1.5 bg-indigo-950/80 p-1 rounded-xl border border-indigo-800/60">
            <span className="text-[10px] text-indigo-300 px-2 font-medium">Rank by:</span>
            <button
              onClick={() => setRankingMetric('sales')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                rankingMetric === 'sales'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              Sales
            </button>
            <button
              onClick={() => setRankingMetric('customers')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                rankingMetric === 'customers'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              Customers
            </button>
            <button
              onClick={() => setRankingMetric('bills')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                rankingMetric === 'bills'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              Bills
            </button>
          </div>
        </div>

        {rankedWorkers.length === 0 ? (
          <div className="py-6 text-center text-xs text-indigo-200">
            No worker performance records in this date range.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rankedWorkers.map((w, idx) => {
              const medalColor = idx === 0 
                ? 'from-amber-400 to-amber-600 text-slate-950' 
                : idx === 1 
                ? 'from-slate-300 to-slate-400 text-slate-950' 
                : 'from-amber-700 to-amber-900 text-amber-100';

              return (
                <div 
                  key={`rank-${w.workerId}-${idx}`}
                  onClick={() => setSelectedWorker(w)}
                  className="bg-slate-900/80 border border-indigo-700/50 hover:border-amber-400/80 rounded-xl p-3.5 space-y-2 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-6 h-6 rounded-lg bg-gradient-to-br ${medalColor} font-mono font-black text-xs flex items-center justify-center shadow-xs`}>
                      #{idx + 1}
                    </span>
                    <span className="text-[10px] text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded font-mono">
                      {w.role}
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-white truncate">{w.workerName}</div>
                    <div className="text-[11px] text-amber-300 font-mono font-extrabold mt-0.5">
                      ₹{w.totalSales.toLocaleString('en-IN')} Sales
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-indigo-200 pt-1 border-t border-indigo-800/40">
                    <span>{w.customersServed} Customers</span>
                    <span>{w.totalBills} Bills</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WORKERS CARDS GRID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
            Worker Performance Directory
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">
            {filteredWorkers.length} worker(s) found
          </span>
        </div>

        {filteredWorkers.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-2">
            <Users size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No worker activity found.</p>
            <p className="text-[11px] text-slate-400">
              No workers match your search criteria or date filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkers.map((w) => (
              <div
                key={w.workerId}
                onClick={() => setSelectedWorker(w)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-4 shadow-xs space-y-3 cursor-pointer transition-all hover:shadow-md group"
              >
                {/* Worker Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
                      {w.workerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {w.workerName}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {w.role}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    w.status === 'ACTIVE'
                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                  }`}>
                    {w.status}
                  </span>
                </div>

                {/* Worker Key Metrics */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-850 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Sales</span>
                    <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">
                      ₹{w.totalSales.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Customers</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {w.customersServed} served
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Bills</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {w.totalBills} receipts
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Avg Bill</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      ₹{w.avgBillValue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Extra Commission & Wage Info */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                  {w.commissionPercentage ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Comm ({w.commissionPercentage}%): ₹{w.commissionEarned.toLocaleString('en-IN')}
                    </span>
                  ) : w.dailyWage ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                      Wage: ₹{w.dailyWage}/day
                    </span>
                  ) : (
                    <span>Working Days: {w.workingDays}</span>
                  )}

                  <span className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                    View Details
                    <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WORKER DETAILS MODAL */}
      {selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                  {selectedWorker.workerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {selectedWorker.workerName}
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-medium">
                      {selectedWorker.role}
                    </span>
                  </h2>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                    {selectedWorker.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {selectedWorker.phone}
                      </span>
                    )}
                    <span>Status: {selectedWorker.status}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    exportSingleWorkerReport(
                      selectedWorker,
                      'pdf',
                      'Current Period',
                      null,
                      { role: user?.role, id: user?.id, fullName: user?.fullName }
                    );
                  }}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-[11px] font-bold flex items-center gap-1 hover:bg-indigo-100 transition-all cursor-pointer"
                >
                  <Download size={13} />
                  <span>Export Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedWorker(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-850">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Revenue</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  ₹{selectedWorker.totalSales.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-850">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Customers Served</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  {selectedWorker.customersServed}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-850">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Bills Completed</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  {selectedWorker.totalBills}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-850">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Avg Bill Value</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  ₹{selectedWorker.avgBillValue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Compensation Details */}
            <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-150 dark:border-indigo-900/40 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Compensation:</span>
                {selectedWorker.dailyWage ? (
                  <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 font-bold text-indigo-600 dark:text-indigo-400">
                    Wage: ₹{selectedWorker.dailyWage}/day
                  </span>
                ) : null}
                {selectedWorker.commissionPercentage ? (
                  <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-bold text-emerald-600 dark:text-emerald-400">
                    Comm ({selectedWorker.commissionPercentage}%): ₹{selectedWorker.commissionEarned.toLocaleString('en-IN')}
                  </span>
                ) : null}
                {!selectedWorker.dailyWage && !selectedWorker.commissionPercentage && (
                  <span className="text-slate-400">Standard salaried employee</span>
                )}
              </div>

              <div className="text-slate-500 font-medium">
                Active Working Days: <strong>{selectedWorker.workingDays} day(s)</strong>
              </div>
            </div>

            {/* Payment Method Breakdown & Top Services */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Methods */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet size={15} className="text-indigo-600 dark:text-indigo-400" />
                  Payment Channel Breakdown
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Cash Payments ({selectedWorker.cashTxCount})</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">₹{selectedWorker.cashSales.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-300">UPI Payments ({selectedWorker.upiTxCount})</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">₹{selectedWorker.upiSales.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Split Payments ({selectedWorker.splitTxCount})</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">₹{selectedWorker.splitSales.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Top Services Performed */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors size={15} className="text-indigo-600 dark:text-indigo-400" />
                  Top Performed Services ({selectedWorker.servicesPerformed.length})
                </h3>

                {selectedWorker.servicesPerformed.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center">No service records found.</div>
                ) : (
                  <div className="space-y-2 text-xs max-h-36 overflow-y-auto pr-1">
                    {selectedWorker.servicesPerformed.slice(0, 5).map((svc) => (
                      <div key={svc.name} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="font-medium text-slate-800 dark:text-white truncate max-w-[140px]">{svc.name}</span>
                        <div className="font-mono text-right">
                          <span className="font-bold text-slate-900 dark:text-white">₹{svc.revenue.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">({svc.count}x)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Worker Recent Transactions */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Receipt size={15} className="text-indigo-600 dark:text-indigo-400" />
                Recent Worker Transactions ({selectedWorker.transactions.length})
              </h3>

              {selectedWorker.transactions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No completed transactions for this worker in selected date range.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2 px-3">Invoice No</th>
                        <th className="py-2 px-3">Customer</th>
                        <th className="py-2 px-3">Payment</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                        <th className="py-2 px-3 text-right">Date & Time</th>
                        <th className="py-2 px-3 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {selectedWorker.transactions.map((bill) => (
                        <tr 
                          key={bill.id}
                          onClick={() => setPreviewBill(bill)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {bill.billNumber || bill.id}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-white">
                            {bill.customerName || 'Walk-in'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {bill.paymentMethod}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ₹{(bill.grandTotal || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[10px] text-slate-400">
                            {bill.date} {bill.time}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewBill(bill);
                              }}
                              className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-md cursor-pointer"
                            >
                              <Eye size={13} />
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
        </div>
      )}

      {/* Receipt Modal */}
      {previewBill && (
        <ReceiptPreviewModal
          bill={previewBill}
          onClose={() => setPreviewBill(null)}
        />
      )}
    </div>
  );
};
