/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { DbBill, DbProduct, DbBusinessConfig, DbWorkerAdvance } from '../database/db';
import { WorkerReportSummary, ServiceReportSummary, WorkerAdvancesReportData } from './reportEngine';
import { canExportReport, validateReportAccess } from '../utils/permissions';

export type ExportReportType = 'dashboard' | 'workers' | 'services' | 'products' | 'advances' | 'complete' | 'own';
export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface UserAuthInfo {
  role?: string;
  id?: string;
  fullName?: string;
}

export interface ExportDataPayload {
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
  userInfo?: UserAuthInfo;
}

/**
 * Download CSV file helper
 */
export const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export data to Excel (.xlsx) workbook
 */
export const exportToExcel = async (filename: string, sheets: { name: string; data: Record<string, any>[] }[]) => {
  const workbook = new ExcelJS.Workbook();

  sheets.forEach(sheet => {
    const sheetName = sheet.name.substring(0, 31).replace(/[*?:/\\\[\]]/g, '') || 'Sheet';
    const worksheet = workbook.addWorksheet(sheetName);
    const rows = sheet.data.length > 0 ? sheet.data : [{ Message: 'No data available' }];
    const headers = Object.keys(rows[0] || {});
    worksheet.columns = headers.map(h => ({ header: h, key: h, width: Math.max(15, h.length + 3) }));
    rows.forEach(row => worksheet.addRow(row));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export a single worker's performance report (For Workers & Individual Staff Downloads)
 */
export const exportSingleWorkerReport = (
  workerSummary: WorkerReportSummary,
  format: ExportFormat,
  dateFilterLabel: string,
  businessInfo?: DbBusinessConfig | null,
  userInfo?: UserAuthInfo
) => {
  const userRole = userInfo?.role;
  const currentUserId = userInfo?.id;

  const authCheck = validateReportAccess(userRole, 'export', 'own', workerSummary.workerId, currentUserId);
  if (!authCheck.allowed) {
    alert("You do not have permission to perform this action.");
    return;
  }

  const filename = `${workerSummary.workerName.toLowerCase().replace(/\s+/g, '_')}_performance_report_${dateFilterLabel.toLowerCase().replace(/\s+/g, '_')}`;

  if (format === 'pdf') {
    const doc = new jsPDF();
    const businessName = businessInfo?.name || 'CHHUTTA POS';
    let y = 15;

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${businessName.toUpperCase()} • WORKER PERFORMANCE REPORT`, 14, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Staff: ${workerSummary.workerName} (${workerSummary.role}) • Period: ${dateFilterLabel}`, 14, 18);

    doc.setTextColor(30, 41, 59);
    y = 35;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Individual Performance Summary', 14, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Worker Name: ${workerSummary.workerName}`, 14, y); y += 6;
    doc.text(`Assigned Role: ${workerSummary.role}`, 14, y); y += 6;
    doc.text(`Working Days Active: ${workerSummary.workingDays || 0} Days`, 14, y); y += 6;
    doc.text(`Total Completed Bills: ${workerSummary.totalBills || 0}`, 14, y); y += 6;
    doc.text(`Total Sales Revenue: INR ${(workerSummary.totalSales || 0).toLocaleString('en-IN')}`, 14, y); y += 6;
    doc.text(`Average Ticket Value: INR ${(workerSummary.avgBillValue || 0).toLocaleString('en-IN')}`, 14, y); y += 6;
    doc.text(`Commission Earned: INR ${(workerSummary.commissionEarned || 0).toLocaleString('en-IN')}`, 14, y); y += 10;

    const billsLog = workerSummary.transactions || [];
    if (billsLog.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Completed Jobs & Receipts Log', 14, y);
      y += 6;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      billsLog.slice(0, 25).forEach((b, idx) => {
        doc.text(`• Receipt #${b.billNumber || b.id || idx + 1} - ${b.date || 'Today'} - INR ${b.grandTotal || 0} (${b.paymentMethod || 'Cash'})`, 14, y);
        y += 5;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
    }

    doc.save(`${filename}.pdf`);
    return;
  }

  if (format === 'excel') {
    const data = [
      {
        'Worker Name': workerSummary.workerName,
        'Role': workerSummary.role,
        'Working Days': workerSummary.workingDays || 0,
        'Bills Count': workerSummary.totalBills || 0,
        'Total Sales (INR)': workerSummary.totalSales || 0,
        'Average Bill Value (INR)': workerSummary.avgBillValue || 0,
        'Commission Earned (INR)': workerSummary.commissionEarned || 0,
        'Period': dateFilterLabel
      }
    ];
    exportToExcel(filename, [{ name: 'Worker Performance', data }]);
    return;
  }

  if (format === 'csv') {
    const headers = ['Staff Name', 'Role', 'Working Days', 'Bills Count', 'Total Sales (INR)', 'Avg Bill Value', 'Commission Earned (INR)', 'Period'];
    const rows = [
      [
        workerSummary.workerName,
        workerSummary.role,
        workerSummary.workingDays || 0,
        workerSummary.totalBills || 0,
        workerSummary.totalSales || 0,
        workerSummary.avgBillValue || 0,
        workerSummary.commissionEarned || 0,
        dateFilterLabel
      ]
    ];
    downloadCSV(filename, headers, rows);
    return;
  }
};

/**
 * Generates formatted PDF document
 */
export const exportToPDF = (filename: string, payload: ExportDataPayload, reportType: ExportReportType) => {
  const doc = new jsPDF();
  const businessName = payload.businessInfo?.name || 'CHHUTTA POS';
  const timestampStr = new Date().toLocaleString('en-IN');

  let y = 15;

  // Header banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(businessName.toUpperCase(), 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`BUSINESS PERFORMANCE REPORT • ${payload.dateFilterLabel.toUpperCase()}`, 14, 18);
  doc.text(`Generated: ${timestampStr}`, 140, 18);

  doc.setTextColor(30, 41, 59);
  y = 32;

  // Section 1: Key Performance Metrics
  if (reportType === 'dashboard' || reportType === 'complete') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Key Performance Metrics', 14, y);
    y += 6;

    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 182, 28, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, 182, 28, 'S');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Sales: Rs. ${payload.totalSales.toLocaleString('en-IN')}`, 20, y + 8);
    doc.text(`Total Bills: ${payload.totalBills}`, 20, y + 16);
    doc.text(`Avg Bill Value: Rs. ${payload.avgBillValue.toLocaleString('en-IN')}`, 20, y + 24);

    doc.text(`Unique Customers: ${payload.totalCustomers}`, 105, y + 8);
    doc.text(`Total Discounts: Rs. ${payload.discountsGiven.toLocaleString('en-IN')}`, 105, y + 16);
    doc.text(`Date Filter: ${payload.dateFilterLabel}`, 105, y + 24);

    y += 36;
  }

  // Section 2: Worker Reports
  if ((reportType === 'workers' || reportType === 'complete') && payload.workerSummaries.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Staff & Worker Performance Summary', 14, y);
    y += 6;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 7, 'F');
    doc.setFontSize(8);
    doc.text('Staff Name', 18, y + 5);
    doc.text('Role', 65, y + 5);
    doc.text('Bills', 105, y + 5);
    doc.text('Total Revenue', 130, y + 5);
    doc.text('Commission', 165, y + 5);
    y += 9;

    doc.setFont('helvetica', 'normal');
    payload.workerSummaries.forEach((w) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(w.workerName, 18, y);
      doc.text(w.role || 'Staff', 65, y);
      doc.text(`${w.totalBills}`, 105, y);
      doc.text(`Rs. ${w.totalSales.toLocaleString('en-IN')}`, 130, y);
      doc.text(`Rs. ${w.commissionEarned.toLocaleString('en-IN')}`, 165, y);
      y += 6;
    });

    y += 8;
  }

  // Section 3: Service Reports
  if ((reportType === 'services' || reportType === 'complete') && payload.serviceSummaries.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Top Services & Items Summary', 14, y);
    y += 6;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 7, 'F');
    doc.setFontSize(8);
    doc.text('Service / Product', 18, y + 5);
    doc.text('Category', 80, y + 5);
    doc.text('Count', 125, y + 5);
    doc.text('Revenue Generated', 150, y + 5);
    y += 9;

    doc.setFont('helvetica', 'normal');
    payload.serviceSummaries.slice(0, 15).forEach((s) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(s.serviceName, 18, y);
      doc.text(s.category, 80, y);
      doc.text(`${s.timesPerformed}x`, 125, y);
      doc.text(`Rs. ${s.revenueGenerated.toLocaleString('en-IN')}`, 150, y);
      y += 6;
    });

    y += 8;
  }

  // Section 4: Products Inventory
  if ((reportType === 'products' || reportType === 'complete') && payload.products.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Products & Inventory Status', 14, y);
    y += 6;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 7, 'F');
    doc.setFontSize(8);
    doc.text('Item Name', 18, y + 5);
    doc.text('Category', 75, y + 5);
    doc.text('Stock', 120, y + 5);
    doc.text('Selling Price', 155, y + 5);
    y += 9;

    doc.setFont('helvetica', 'normal');
    payload.products.slice(0, 15).forEach((p) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(p.name, 18, y);
      doc.text(p.category || 'General', 75, y);
      doc.text(`${p.currentStock} ${p.stockUnit || 'units'}`, 120, y);
      doc.text(`Rs. ${p.sellingPrice.toLocaleString('en-IN')}`, 155, y);
      y += 6;
    });
    y += 8;
  }

  // Section 5: Worker Advances
  if ((reportType === 'advances' || reportType === 'complete' || reportType === 'dashboard') && payload.advancesReport) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Worker Advances & Cash Movements', 14, y);
    y += 6;

    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 182, 20, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, 182, 20, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`Advances Given (Period): Rs. ${payload.advancesReport.totalGivenInPeriod.toLocaleString('en-IN')}`, 20, y + 6);
    doc.text(`Advances Recovered (Period): Rs. ${payload.advancesReport.totalRecoveredInPeriod.toLocaleString('en-IN')}`, 20, y + 14);
    doc.text(`Net Period Balance: Rs. ${payload.advancesReport.netAdvanceBalanceInPeriod.toLocaleString('en-IN')}`, 105, y + 6);
    doc.text(`Outstanding Advances (All Time): Rs. ${payload.advancesReport.totalOutstandingAllTime.toLocaleString('en-IN')}`, 105, y + 14);

    y += 26;

    if (payload.advancesReport.workerSummaries.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Worker-wise Advances Breakdown', 14, y);
      y += 5;

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 7, 'F');
      doc.setFontSize(8);
      doc.text('Worker Name', 18, y + 5);
      doc.text('Given (Period)', 70, y + 5);
      doc.text('Recovered (Period)', 110, y + 5);
      doc.text('Cumulative Outstanding', 150, y + 5);
      y += 9;

      doc.setFont('helvetica', 'normal');
      payload.advancesReport.workerSummaries.forEach((w) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(w.workerName, 18, y);
        doc.text(`Rs. ${w.advancesGiven.toLocaleString('en-IN')}`, 70, y);
        doc.text(`Rs. ${w.advancesRecovered.toLocaleString('en-IN')}`, 110, y);
        doc.text(`Rs. ${w.totalOutstanding.toLocaleString('en-IN')}`, 150, y);
        y += 6;
      });
      y += 6;
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages} • Confidential - Generated by Chhutta POS Reports`, 14, 287);
  }

  doc.save(`${filename}.pdf`);
};

/**
 * Main export handler routing to requested format
 */
export const handleReportExport = (
  reportType: ExportReportType,
  format: ExportFormat,
  payload: ExportDataPayload
) => {
  const userRole = payload.userInfo?.role;
  const currentUserId = payload.userInfo?.id;

  const authValidation = validateReportAccess(userRole, 'export', reportType, undefined, currentUserId);
  if (!authValidation.allowed) {
    alert("You do not have permission to perform this action.");
    return;
  }

  const businessSlug = (payload.businessInfo?.name || 'business').toLowerCase().replace(/\s+/g, '_');
  const dateSlug = payload.dateFilterLabel.toLowerCase().replace(/\s+/g, '_');
  const filename = `${businessSlug}_${reportType}_report_${dateSlug}`;

  if (format === 'pdf') {
    exportToPDF(filename, payload, reportType);
    return;
  }

  if (format === 'excel') {
    const sheetsData: { name: string; data: Record<string, any>[] }[] = [];

    if (reportType === 'dashboard' || reportType === 'complete') {
      sheetsData.push({
        name: 'Dashboard KPI',
        data: [
          { Metric: 'Subtotal Revenue (INR)', Value: payload.filteredBills.reduce((acc, b) => acc + (b.subtotal || 0), 0) },
          { Metric: 'Total Staff Tips (INR)', Value: payload.filteredBills.reduce((acc, b) => acc + (b.tipAmount || 0), 0) },
          { Metric: 'Total Discounts Given (INR)', Value: payload.discountsGiven },
          { Metric: 'Gross Sales (Subtotal + Tips) (INR)', Value: payload.filteredBills.reduce((acc, b) => acc + (b.subtotal || 0) + (b.tipAmount || 0), 0) },
          { Metric: 'Net Sales Collected (INR)', Value: payload.totalSales },
          { Metric: 'Total Completed Receipts', Value: payload.totalBills },
          { Metric: 'Average Bill Value (INR)', Value: payload.avgBillValue },
          { Metric: 'Unique Customers Count', Value: payload.totalCustomers },
          { Metric: 'Selected Period', Value: payload.dateFilterLabel }
        ]
      });

      sheetsData.push({
        name: 'Recent Transactions',
        data: payload.filteredBills.map(b => ({
          InvoiceNumber: b.billNumber || b.id,
          Date: b.date,
          Time: b.time,
          CustomerName: b.customerName || 'Walk-in Customer',
          CustomerMobile: b.customerMobile || '',
          StaffAssigned: b.workerName || b.cashierName || 'Staff',
          PaymentMethod: b.paymentMethod,
          Subtotal: b.subtotal || 0,
          TipAmount: b.tipAmount || 0,
          Discount: b.discountAmount || 0,
          GrandTotal: b.grandTotal || 0
        }))
      });
    }

    if (reportType === 'workers' || reportType === 'complete') {
      sheetsData.push({
        name: 'Staff Reports',
        data: payload.workerSummaries.map(w => ({
          StaffName: w.workerName,
          Role: w.role,
          CustomersServed: w.customersServed,
          TotalBills: w.totalBills,
          TotalSales: w.totalSales,
          TipsReceived: w.tipsReceived || 0,
          DiscountsGiven: w.discountsGiven || 0,
          AvgBillValue: w.avgBillValue,
          CommissionEarned: w.commissionEarned,
          WorkingDays: w.workingDays,
          CashSales: w.cashSales,
          UPISales: w.upiSales,
          SplitSales: w.splitSales
        }))
      });
    }

    if (reportType === 'services' || reportType === 'complete') {
      sheetsData.push({
        name: 'Service Reports',
        data: payload.serviceSummaries.map(s => ({
          ServiceName: s.serviceName,
          Category: s.category,
          TimesPerformed: s.timesPerformed,
          RevenueGenerated: s.revenueGenerated,
          AvgSellingPrice: s.avgSellingPrice,
          PercentageOfTotalSales: s.percentageOfTotalSales,
          UniqueCustomers: s.uniqueCustomersCount
        }))
      });
    }

    if (reportType === 'products' || reportType === 'complete') {
      sheetsData.push({
        name: 'Product Inventory',
        data: payload.products.map(p => ({
          ProductName: p.name,
          Brand: p.brand || '',
          Category: p.category,
          CurrentStock: p.currentStock,
          StockUnit: p.stockUnit,
          PurchasePrice: p.purchasePrice,
          SellingPrice: p.sellingPrice,
          LowStockAlert: p.lowStockAlert
        }))
      });
    }

    if ((reportType === 'advances' || reportType === 'complete' || reportType === 'dashboard') && payload.advancesReport) {
      sheetsData.push({
        name: 'Worker Advances KPI',
        data: [
          { Metric: 'Total Advances Given (Period) (INR)', Value: payload.advancesReport.totalGivenInPeriod },
          { Metric: 'Total Advances Recovered (Period) (INR)', Value: payload.advancesReport.totalRecoveredInPeriod },
          { Metric: 'Net Period Advance Balance (INR)', Value: payload.advancesReport.netAdvanceBalanceInPeriod },
          { Metric: 'Total Outstanding Advances (All Time) (INR)', Value: payload.advancesReport.totalOutstandingAllTime },
          { Metric: 'Today Advances Given (INR)', Value: payload.advancesReport.todayGiven },
          { Metric: 'Today Advances Recovered (INR)', Value: payload.advancesReport.todayRecovered }
        ]
      });

      if (payload.advancesReport.workerSummaries.length > 0) {
        sheetsData.push({
          name: 'Worker Advances Summary',
          data: payload.advancesReport.workerSummaries.map(w => ({
            WorkerName: w.workerName,
            AdvancesGivenInPeriod: w.advancesGiven,
            AdvancesRecoveredInPeriod: w.advancesRecovered,
            NetPeriodBalance: w.netBalance,
            TotalCumulativeOutstanding: w.totalOutstanding,
            TransactionCountInPeriod: w.transactionCount
          }))
        });
      }

      if (payload.advancesReport.transactions.length > 0) {
        sheetsData.push({
          name: 'Advance Transactions Log',
          data: payload.advancesReport.transactions.map(a => ({
            AdvanceID: a.id,
            Date: a.date,
            Time: a.time,
            WorkerName: a.workerName,
            Type: a.type,
            Amount: a.amount,
            Notes: a.notes || a.reason || '',
            CreatedBy: a.createdBy
          }))
        });
      }
    }

    exportToExcel(filename, sheetsData);
    return;
  }

  if (format === 'csv') {
    if (reportType === 'dashboard') {
      const headers = ['Invoice Number', 'Date', 'Time', 'Customer', 'Mobile', 'Staff', 'Payment Method', 'Grand Total'];
      const rows = payload.filteredBills.map(b => [
        b.billNumber || b.id,
        b.date,
        b.time,
        b.customerName || 'Walk-in Customer',
        b.customerMobile || '',
        b.workerName || b.cashierName || 'Staff',
        b.paymentMethod,
        b.grandTotal
      ]);
      downloadCSV(filename, headers, rows);
    } else if (reportType === 'workers') {
      const headers = ['Staff Name', 'Role', 'Bills Count', 'Total Sales (INR)', 'Avg Bill Value', 'Commission Earned (INR)', 'Working Days'];
      const rows = payload.workerSummaries.map(w => [
        w.workerName,
        w.role,
        w.totalBills,
        w.totalSales,
        w.avgBillValue,
        w.commissionEarned,
        w.workingDays
      ]);
      downloadCSV(filename, headers, rows);
    } else if (reportType === 'services') {
      const headers = ['Service Name', 'Category', 'Times Performed', 'Revenue Generated (INR)', 'Avg Price', '% of Sales'];
      const rows = payload.serviceSummaries.map(s => [
        s.serviceName,
        s.category,
        s.timesPerformed,
        s.revenueGenerated,
        s.avgSellingPrice,
        `${s.percentageOfTotalSales}%`
      ]);
      downloadCSV(filename, headers, rows);
    } else if (reportType === 'products') {
      const headers = ['Product Name', 'Brand', 'Category', 'Current Stock', 'Stock Unit', 'Selling Price (INR)'];
      const rows = payload.products.map(p => [
        p.name,
        p.brand || '',
        p.category,
        p.currentStock,
        p.stockUnit,
        p.sellingPrice
      ]);
      downloadCSV(filename, headers, rows);
    } else if (reportType === 'advances') {
      const headers = ['Advance ID', 'Date', 'Time', 'Worker Name', 'Type', 'Amount (INR)', 'Notes', 'Created By'];
      const rows = (payload.advancesReport?.transactions || []).map(a => [
        a.id,
        a.date,
        a.time,
        a.workerName,
        a.type,
        a.amount,
        a.notes || a.reason || '',
        a.createdBy
      ]);
      downloadCSV(filename, headers, rows);
    } else {
      // Complete Report CSV
      const headers = ['Category/Type', 'Item/Person Name', 'Metric 1 (Count/Bills)', 'Metric 2 (Revenue/Total)'];
      const rows = [
        ['SUMMARY KPI', 'Total Sales', `${payload.totalBills} Bills`, `Rs. ${payload.totalSales}`],
        ...payload.workerSummaries.map(w => ['STAFF', w.workerName, `${w.totalBills} Bills`, `Rs. ${w.totalSales}`]),
        ...payload.serviceSummaries.map(s => ['SERVICE', s.serviceName, `${s.timesPerformed} Times`, `Rs. ${s.revenueGenerated}`]),
        ...payload.products.map(p => ['PRODUCT', p.name, `${p.currentStock} ${p.stockUnit}`, `Rs. ${p.sellingPrice}`]),
        ...(payload.advancesReport?.workerSummaries || []).map(w => ['WORKER ADVANCE', w.workerName, `Net: Rs. ${w.netBalance}`, `Outstanding: Rs. ${w.totalOutstanding}`])
      ];
      downloadCSV(filename, headers, rows);
    }
  }
};

/**
 * Triggers Print Window for A4 / Thermal Layout
 */
export const triggerReportPrint = (
  layout: 'a4' | 'thermal',
  payload: ExportDataPayload
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const businessName = payload.businessInfo?.name || 'CHHUTTA POS';

  let contentHtml = '';

  if (layout === 'thermal') {
    contentHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Thermal Summary Report</title>
        <style>
          body { font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; padding: 10px; font-size: 11px; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .flex { display: flex; justify-content: space-between; }
          @media print { body { width: 100%; margin: 0; } }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px;">${businessName.toUpperCase()}</div>
        <div class="center">BUSINESS SUMMARY REPORT</div>
        <div class="center" style="font-size: 10px;">${payload.dateFilterLabel.toUpperCase()}</div>
        <div class="divider"></div>
        <div class="flex"><span>TOTAL SALES:</span><span class="bold">Rs. ${payload.totalSales.toLocaleString('en-IN')}</span></div>
        <div class="flex"><span>TOTAL BILLS:</span><span class="bold">${payload.totalBills}</span></div>
        <div class="flex"><span>AVG TICKET:</span><span class="bold">Rs. ${payload.avgBillValue.toLocaleString('en-IN')}</span></div>
        <div class="flex"><span>DISCOUNTS:</span><span class="bold">Rs. ${payload.discountsGiven.toLocaleString('en-IN')}</span></div>
        <div class="flex"><span>CUSTOMERS:</span><span class="bold">${payload.totalCustomers}</span></div>
        <div class="divider"></div>
        <div class="bold">TOP SERVICES:</div>
        ${payload.serviceSummaries.slice(0, 5).map(s => `
          <div class="flex">
            <span>${s.serviceName.substring(0, 16)} (${s.timesPerformed}x)</span>
            <span>Rs. ${s.revenueGenerated}</span>
          </div>
        `).join('')}
        <div class="divider"></div>
        <div class="center" style="font-size: 9px;">Generated on ${new Date().toLocaleString('en-IN')}</div>
      </body>
      </html>
    `;
  } else {
    // A4 Paper Layout
    contentHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Business Report - ${businessName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; font-size: 12px; }
          h1 { font-size: 20px; color: #4f46e5; margin-bottom: 4px; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .kpi-title { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
          .kpi-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
          th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
          td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
          .section-title { font-size: 14px; font-weight: bold; margin-top: 20px; margin-bottom: 8px; color: #334155; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${businessName}</h1>
            <div style="font-weight: bold; color: #64748b;">Business Performance Report • ${payload.dateFilterLabel}</div>
          </div>
          <div style="text-align: right; font-size: 10px; color: #94a3b8;">
            Generated: ${new Date().toLocaleString('en-IN')}
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-title">Total Revenue</div>
            <div class="kpi-value">Rs. ${payload.totalSales.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Total Bills</div>
            <div class="kpi-value">${payload.totalBills}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Avg Ticket Value</div>
            <div class="kpi-value">Rs. ${payload.avgBillValue.toLocaleString('en-IN')}</div>
          </div>
        </div>

        ${payload.workerSummaries.length > 0 ? `
          <div class="section-title">Staff & Worker Summary</div>
          <table>
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Role</th>
                <th>Bills</th>
                <th>Total Sales</th>
                <th>Commission</th>
              </tr>
            </thead>
            <tbody>
              ${payload.workerSummaries.map(w => `
                <tr>
                  <td><strong>${w.workerName}</strong></td>
                  <td>${w.role || 'Staff'}</td>
                  <td>${w.totalBills}</td>
                  <td>Rs. ${w.totalSales.toLocaleString('en-IN')}</td>
                  <td>Rs. ${w.commissionEarned.toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${payload.serviceSummaries.length > 0 ? `
          <div class="section-title">Top Performed Services</div>
          <table>
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Category</th>
                <th>Times Performed</th>
                <th>Revenue Generated</th>
              </tr>
            </thead>
            <tbody>
              ${payload.serviceSummaries.slice(0, 10).map(s => `
                <tr>
                  <td><strong>${s.serviceName}</strong></td>
                  <td>${s.category}</td>
                  <td>${s.timesPerformed}x</td>
                  <td>Rs. ${s.revenueGenerated.toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${payload.advancesReport ? `
          <div class="section-title">Worker Advances & Cash Movements</div>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-title">Advances Given (Period)</div>
              <div class="kpi-value">Rs. ${payload.advancesReport.totalGivenInPeriod.toLocaleString('en-IN')}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Advances Recovered (Period)</div>
              <div class="kpi-value">Rs. ${payload.advancesReport.totalRecoveredInPeriod.toLocaleString('en-IN')}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Total Outstanding (All Time)</div>
              <div class="kpi-value">Rs. ${payload.advancesReport.totalOutstandingAllTime.toLocaleString('en-IN')}</div>
            </div>
          </div>
          ${payload.advancesReport.workerSummaries.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Worker Name</th>
                  <th>Given (Period)</th>
                  <th>Recovered (Period)</th>
                  <th>Cumulative Outstanding</th>
                </tr>
              </thead>
              <tbody>
                ${payload.advancesReport.workerSummaries.map(w => `
                  <tr>
                    <td><strong>${w.workerName}</strong></td>
                    <td>Rs. ${w.advancesGiven.toLocaleString('en-IN')}</td>
                    <td>Rs. ${w.advancesRecovered.toLocaleString('en-IN')}</td>
                    <td>Rs. ${w.totalOutstanding.toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
        ` : ''}
      </body>
      </html>
    `;
  }

  printWindow.document.write(contentHtml);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
};

/**
 * Report Sharing Utilities
 */
export const shareReport = async (
  channel: 'whatsapp' | 'email' | 'native' | 'copy',
  payload: ExportDataPayload
) => {
  const businessName = payload.businessInfo?.name || 'Chhutta POS';
  let summaryText = `📊 *${businessName} - Business Report (${payload.dateFilterLabel})*\n\n` +
    `💰 Total Sales: Rs. ${payload.totalSales.toLocaleString('en-IN')}\n` +
    `🧾 Total Bills: ${payload.totalBills}\n` +
    `🎟️ Avg Bill Value: Rs. ${payload.avgBillValue.toLocaleString('en-IN')}\n` +
    `🏷️ Discounts Given: Rs. ${payload.discountsGiven.toLocaleString('en-IN')}\n` +
    `👥 Customers Served: ${payload.totalCustomers}\n\n`;

  if (payload.advancesReport) {
    summaryText += `💵 Advances Given: Rs. ${payload.advancesReport.totalGivenInPeriod.toLocaleString('en-IN')}\n` +
      `💵 Advances Recovered: Rs. ${payload.advancesReport.totalRecoveredInPeriod.toLocaleString('en-IN')}\n` +
      `💵 Outstanding Advances: Rs. ${payload.advancesReport.totalOutstandingAllTime.toLocaleString('en-IN')}\n\n`;
  }

  summaryText += `Top Performed Services:\n` +
    payload.serviceSummaries.slice(0, 3).map((s, i) => `${i + 1}. ${s.serviceName} (${s.timesPerformed}x) - Rs. ${s.revenueGenerated}`).join('\n') +
    `\n\nGenerated via Chhutta POS App`;

  if (channel === 'whatsapp') {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(summaryText)}`;
    window.open(url, '_blank');
  } else if (channel === 'email') {
    const subject = `${businessName} - Business Report (${payload.dateFilterLabel})`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summaryText)}`;
    window.location.href = url;
  } else if (channel === 'native') {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${businessName} Business Report`,
          text: summaryText
        });
      } catch {
        await navigator.clipboard.writeText(summaryText);
        alert('Report summary copied to clipboard!');
      }
    } else {
      await navigator.clipboard.writeText(summaryText);
      alert('Report summary copied to clipboard!');
    }
  } else if (channel === 'copy') {
    await navigator.clipboard.writeText(summaryText);
    alert('Report summary copied to clipboard!');
  }
};
