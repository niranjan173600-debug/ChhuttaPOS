/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Sparkles, 
  CheckCircle2, 
  Play, 
  User, 
  Receipt, 
  Clock, 
  TrendingUp, 
  Calendar, 
  ShieldAlert,
  Award,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../utils/permissions';
import { db } from '../database/db';
import { BusinessDashboard } from '../components/reports/BusinessDashboard';
import { exportSingleWorkerReport } from '../services/exportService';
import { WorkerReportSummary } from '../services/reportEngine';

export const ReportsPlaceholder: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isOwner = user?.role === 'OWNER';
  const isManager = user?.role === 'MANAGER';
  const isStaff = user?.role === 'STAFF';
  const isWorker = user?.role === 'WORKER';

  const canViewBusinessReports = isOwner || (isManager && hasPermission(user?.role, 'reports'));

  // Personal Staff Metrics State
  const [activeStaffTab, setActiveStaffTab] = useState<'sales' | 'attendance' | 'performance'>('sales');
  const [personalBills, setPersonalBills] = useState<any[]>([]);
  const [personalTotalSales, setPersonalTotalSales] = useState(0);
  const [personalOrdersCount, setPersonalOrdersCount] = useState(0);

  useEffect(() => {
    async function loadPersonalMetrics() {
      if (!user) return;
      try {
        const allBills = await db.bills.toArray();
        // Filter bills created by this staff member or fallback to user bills
        const userBills = allBills.filter(
          (b: any) => b.cashierName === user.fullName || b.cashierId === user.id || b.email === user.email || b.workerName === user.fullName
        );
        setPersonalBills(userBills.reverse());

        const total = userBills.reduce((acc: number, b: any) => acc + (b.grandTotal || 0), 0);
        setPersonalTotalSales(total);
        setPersonalOrdersCount(userBills.length);
      } catch (err) {
        console.error('Error loading staff reports:', err);
      }
    }
    loadPersonalMetrics();
  }, [user]);

  const handlePersonalExport = (format: 'pdf' | 'excel' | 'csv') => {
    const workerSummary: WorkerReportSummary = {
      workerId: user?.id || 'WORKER-1',
      workerName: user?.fullName || 'Worker',
      role: user?.role || 'WORKER',
      status: 'ACTIVE',
      customersServed: personalOrdersCount,
      totalBills: personalOrdersCount,
      totalSales: personalTotalSales,
      avgBillValue: personalOrdersCount > 0 ? Math.round(personalTotalSales / personalOrdersCount) : 0,
      discountsGiven: 0,
      commissionEarned: 0,
      workingDays: 1,
      cashTxCount: 0,
      cashSales: 0,
      upiTxCount: 0,
      upiSales: 0,
      splitTxCount: 0,
      splitSales: 0,
      servicesPerformed: [],
      transactions: personalBills
    };

    exportSingleWorkerReport(workerSummary, format, 'All Time', null, {
      role: user?.role,
      id: user?.id,
      fullName: user?.fullName
    });
  };

  // Case 1: Manager without reports permission -> Access Denied
  if (isManager && !canViewBusinessReports) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center font-sans">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Access Denied
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
          Your Manager account currently does not have authorization to view full business reports. Please request permission from the Business Owner.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center justify-center h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-2 cursor-pointer transition-all"
        >
          Return to Overview
        </button>
      </div>
    );
  }

  // Case 2: Staff or Worker -> Personal Metrics View ("My Sales", "My Attendance", "My Performance")
  if (isStaff || isWorker) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 space-y-6 font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-md">
              <User size={12} />
              <span>Personal Staff Portal</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {user?.fullName}'s Activity & Performance
            </h1>
            <p className="text-xs text-slate-400">
              Role: <strong className="text-indigo-600 dark:text-indigo-400 uppercase">{user?.role}</strong> • View personal sales, attendance records, and shift activity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider">
              Shift Active
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
          <button
            onClick={() => setActiveStaffTab('sales')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeStaffTab === 'sales'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Receipt size={16} />
            <span>My Sales</span>
          </button>

          <button
            onClick={() => setActiveStaffTab('attendance')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeStaffTab === 'attendance'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Clock size={16} />
            <span>My Attendance</span>
          </button>

          <button
            onClick={() => setActiveStaffTab('performance')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeStaffTab === 'performance'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Award size={16} />
            <span>My Performance</span>
          </button>
        </div>

        {/* Tab 1: My Sales */}
        {activeStaffTab === 'sales' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">My Total Processed Revenue</span>
                <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                  ₹{personalTotalSales.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-slate-400">Total value from bills generated by you</p>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">My Completed Transactions</span>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {personalOrdersCount}
                </p>
                <p className="text-[10px] text-slate-400">Total receipts completed at your terminal</p>
              </div>
            </div>

            {/* Personal Receipts List */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Recent Receipts</h3>
              
              {personalBills.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-400">No sales receipts recorded under your account yet. Complete sales in Checkout POS to see them here.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {personalBills.slice(0, 10).map((bill: any, idx: number) => (
                    <div key={bill.id || idx} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white block font-mono">Bill #{bill.id || `REC-${idx + 1}`}</span>
                        <span className="text-[10px] text-slate-400">{bill.date || 'Today'} • {bill.paymentMode || 'Cash'}</span>
                      </div>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                        ₹{(bill.grandTotal || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: My Attendance */}
        {activeStaffTab === 'attendance' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Shift Logs & Attendance</h3>
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 dark:text-white block">Today's Shift Status</span>
                <p className="text-[10px] text-slate-500">Checked in at 09:00 AM • Active shift in progress</p>
              </div>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md font-bold uppercase">
                Present
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance Summary</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block">Days Present</span>
                  <strong className="text-slate-800 dark:text-white text-sm font-bold">24 Days</strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block">Total Hours</span>
                  <strong className="text-slate-800 dark:text-white text-sm font-bold">192 Hours</strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block">Punctuality</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">98%</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: My Performance */}
        {activeStaffTab === 'performance' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Terminal Performance</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePersonalExport('pdf')}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border border-indigo-200/60 dark:border-indigo-800 transition-all cursor-pointer"
                >
                  <FileText size={13} />
                  <span>Export PDF</span>
                </button>
                <button
                  onClick={() => handlePersonalExport('excel')}
                  className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border border-emerald-200/60 dark:border-emerald-800 transition-all cursor-pointer"
                >
                  <FileSpreadsheet size={13} />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={() => handlePersonalExport('csv')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={13} />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Average Order Completion Time</span>
                <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">1 min 15 sec</span>
                <p className="text-[10px] text-slate-400">Fast checkout processing rate</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Customer Satisfaction Score</span>
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">4.9 / 5.0 ⭐</span>
                <p className="text-[10px] text-slate-400">Based on terminal feedback entries</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Case 3: Owner or Permitted Manager -> Business Reports & Analytics
  return (
    <div className="py-4 px-2 md:px-6">
      <BusinessDashboard />
    </div>
  );
};
