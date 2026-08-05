/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DbBill, DbWorkerProfile, DbAttendanceRecord, DbWorkerAdvance } from '../database/db';

export type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'custom';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Get YYYY-MM-DD string from Date object
 */
export const formatDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Filters bills based on selected date range preset or custom inputs.
 */
export const filterBillsByDate = (
  allBills: DbBill[],
  filter: DateFilterType,
  customStart?: string,
  customEnd?: string
): DbBill[] => {
  const now = new Date();
  const todayStr = formatDateKey(now);

  if (filter === 'today') {
    return allBills.filter(b => (b.date || '').startsWith(todayStr));
  }

  if (filter === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterdayStr = formatDateKey(y);
    return allBills.filter(b => (b.date || '').startsWith(yesterdayStr));
  }

  if (filter === 'week') {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const startStr = formatDateKey(sevenDaysAgo);
    return allBills.filter(b => {
      const d = b.date || '';
      return d >= startStr && d <= todayStr;
    });
  }

  if (filter === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startStr = formatDateKey(startOfMonth);
    return allBills.filter(b => {
      const d = b.date || '';
      return d >= startStr && d <= todayStr;
    });
  }

  if (filter === 'last_month') {
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startStr = formatDateKey(firstDayLastMonth);
    const endStr = formatDateKey(lastDayLastMonth);
    return allBills.filter(b => {
      const d = b.date || '';
      return d >= startStr && d <= endStr;
    });
  }

  if (filter === 'custom') {
    if (!customStart && !customEnd) return allBills;
    const start = customStart || '1970-01-01';
    const end = customEnd || '2099-12-31';
    return allBills.filter(b => {
      const d = b.date || '';
      return d >= start && d <= end;
    });
  }

  return allBills;
};

/**
 * Filters worker advance records based on selected date range preset or custom inputs.
 */
export const filterAdvancesByDate = (
  allAdvances: DbWorkerAdvance[],
  filter: DateFilterType,
  customStart?: string,
  customEnd?: string
): DbWorkerAdvance[] => {
  const now = new Date();
  const todayStr = formatDateKey(now);

  if (filter === 'today') {
    return allAdvances.filter(a => (a.date || '').startsWith(todayStr));
  }

  if (filter === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterdayStr = formatDateKey(y);
    return allAdvances.filter(a => (a.date || '').startsWith(yesterdayStr));
  }

  if (filter === 'week') {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const startStr = formatDateKey(sevenDaysAgo);
    return allAdvances.filter(a => {
      const d = a.date || '';
      return d >= startStr && d <= todayStr;
    });
  }

  if (filter === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startStr = formatDateKey(startOfMonth);
    return allAdvances.filter(a => {
      const d = a.date || '';
      return d >= startStr && d <= todayStr;
    });
  }

  if (filter === 'last_month') {
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startStr = formatDateKey(firstDayLastMonth);
    const endStr = formatDateKey(lastDayLastMonth);
    return allAdvances.filter(a => {
      const d = a.date || '';
      return d >= startStr && d <= endStr;
    });
  }

  if (filter === 'custom') {
    if (!customStart && !customEnd) return allAdvances;
    const start = customStart || '1970-01-01';
    const end = customEnd || '2099-12-31';
    return allAdvances.filter(a => {
      const d = a.date || '';
      return d >= start && d <= end;
    });
  }

  return allAdvances;
};

// --- WORKER REPORT ENGINE ---

export interface WorkerReportSummary {
  workerId: string;
  workerName: string;
  role: string;
  status: string;
  dailyWage?: number;
  commissionPercentage?: number;
  phone?: string;
  
  // Aggregated Metrics
  customersServed: number;
  totalBills: number;
  totalSales: number;
  avgBillValue: number;
  discountsGiven: number;
  tipsReceived?: number;
  commissionEarned: number;
  workingDays: number;

  // Payment Breakdown
  cashTxCount: number;
  cashSales: number;
  upiTxCount: number;
  upiSales: number;
  splitTxCount: number;
  splitSales: number;

  // Services Performed & Products Sold
  servicesPerformed: Array<{ name: string; count: number; revenue: number }>;
  
  // Recent transactions
  transactions: DbBill[];
}

export const computeWorkerReports = (
  filteredBills: DbBill[],
  workerProfiles: DbWorkerProfile[],
  attendanceRecords: DbAttendanceRecord[] = []
): WorkerReportSummary[] => {
  // Map of canonical worker key -> WorkerReportSummary
  const workerMap = new Map<string, WorkerReportSummary>();

  const normalize = (s: string) => s.trim().toLowerCase();

  // Helper to find canonical key for a bill/profile
  const resolveWorkerKey = (rawId?: string, rawName?: string): { canonicalKey: string; profile?: DbWorkerProfile } => {
    // 1. Try to match worker profile by id or stripped id
    if (rawId) {
      const strippedId = rawId.replace(/^WORKER-/, '');
      const profileById = workerProfiles.find(w => w.id === rawId || w.id === strippedId);
      if (profileById) return { canonicalKey: profileById.id, profile: profileById };
    }

    // 2. Try to match worker profile by name
    if (rawName) {
      const normName = normalize(rawName);
      const profileByName = workerProfiles.find(w => normalize(w.name) === normName);
      if (profileByName) return { canonicalKey: profileByName.id, profile: profileByName };
      
      // Also check if any existing worker in workerMap has matching name
      for (const [key, val] of workerMap.entries()) {
        if (normalize(val.workerName) === normName) {
          return { canonicalKey: key };
        }
      }
    }

    // 3. Fallback to rawId or WORKER-name
    const fallback = rawId || (rawName ? `WORKER-${normalize(rawName)}` : 'WORKER-unassigned');
    return { canonicalKey: fallback };
  };

  // Seed with all known worker profiles using wp.id as canonical key
  workerProfiles.forEach(wp => {
    workerMap.set(wp.id, {
      workerId: wp.id,
      workerName: wp.name,
      role: wp.role || 'Staff',
      status: wp.status || 'ACTIVE',
      dailyWage: wp.dailyWage,
      commissionPercentage: wp.commissionPercentage,
      phone: wp.phone,
      customersServed: 0,
      totalBills: 0,
      totalSales: 0,
      avgBillValue: 0,
      discountsGiven: 0,
      commissionEarned: 0,
      workingDays: 0,
      cashTxCount: 0,
      cashSales: 0,
      upiTxCount: 0,
      upiSales: 0,
      splitTxCount: 0,
      splitSales: 0,
      servicesPerformed: [],
      transactions: []
    });
  });

  // Track unique customers, dates, and services per canonical key
  const workerCustomersMap = new Map<string, Set<string>>();
  const workerDatesMap = new Map<string, Set<string>>();
  const workerServicesMap = new Map<string, Map<string, { name: string; count: number; revenue: number }>>();

  filteredBills.forEach(bill => {
    const assignedName = bill.workerName || bill.cashierName || 'Store Staff';
    const assignedId = bill.workerId;

    const { canonicalKey, profile } = resolveWorkerKey(assignedId, assignedName);

    if (!workerMap.has(canonicalKey)) {
      workerMap.set(canonicalKey, {
        workerId: canonicalKey,
        workerName: profile?.name || assignedName,
        role: profile?.role || 'Staff',
        status: profile?.status || 'ACTIVE',
        dailyWage: profile?.dailyWage,
        commissionPercentage: profile?.commissionPercentage,
        phone: profile?.phone,
        customersServed: 0,
        totalBills: 0,
        totalSales: 0,
        avgBillValue: 0,
        discountsGiven: 0,
        commissionEarned: 0,
        workingDays: 0,
        cashTxCount: 0,
        cashSales: 0,
        upiTxCount: 0,
        upiSales: 0,
        splitTxCount: 0,
        splitSales: 0,
        servicesPerformed: [],
        transactions: []
      });
    }

    const summary = workerMap.get(canonicalKey)!;

    summary.totalBills += 1;
    summary.totalSales += (bill.grandTotal || 0);
    summary.discountsGiven += (bill.discountAmount || 0);
    summary.tipsReceived = (summary.tipsReceived || 0) + (bill.tipAmount || 0);

    // Track unique customers
    const custKey = (bill.customerMobile || bill.customerName || 'Walk-in Customer').trim().toLowerCase();
    if (!workerCustomersMap.has(canonicalKey)) {
      workerCustomersMap.set(canonicalKey, new Set());
    }
    workerCustomersMap.get(canonicalKey)!.add(custKey);

    // Track unique working dates
    if (bill.date) {
      if (!workerDatesMap.has(canonicalKey)) {
        workerDatesMap.set(canonicalKey, new Set());
      }
      workerDatesMap.get(canonicalKey)!.add(bill.date);
    }

    // Payment method breakdown
    if (bill.paymentMethod === 'CASH') {
      summary.cashTxCount += 1;
      summary.cashSales += (bill.grandTotal || 0);
    } else if (bill.paymentMethod === 'UPI') {
      summary.upiTxCount += 1;
      summary.upiSales += (bill.grandTotal || 0);
    } else if (bill.paymentMethod === 'SPLIT') {
      summary.splitTxCount += 1;
      summary.splitSales += (bill.grandTotal || 0);
    }

    // Process line items
    if (!workerServicesMap.has(canonicalKey)) {
      workerServicesMap.set(canonicalKey, new Map());
    }
    const svcMap = workerServicesMap.get(canonicalKey)!;

    if (Array.isArray(bill.items)) {
      bill.items.forEach(item => {
        const itemKey = item.productName || 'Service';
        const qty = item.quantity || 1;
        const lineTotal = item.lineTotal || (item.sellingPrice * qty) || 0;

        const existing = svcMap.get(itemKey) || { name: itemKey, count: 0, revenue: 0 };
        existing.count += qty;
        existing.revenue += lineTotal;
        svcMap.set(itemKey, existing);
      });
    }

    // Add transaction to worker's list
    summary.transactions.push(bill);
  });

  // Finalize calculated fields for each worker
  const result: WorkerReportSummary[] = [];

  workerMap.forEach((summary, key) => {
    // Unique customers
    summary.customersServed = workerCustomersMap.get(key)?.size || 0;

    // Working days from bills or attendance
    const datesFromBills = workerDatesMap.get(key)?.size || 0;
    const attendanceCount = attendanceRecords.filter(a => (a.workerId === key || a.workerId === summary.workerId) && (a.status === 'PRESENT' || a.status === 'HALF_DAY')).length;
    summary.workingDays = Math.max(datesFromBills, attendanceCount);

    // Avg bill value
    summary.avgBillValue = summary.totalBills > 0 ? Math.round(summary.totalSales / summary.totalBills) : 0;

    // Commission earned
    if (summary.commissionPercentage && summary.commissionPercentage > 0) {
      summary.commissionEarned = Math.round(summary.totalSales * (summary.commissionPercentage / 100));
    } else {
      summary.commissionEarned = 0;
    }

    // Services list sorted by revenue
    const svcMap = workerServicesMap.get(key);
    if (svcMap) {
      summary.servicesPerformed = Array.from(svcMap.values()).sort((a, b) => b.revenue - a.revenue);
    } else {
      summary.servicesPerformed = [];
    }

    // Sort transactions latest first
    summary.transactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    result.push(summary);
  });

  // Ensure every summary in result has a unique workerId
  const seenIds = new Set<string>();
  result.forEach((w, idx) => {
    if (seenIds.has(w.workerId)) {
      w.workerId = `${w.workerId}-${idx}`;
    }
    seenIds.add(w.workerId);
  });

  // Sort workers by Total Sales descending
  result.sort((a, b) => b.totalSales - a.totalSales);

  return result;
};


// --- SERVICE REPORT ENGINE ---

export interface ServiceWorkerBreakdown {
  workerName: string;
  timesPerformed: number;
  revenue: number;
}

export interface ServiceDateBreakdown {
  date: string;
  timesPerformed: number;
  revenue: number;
}

export interface ServiceReportSummary {
  serviceName: string;
  category: string;
  timesPerformed: number;
  revenueGenerated: number;
  avgSellingPrice: number;
  percentageOfTotalSales: number;
  uniqueCustomersCount: number;

  // Breakdown by worker
  workersBreakdown: ServiceWorkerBreakdown[];

  // Breakdown by date
  dateBreakdown: ServiceDateBreakdown[];

  // Bills containing this service
  recentBills: DbBill[];
}

export const computeServiceReports = (
  filteredBills: DbBill[]
): ServiceReportSummary[] => {
  const totalPeriodSales = filteredBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);

  const serviceMap = new Map<string, {
    serviceName: string;
    category: string;
    timesPerformed: number;
    revenueGenerated: number;
    customersSet: Set<string>;
    workersMap: Map<string, { name: string; count: number; revenue: number }>;
    datesMap: Map<string, { date: string; count: number; revenue: number }>;
    billsSet: Set<DbBill>;
  }>();

  filteredBills.forEach(bill => {
    const custKey = (bill.customerMobile || bill.customerName || 'Walk-in Customer').trim().toLowerCase();
    const workerName = bill.workerName || bill.cashierName || 'Staff';

    if (Array.isArray(bill.items)) {
      bill.items.forEach(item => {
        const name = item.productName || 'Service / Product';
        const category = item.category || 'General';
        const qty = item.quantity || 1;
        const lineTotal = item.lineTotal || (item.sellingPrice * qty) || 0;

        if (!serviceMap.has(name)) {
          serviceMap.set(name, {
            serviceName: name,
            category,
            timesPerformed: 0,
            revenueGenerated: 0,
            customersSet: new Set(),
            workersMap: new Map(),
            datesMap: new Map(),
            billsSet: new Set()
          });
        }

        const entry = serviceMap.get(name)!;
        entry.timesPerformed += qty;
        entry.revenueGenerated += lineTotal;
        entry.customersSet.add(custKey);
        entry.billsSet.add(bill);

        // Worker breakdown
        const wKey = workerName;
        if (!entry.workersMap.has(wKey)) {
          entry.workersMap.set(wKey, { name: wKey, count: 0, revenue: 0 });
        }
        const wEntry = entry.workersMap.get(wKey)!;
        wEntry.count += qty;
        wEntry.revenue += lineTotal;

        // Date breakdown
        if (bill.date) {
          if (!entry.datesMap.has(bill.date)) {
            entry.datesMap.set(bill.date, { date: bill.date, count: 0, revenue: 0 });
          }
          const dEntry = entry.datesMap.get(bill.date)!;
          dEntry.count += qty;
          dEntry.revenue += lineTotal;
        }
      });
    }
  });

  const result: ServiceReportSummary[] = [];

  serviceMap.forEach(entry => {
    const avgSellingPrice = entry.timesPerformed > 0 
      ? Math.round(entry.revenueGenerated / entry.timesPerformed) 
      : 0;

    const percentageOfTotalSales = totalPeriodSales > 0 
      ? Number(((entry.revenueGenerated / totalPeriodSales) * 100).toFixed(1)) 
      : 0;

    const workersBreakdown: ServiceWorkerBreakdown[] = Array.from(entry.workersMap.values())
      .map(w => ({
        workerName: w.name,
        timesPerformed: w.count,
        revenue: w.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const dateBreakdown: ServiceDateBreakdown[] = Array.from(entry.datesMap.values())
      .map(d => ({
        date: d.date,
        timesPerformed: d.count,
        revenue: d.revenue
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const recentBills = Array.from(entry.billsSet)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    result.push({
      serviceName: entry.serviceName,
      category: entry.category,
      timesPerformed: entry.timesPerformed,
      revenueGenerated: entry.revenueGenerated,
      avgSellingPrice,
      percentageOfTotalSales,
      uniqueCustomersCount: entry.customersSet.size,
      workersBreakdown,
      dateBreakdown,
      recentBills
    });
  });

  // Default sort by revenue descending
  result.sort((a, b) => b.revenueGenerated - a.revenueGenerated);

  return result;
};

// --- BUSINESS FINANCIAL SUMMARY ENGINE ---

export interface BusinessFinancialSummary {
  totalBills: number;
  subtotal: number;
  totalTips: number;
  totalDiscounts: number;
  grossSales: number; // Subtotal + Tips
  netSales: number;   // Gross Sales - Discounts (Final collected total)
  totalCash: number;
  totalUpi: number;
  avgBillValue: number;
}

export const computeBusinessFinancialSummary = (filteredBills: DbBill[]): BusinessFinancialSummary => {
  const totalBills = filteredBills.length;
  let subtotal = 0;
  let totalTips = 0;
  let totalDiscounts = 0;
  let netSales = 0;
  let totalCash = 0;
  let totalUpi = 0;

  filteredBills.forEach(b => {
    subtotal += (b.subtotal || 0);
    totalTips += (b.tipAmount || 0);
    totalDiscounts += (b.discountAmount || 0);
    netSales += (b.grandTotal || 0);

    if (b.paymentMethod === 'CASH') {
      totalCash += (b.grandTotal || 0);
    } else if (b.paymentMethod === 'UPI') {
      totalUpi += (b.grandTotal || 0);
    } else if (b.paymentMethod === 'SPLIT') {
      totalCash += (b.cashAmount || 0);
      totalUpi += (b.upiAmount || 0);
    }
  });

  const grossSales = subtotal + totalTips;
  const avgBillValue = totalBills > 0 ? Math.round(netSales / totalBills) : 0;

  return {
    totalBills,
    subtotal,
    totalTips,
    totalDiscounts,
    grossSales,
    netSales,
    totalCash,
    totalUpi,
    avgBillValue
  };
};

// --- WORKER ADVANCES REPORT ENGINE ---

export interface WorkerAdvanceItemSummary {
  workerId: string;
  workerName: string;
  advancesGiven: number;
  advancesRecovered: number;
  netBalance: number; // Given - Recovered in period
  totalOutstanding: number; // Cumulative given - recovered overall
  transactionCount: number;
}

export interface DateAdvanceSummary {
  date: string;
  given: number;
  recovered: number;
  net: number;
  count: number;
}

export interface WorkerAdvancesReportData {
  totalGivenInPeriod: number;
  totalRecoveredInPeriod: number;
  netAdvanceBalanceInPeriod: number;
  totalOutstandingAllTime: number;
  todayGiven: number;
  todayRecovered: number;
  workerSummaries: WorkerAdvanceItemSummary[];
  dateSummaries: DateAdvanceSummary[];
  transactions: DbWorkerAdvance[];
}

export const computeWorkerAdvancesReport = (
  allAdvances: DbWorkerAdvance[],
  filteredAdvances: DbWorkerAdvance[],
  workerProfiles: DbWorkerProfile[] = []
): WorkerAdvancesReportData => {
  const todayStr = formatDateKey(new Date());

  // Today calculations
  const todayAdvances = allAdvances.filter(a => (a.date || '').startsWith(todayStr));
  const todayGiven = todayAdvances.filter(a => a.type === 'GIVE').reduce((acc, a) => acc + (a.amount || 0), 0);
  const todayRecovered = todayAdvances.filter(a => a.type === 'RECOVER').reduce((acc, a) => acc + (a.amount || 0), 0);

  // Period calculations
  const totalGivenInPeriod = filteredAdvances.filter(a => a.type === 'GIVE').reduce((acc, a) => acc + (a.amount || 0), 0);
  const totalRecoveredInPeriod = filteredAdvances.filter(a => a.type === 'RECOVER').reduce((acc, a) => acc + (a.amount || 0), 0);
  const netAdvanceBalanceInPeriod = totalGivenInPeriod - totalRecoveredInPeriod;

  // Cumulative outstanding (all time across all worker records)
  const totalGivenAllTime = allAdvances.filter(a => a.type === 'GIVE').reduce((acc, a) => acc + (a.amount || 0), 0);
  const totalRecoveredAllTime = allAdvances.filter(a => a.type === 'RECOVER').reduce((acc, a) => acc + (a.amount || 0), 0);
  const totalOutstandingAllTime = Math.max(0, totalGivenAllTime - totalRecoveredAllTime);

  // Worker-wise summaries map
  const workerMap = new Map<string, {
    workerId: string;
    workerName: string;
    advancesGiven: number;
    advancesRecovered: number;
    transactionCount: number;
  }>();

  const getOrCreateWorkerEntry = (wId: string, wName: string) => {
    if (!workerMap.has(wId)) {
      workerMap.set(wId, {
        workerId: wId,
        workerName: wName || 'Worker',
        advancesGiven: 0,
        advancesRecovered: 0,
        transactionCount: 0
      });
    }
    return workerMap.get(wId)!;
  };

  filteredAdvances.forEach(a => {
    const entry = getOrCreateWorkerEntry(a.workerId, a.workerName);
    entry.transactionCount += 1;
    if (a.type === 'GIVE') {
      entry.advancesGiven += (a.amount || 0);
    } else if (a.type === 'RECOVER') {
      entry.advancesRecovered += (a.amount || 0);
    }
  });

  const workerSummaries: WorkerAdvanceItemSummary[] = Array.from(workerMap.values()).map(w => {
    const workerAllLogs = allAdvances.filter(a => a.workerId === w.workerId);
    const allGiven = workerAllLogs.filter(a => a.type === 'GIVE').reduce((acc, a) => acc + (a.amount || 0), 0);
    const allRecovered = workerAllLogs.filter(a => a.type === 'RECOVER').reduce((acc, a) => acc + (a.amount || 0), 0);
    const totalOutstanding = Math.max(0, allGiven - allRecovered);

    return {
      workerId: w.workerId,
      workerName: w.workerName,
      advancesGiven: w.advancesGiven,
      advancesRecovered: w.advancesRecovered,
      netBalance: w.advancesGiven - w.advancesRecovered,
      totalOutstanding,
      transactionCount: w.transactionCount
    };
  });

  // Include active workers who have an outstanding balance or prior advances
  workerProfiles.forEach(wp => {
    if (!workerMap.has(wp.id)) {
      const workerAllLogs = allAdvances.filter(a => a.workerId === wp.id);
      const allGiven = workerAllLogs.filter(a => a.type === 'GIVE').reduce((acc, a) => acc + (a.amount || 0), 0);
      const allRecovered = workerAllLogs.filter(a => a.type === 'RECOVER').reduce((acc, a) => acc + (a.amount || 0), 0);
      const totalOutstanding = Math.max(0, allGiven - allRecovered);

      if (totalOutstanding > 0 || workerAllLogs.length > 0) {
        workerSummaries.push({
          workerId: wp.id,
          workerName: wp.name,
          advancesGiven: 0,
          advancesRecovered: 0,
          netBalance: 0,
          totalOutstanding,
          transactionCount: 0
        });
      }
    }
  });

  workerSummaries.sort((a, b) => b.totalOutstanding - a.totalOutstanding || b.advancesGiven - a.advancesGiven);

  // Date-wise summaries map
  const dateMap = new Map<string, DateAdvanceSummary>();
  filteredAdvances.forEach(a => {
    const dKey = a.date || todayStr;
    if (!dateMap.has(dKey)) {
      dateMap.set(dKey, {
        date: dKey,
        given: 0,
        recovered: 0,
        net: 0,
        count: 0
      });
    }
    const dEntry = dateMap.get(dKey)!;
    dEntry.count += 1;
    if (a.type === 'GIVE') {
      dEntry.given += (a.amount || 0);
    } else if (a.type === 'RECOVER') {
      dEntry.recovered += (a.amount || 0);
    }
    dEntry.net = dEntry.given - dEntry.recovered;
  });

  const dateSummaries: DateAdvanceSummary[] = Array.from(dateMap.values())
    .sort((a, b) => b.date.localeCompare(a.date));

  const transactions = [...filteredAdvances].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return {
    totalGivenInPeriod,
    totalRecoveredInPeriod,
    netAdvanceBalanceInPeriod,
    totalOutstandingAllTime,
    todayGiven,
    todayRecovered,
    workerSummaries,
    dateSummaries,
    transactions
  };
};
