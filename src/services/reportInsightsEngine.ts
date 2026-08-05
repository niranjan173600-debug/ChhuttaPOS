/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DbBill, DbProduct } from '../database/db';
import { WorkerReportSummary, ServiceReportSummary } from './reportEngine';

export interface DailyTrendItem {
  date: string;
  displayDate: string;
  sales: number;
  billsCount: number;
  customersCount: number;
  avgBillValue: number;
}

export interface CategoryRevenueItem {
  category: string;
  revenue: number;
  count: number;
}

export interface PaymentDistributionItem {
  name: string;
  value: number;
  count: number;
  color: string;
}

export interface BusinessInsightsData {
  highestSalesDay: { date: string; amount: number } | null;
  bestWorker: { name: string; sales: number } | null;
  mostPopularService: { name: string; count: number } | null;
  highestRevenueService: { name: string; revenue: number } | null;
  avgDailyRevenue: number;
  avgCustomersPerDay: number;
  avgBillsPerDay: number;
  peakBusinessHour: string;
  mostUsedPaymentMethod: string;
  highestDiscountBill: { billNumber: string; amount: number; date: string } | null;
  totalRevenue: number;
  totalBills: number;
  totalCustomers: number;
  activeDaysCount: number;
}

/**
 * Computes daily sales trend array sorted chronologically
 */
export const computeDailyTrend = (filteredBills: DbBill[]): DailyTrendItem[] => {
  const map = new Map<string, {
    date: string;
    sales: number;
    billsCount: number;
    customersSet: Set<string>;
  }>();

  filteredBills.forEach(bill => {
    const dateKey = bill.date || 'Unknown';
    if (!map.has(dateKey)) {
      map.set(dateKey, {
        date: dateKey,
        sales: 0,
        billsCount: 0,
        customersSet: new Set()
      });
    }

    const item = map.get(dateKey)!;
    item.sales += (bill.grandTotal || 0);
    item.billsCount += 1;
    const custKey = (bill.customerMobile || bill.customerName || 'Walk-in').trim().toLowerCase();
    item.customersSet.add(custKey);
  });

  const sortedKeys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));

  return sortedKeys.map(key => {
    const data = map.get(key)!;
    let displayDate = key;
    try {
      if (key !== 'Unknown') {
        const parts = key.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          displayDate = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        }
      }
    } catch {
      displayDate = key;
    }

    return {
      date: key,
      displayDate,
      sales: data.sales,
      billsCount: data.billsCount,
      customersCount: data.customersSet.size,
      avgBillValue: data.billsCount > 0 ? Math.round(data.sales / data.billsCount) : 0
    };
  });
};

/**
 * Computes category breakdown from line items
 */
export const computeCategoryBreakdown = (filteredBills: DbBill[]): CategoryRevenueItem[] => {
  const catMap = new Map<string, { category: string; revenue: number; count: number }>();

  filteredBills.forEach(bill => {
    if (Array.isArray(bill.items)) {
      bill.items.forEach(item => {
        const cat = item.category || 'General';
        const qty = item.quantity || 1;
        const total = item.lineTotal || (item.sellingPrice * qty) || 0;

        if (!catMap.has(cat)) {
          catMap.set(cat, { category: cat, revenue: 0, count: 0 });
        }
        const entry = catMap.get(cat)!;
        entry.revenue += total;
        entry.count += qty;
      });
    }
  });

  return Array.from(catMap.values()).sort((a, b) => b.revenue - a.revenue);
};

/**
 * Computes payment distribution for Pie/Donut charts
 */
export const computePaymentDistribution = (filteredBills: DbBill[]): PaymentDistributionItem[] => {
  let cashSales = 0;
  let cashCount = 0;
  let upiSales = 0;
  let upiCount = 0;
  let splitSales = 0;
  let splitCount = 0;

  filteredBills.forEach(b => {
    if (b.paymentMethod === 'CASH') {
      cashSales += (b.grandTotal || 0);
      cashCount++;
    } else if (b.paymentMethod === 'UPI') {
      upiSales += (b.grandTotal || 0);
      upiCount++;
    } else if (b.paymentMethod === 'SPLIT') {
      splitSales += (b.grandTotal || 0);
      splitCount++;
    }
  });

  const list: PaymentDistributionItem[] = [];
  if (cashSales > 0 || cashCount > 0) {
    list.push({ name: 'Cash', value: cashSales, count: cashCount, color: '#10b981' });
  }
  if (upiSales > 0 || upiCount > 0) {
    list.push({ name: 'UPI / QR', value: upiSales, count: upiCount, color: '#0284c7' });
  }
  if (splitSales > 0 || splitCount > 0) {
    list.push({ name: 'Split (Cash+UPI)', value: splitSales, count: splitCount, color: '#9333ea' });
  }

  return list;
};

/**
 * Computes business insights automatically
 */
export const computeBusinessInsights = (
  filteredBills: DbBill[],
  workerSummaries: WorkerReportSummary[],
  serviceSummaries: ServiceReportSummary[]
): BusinessInsightsData => {
  const dailyTrends = computeDailyTrend(filteredBills);
  const totalRevenue = filteredBills.reduce((acc, b) => acc + (b.grandTotal || 0), 0);
  const totalBills = filteredBills.length;

  const customersSet = new Set<string>();
  filteredBills.forEach(b => {
    const custKey = (b.customerMobile || b.customerName || 'Walk-in Customer').trim().toLowerCase();
    customersSet.add(custKey);
  });
  const totalCustomers = customersSet.size;

  const uniqueDaysSet = new Set<string>(filteredBills.map(b => b.date).filter(Boolean));
  const activeDaysCount = Math.max(1, uniqueDaysSet.size);

  // Highest Sales Day
  let highestSalesDay: { date: string; amount: number } | null = null;
  dailyTrends.forEach(d => {
    if (!highestSalesDay || d.sales > highestSalesDay.amount) {
      highestSalesDay = { date: d.date, amount: d.sales };
    }
  });

  // Best Performing Worker
  let bestWorker: { name: string; sales: number } | null = null;
  if (workerSummaries.length > 0) {
    const top = workerSummaries[0];
    if (top && top.totalSales > 0) {
      bestWorker = { name: top.workerName, sales: top.totalSales };
    }
  }

  // Most Popular Service
  let mostPopularService: { name: string; count: number } | null = null;
  let highestRevenueService: { name: string; revenue: number } | null = null;
  
  if (serviceSummaries.length > 0) {
    const sortedByCount = [...serviceSummaries].sort((a, b) => b.timesPerformed - a.timesPerformed);
    if (sortedByCount[0] && sortedByCount[0].timesPerformed > 0) {
      mostPopularService = { name: sortedByCount[0].serviceName, count: sortedByCount[0].timesPerformed };
    }

    const sortedByRev = [...serviceSummaries].sort((a, b) => b.revenueGenerated - a.revenueGenerated);
    if (sortedByRev[0] && sortedByRev[0].revenueGenerated > 0) {
      highestRevenueService = { name: sortedByRev[0].serviceName, revenue: sortedByRev[0].revenueGenerated };
    }
  }

  // Peak Business Hour
  const hourMap = new Map<number, number>();
  filteredBills.forEach(b => {
    if (b.time) {
      const hourStr = b.time.split(':')[0];
      const hourNum = parseInt(hourStr, 10);
      if (!isNaN(hourNum)) {
        hourMap.set(hourNum, (hourMap.get(hourNum) || 0) + 1);
      }
    }
  });

  let peakHour = -1;
  let maxHourCount = 0;
  hourMap.forEach((count, hour) => {
    if (count > maxHourCount) {
      maxHourCount = count;
      peakHour = hour;
    }
  });

  let peakBusinessHour = 'N/A';
  if (peakHour >= 0) {
    const startPeriod = peakHour >= 12 ? 'PM' : 'AM';
    const startFormatted = (peakHour % 12 === 0 ? 12 : peakHour % 12).toString().padStart(2, '0');
    const endHour = (peakHour + 1) % 24;
    const endPeriod = endHour >= 12 ? 'PM' : 'AM';
    const endFormatted = (endHour % 12 === 0 ? 12 : endHour % 12).toString().padStart(2, '0');
    peakBusinessHour = `${startFormatted}:00 ${startPeriod} - ${endFormatted}:00 ${endPeriod}`;
  }

  // Most Used Payment Method
  let cashCount = 0;
  let upiCount = 0;
  let splitCount = 0;
  filteredBills.forEach(b => {
    if (b.paymentMethod === 'CASH') cashCount++;
    else if (b.paymentMethod === 'UPI') upiCount++;
    else if (b.paymentMethod === 'SPLIT') splitCount++;
  });

  let mostUsedPaymentMethod = 'Cash';
  if (upiCount > cashCount && upiCount > splitCount) {
    mostUsedPaymentMethod = 'UPI / QR Code';
  } else if (splitCount > cashCount && splitCount > upiCount) {
    mostUsedPaymentMethod = 'Split Payment';
  } else if (cashCount === 0 && upiCount === 0 && splitCount === 0) {
    mostUsedPaymentMethod = 'None Recorded';
  }

  // Highest Discount Given
  let highestDiscountBill: { billNumber: string; amount: number; date: string } | null = null;
  filteredBills.forEach(b => {
    if (b.discountAmount && b.discountAmount > 0) {
      if (!highestDiscountBill || b.discountAmount > highestDiscountBill.amount) {
        highestDiscountBill = {
          billNumber: b.billNumber || b.id,
          amount: b.discountAmount,
          date: b.date
        };
      }
    }
  });

  return {
    highestSalesDay,
    bestWorker,
    mostPopularService,
    highestRevenueService,
    avgDailyRevenue: Math.round(totalRevenue / activeDaysCount),
    avgCustomersPerDay: Math.round(totalCustomers / activeDaysCount),
    avgBillsPerDay: Math.round(totalBills / activeDaysCount),
    peakBusinessHour,
    mostUsedPaymentMethod,
    highestDiscountBill,
    totalRevenue,
    totalBills,
    totalCustomers,
    activeDaysCount
  };
};
