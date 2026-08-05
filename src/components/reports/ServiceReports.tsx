/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Scissors, 
  Search, 
  Trophy, 
  TrendingUp, 
  Users, 
  Receipt, 
  Tag, 
  Calendar, 
  Eye, 
  X, 
  ChevronRight, 
  Filter,
  Briefcase,
  PieChart,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { DbBill } from '../../database/db';
import { ServiceReportSummary } from '../../services/reportEngine';
import { ReceiptPreviewModal } from '../ReceiptPreviewModal';

interface ServiceReportsProps {
  serviceSummaries: ServiceReportSummary[];
}

export const ServiceReports: React.FC<ServiceReportsProps> = ({
  serviceSummaries
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [rankingMetric, setRankingMetric] = useState<'revenue' | 'times'>('revenue');

  // Selected service for detailed modal
  const [selectedService, setSelectedService] = useState<ServiceReportSummary | null>(null);

  // Selected bill for receipt preview
  const [previewBill, setPreviewBill] = useState<DbBill | null>(null);

  // Extract unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(serviceSummaries.map(s => s.category))).filter(Boolean);

  // Filter services by search term and category
  const filteredServices = serviceSummaries.filter(s => {
    const matchesSearch = s.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'ALL' || s.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Ranked Top Services
  const rankedServices = [...serviceSummaries].sort((a, b) => {
    if (rankingMetric === 'revenue') return b.revenueGenerated - a.revenueGenerated;
    if (rankingMetric === 'times') return b.timesPerformed - a.timesPerformed;
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
            placeholder="Search service by name or category..."
            className="w-full h-10 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400 shrink-0" />
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Categories ({uniqueCategories.length})</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TOP SERVICES LEADERBOARD RANKINGS */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 border border-indigo-800/50 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/50 pb-3">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Top Performed Services Leaderboard
            </h2>
          </div>

          <div className="flex items-center gap-1.5 bg-indigo-950/80 p-1 rounded-xl border border-indigo-800/60">
            <span className="text-[10px] text-indigo-300 px-2 font-medium">Rank by:</span>
            <button
              onClick={() => setRankingMetric('revenue')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                rankingMetric === 'revenue'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setRankingMetric('times')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                rankingMetric === 'times'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              Times Performed
            </button>
          </div>
        </div>

        {rankedServices.length === 0 ? (
          <div className="py-6 text-center text-xs text-indigo-200">
            No service records in this date range.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rankedServices.map((s, idx) => {
              const medalColor = idx === 0 
                ? 'from-amber-400 to-amber-600 text-slate-950' 
                : idx === 1 
                ? 'from-slate-300 to-slate-400 text-slate-950' 
                : 'from-amber-700 to-amber-900 text-amber-100';

              return (
                <div 
                  key={`rank-${s.serviceName}-${idx}`}
                  onClick={() => setSelectedService(s)}
                  className="bg-slate-900/80 border border-indigo-700/50 hover:border-amber-400/80 rounded-xl p-3.5 space-y-2 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-6 h-6 rounded-lg bg-gradient-to-br ${medalColor} font-mono font-black text-xs flex items-center justify-center shadow-xs`}>
                      #{idx + 1}
                    </span>
                    <span className="text-[10px] text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded font-mono truncate max-w-[120px]">
                      {s.category}
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-white truncate">{s.serviceName}</div>
                    <div className="text-[11px] text-amber-300 font-mono font-extrabold mt-0.5">
                      ₹{s.revenueGenerated.toLocaleString('en-IN')} Revenue
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-indigo-200 pt-1 border-t border-indigo-800/40">
                    <span>{s.timesPerformed}x Performed</span>
                    <span>{s.percentageOfTotalSales}% of Sales</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SERVICE DIRECTORY TABLE & CARDS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Scissors size={16} className="text-indigo-600 dark:text-indigo-400" />
            Service & Product Performance Analytics
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">
            {filteredServices.length} service(s) found
          </span>
        </div>

        {filteredServices.length === 0 ? (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Scissors size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No services found.</p>
            <p className="text-[11px] text-slate-400">
              No services or products match your search or date filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-3 pl-2">Service / Product Name</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-center">Times Performed</th>
                  <th className="pb-3 text-right">Avg Selling Price</th>
                  <th className="pb-3 text-right">Revenue Generated</th>
                  <th className="pb-3 text-right pr-2">% of Store Sales</th>
                  <th className="pb-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredServices.map((svc) => (
                  <tr 
                    key={svc.serviceName}
                    onClick={() => setSelectedService(svc)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 pl-2 font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {svc.serviceName}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {svc.category}
                      </span>
                    </td>
                    <td className="py-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {svc.timesPerformed}x
                    </td>
                    <td className="py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      ₹{svc.avgSellingPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                      ₹{svc.revenueGenerated.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold pr-2">
                      {svc.percentageOfTotalSales}%
                    </td>
                    <td className="py-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedService(svc);
                        }}
                        className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-400 rounded-lg text-slate-500 transition-colors cursor-pointer"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SERVICE DETAILS MODAL */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
                  <Scissors size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedService.serviceName}
                  </h2>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      Category: {selectedService.category}
                    </span>
                    <span>Avg Price: ₹{selectedService.avgSellingPrice}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedService(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-850">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Revenue</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  ₹{selectedService.revenueGenerated.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-850">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Times Performed</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  {selectedService.timesPerformed}x
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-850">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Unique Customers</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  {selectedService.uniqueCustomersCount}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-850">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">% of Store Sales</span>
                <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                  {selectedService.percentageOfTotalSales}%
                </span>
              </div>
            </div>

            {/* Workers Who Performed This Service */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase size={15} className="text-indigo-600 dark:text-indigo-400" />
                Workers Who Performed This Service ({selectedService.workersBreakdown.length})
              </h3>

              {selectedService.workersBreakdown.length === 0 ? (
                <div className="text-xs text-slate-400 py-3">No worker performance breakdown available.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedService.workersBreakdown.map((wb) => (
                    <div key={wb.workerName} className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-850 flex items-center justify-between text-xs">
                      <div className="font-bold text-slate-800 dark:text-white">
                        {wb.workerName}
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-extrabold text-slate-900 dark:text-white">₹{wb.revenue.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">({wb.timesPerformed}x)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Service Recent Transactions */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Receipt size={15} className="text-indigo-600 dark:text-indigo-400" />
                Recent Bills Containing This Service ({selectedService.recentBills.length})
              </h3>

              {selectedService.recentBills.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No recent bills found.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2 px-3">Invoice No</th>
                        <th className="py-2 px-3">Customer</th>
                        <th className="py-2 px-3">Assigned Worker</th>
                        <th className="py-2 px-3 text-right">Bill Total</th>
                        <th className="py-2 px-3 text-right">Date & Time</th>
                        <th className="py-2 px-3 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {selectedService.recentBills.map((bill) => (
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
                          <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                            {bill.workerName || bill.cashierName}
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
