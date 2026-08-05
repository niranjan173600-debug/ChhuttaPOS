/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Award, 
  Scissors, 
  Clock, 
  Wallet, 
  Users, 
  Receipt, 
  Tag, 
  Sparkles, 
  HelpCircle, 
  BarChart3, 
  Layers, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { DbBill, DbWorkerProfile } from '../../database/db';
import { WorkerReportSummary, ServiceReportSummary } from '../../services/reportEngine';
import { 
  computeDailyTrend, 
  computeCategoryBreakdown, 
  computePaymentDistribution, 
  computeBusinessInsights 
} from '../../services/reportInsightsEngine';

interface AdvancedTrendsAndChartsProps {
  filteredBills: DbBill[];
  workerSummaries: WorkerReportSummary[];
  serviceSummaries: ServiceReportSummary[];
  dateFilterLabel: string;
}

export const AdvancedTrendsAndCharts: React.FC<AdvancedTrendsAndChartsProps> = ({
  filteredBills,
  workerSummaries,
  serviceSummaries,
  dateFilterLabel
}) => {
  const [salesTrendGrouping, setSalesTrendGrouping] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Compute dataset
  const dailyTrends = computeDailyTrend(filteredBills);
  const categoryData = computeCategoryBreakdown(filteredBills);
  const paymentData = computePaymentDistribution(filteredBills);
  const insights = computeBusinessInsights(filteredBills, workerSummaries, serviceSummaries);

  // Prepare top workers chart data
  const topWorkersData = workerSummaries.slice(0, 6).map(w => ({
    name: w.workerName.length > 12 ? w.workerName.substring(0, 10) + '...' : w.workerName,
    fullName: w.workerName,
    sales: w.totalSales,
    bills: w.totalBills
  }));

  // Prepare top services chart data
  const topServicesData = serviceSummaries.slice(0, 6).map(s => ({
    name: s.serviceName.length > 14 ? s.serviceName.substring(0, 12) + '...' : s.serviceName,
    fullName: s.serviceName,
    revenue: s.revenueGenerated,
    count: s.timesPerformed
  }));

  const COLORS = ['#4f46e5', '#10b981', '#0284c7', '#9333ea', '#f59e0b', '#ec4899', '#6366f1'];

  const hasData = filteredBills.length > 0;

  if (!hasData) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Not enough data to generate trends
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          No transactions match the selected period ({dateFilterLabel}). Select a different date filter or complete new sales in POS to view visual trend charts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* SECTION 1: AUTOMATIC BUSINESS INSIGHTS CARDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Automated Business Insights
              </h2>
              <p className="text-[11px] text-slate-400">
                Key performance highlights automatically computed for {dateFilterLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Insight 1: Highest Sales Day */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Highest Sales Day</span>
            <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
              {insights.highestSalesDay ? `₹${insights.highestSalesDay.amount.toLocaleString('en-IN')}` : 'N/A'}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
              {insights.highestSalesDay?.date || 'No record'}
            </span>
          </div>

          {/* Insight 2: Best Performing Worker */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Top Staff Member</span>
            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono truncate">
              {insights.bestWorker ? insights.bestWorker.name : 'N/A'}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
              {insights.bestWorker ? `₹${insights.bestWorker.sales.toLocaleString('en-IN')} revenue` : 'No sales'}
            </span>
          </div>

          {/* Insight 3: Most Popular Service */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Most Popular Service</span>
            <p className="text-lg font-extrabold text-sky-600 dark:text-sky-400 font-mono truncate">
              {insights.mostPopularService ? insights.mostPopularService.name : 'N/A'}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
              {insights.mostPopularService ? `${insights.mostPopularService.count} times performed` : 'None'}
            </span>
          </div>

          {/* Insight 4: Peak Business Hour */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peak Business Hour</span>
            <p className="text-base font-extrabold text-purple-600 dark:text-purple-400 font-mono truncate">
              {insights.peakBusinessHour}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
              Highest customer footfall
            </span>
          </div>

          {/* Insight 5: Avg Daily Revenue */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Daily Revenue</span>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
              ₹{insights.avgDailyRevenue.toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
              Across {insights.activeDaysCount} active day(s)
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: SALES TREND (LINE CHART) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-600 dark:text-indigo-400" />
                Sales Trend Timeline
              </h3>
              <p className="text-[10px] text-slate-400">Daily revenue fluctuations over the period</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrends}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: PAYMENT METHOD DISTRIBUTION (DONUT CHART) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Wallet size={16} className="text-indigo-600 dark:text-indigo-400" />
                Payment Method Share
              </h3>
              <p className="text-[10px] text-slate-400">Cash vs. UPI vs. Split payment distribution</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center pt-2">
            {paymentData.length === 0 ? (
              <p className="text-xs text-slate-400">No payment records available.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 3: TOP WORKERS (BAR CHART) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Award size={16} className="text-indigo-600 dark:text-indigo-400" />
                Top Workers by Revenue
              </h3>
              <p className="text-[10px] text-slate-400">Staff performance breakdown</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {topWorkersData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No staff sales data found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topWorkersData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip 
                    formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 4: TOP SERVICES (BAR CHART) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Scissors size={16} className="text-indigo-600 dark:text-indigo-400" />
                Top Services Revenue
              </h3>
              <p className="text-[10px] text-slate-400">Most lucrative services & items</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {topServicesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No service performance data found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServicesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip 
                    formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
