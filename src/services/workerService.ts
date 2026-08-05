import { db, DbWorkerProfile, DbAttendanceRecord, DbBill } from '../database/db';

const MOCK_WORKERS_KEY = 'chhuta_worker_profiles';

export interface WorkerWageSummary {
  workerId: string;
  workerName: string;
  startDate: string;
  endDate: string;
  daysPresent: number;
  daysHalfDay: number;
  dailyWageRate: number;
  totalDailyWage: number;
  totalSales: number;
  commissionPercentage: number;
  totalCommission: number;
  tips: number;
  bonuses: number;
  deductions: number;
  totalPayableWage: number;
}

export interface WorkerTodayMetrics {
  todayCustomersCount: number;
  todaySalesTotal: number;
}

/**
 * Migration helper to ensure all existing staff records and owner have Worker Profiles.
 */
export async function syncAndMigrateWorkerProfiles(currentUserId?: string, currentUserName?: string, currentUserRole?: string): Promise<DbWorkerProfile[]> {
  try {
    // 1. Fetch existing worker profiles from Dexie or localStorage
    let existingWorkers: DbWorkerProfile[] = [];
    try {
      existingWorkers = await db.workerProfiles.toArray();
    } catch {
      const cached = localStorage.getItem(MOCK_WORKERS_KEY);
      if (cached) {
        existingWorkers = JSON.parse(cached);
      }
    }

    const workerMap = new Map<string, DbWorkerProfile>();
    existingWorkers.forEach(w => {
      workerMap.set(w.id, w);
      if (w.staffAccountId) workerMap.set(w.staffAccountId, w);
    });

    let modified = false;

    // 2. Ensure current logged-in user / Owner has a worker profile
    if (currentUserId) {
      const ownerWorkerId = `WORKER-${currentUserId}`;
      if (!workerMap.has(currentUserId) && !workerMap.has(ownerWorkerId)) {
        const ownerProfile: DbWorkerProfile = {
          id: ownerWorkerId,
          name: currentUserName || 'Store Owner',
          role: currentUserRole || 'OWNER',
          status: 'ACTIVE',
          loginEnabled: true,
          staffAccountId: currentUserId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        workerMap.set(ownerWorkerId, ownerProfile);
        existingWorkers.push(ownerProfile);
        modified = true;
      }
    }

    // 3. Migrate existing staff records from localStorage 'chhuta_mock_staff'
    const staffJson = localStorage.getItem('chhuta_mock_staff');
    if (staffJson) {
      const staffList = JSON.parse(staffJson);
      for (const staff of staffList) {
        const staffWorkerId = `WORKER-${staff.id}`;
        if (!workerMap.has(staff.id) && !workerMap.has(staffWorkerId)) {
          const newWorker: DbWorkerProfile = {
            id: staffWorkerId,
            name: staff.name || staff.fullName || staff.username || 'Staff Member',
            phone: staff.phoneNumber,
            role: staff.role || 'STAFF',
            status: staff.status === 'DISABLED' || staff.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
            loginEnabled: true,
            staffAccountId: staff.id,
            username: staff.username,
            email: staff.email,
            createdAt: staff.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          workerMap.set(staffWorkerId, newWorker);
          existingWorkers.push(newWorker);
          modified = true;
        }
      }
    }

    // If default demo workers needed when no non-owner staff exist
    const staffWorkers = existingWorkers.filter(w => w.role !== 'OWNER' && w.id !== `WORKER-${currentUserId}`);
    if (staffWorkers.length === 0) {
      const defaultWorkers: DbWorkerProfile[] = [
        {
          id: 'WORKER-101',
          name: 'Ramesh Kumar',
          role: 'Hair Stylist',
          phone: '+91 98765 43210',
          status: 'ACTIVE',
          loginEnabled: false,
          dailyWage: 600,
          commissionPercentage: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'WORKER-102',
          name: 'Rahul Sen',
          role: 'Senior Stylist',
          phone: '+91 98765 12345',
          status: 'ACTIVE',
          loginEnabled: false,
          dailyWage: 700,
          commissionPercentage: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'WORKER-103',
          name: 'Shiva Kumar',
          role: 'Washer & Assistant',
          phone: '+91 98123 45678',
          status: 'ACTIVE',
          loginEnabled: false,
          dailyWage: 400,
          commissionPercentage: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      for (const dw of defaultWorkers) {
        if (!workerMap.has(dw.id)) {
          workerMap.set(dw.id, dw);
          existingWorkers.push(dw);
          modified = true;
        }
      }
    }

    if (modified) {
      try {
        await db.workerProfiles.clear();
        await db.workerProfiles.bulkAdd(existingWorkers);
      } catch (err) {
        console.warn('Dexie bulkAdd warning:', err);
      }
      localStorage.setItem(MOCK_WORKERS_KEY, JSON.stringify(existingWorkers));
    }

    return existingWorkers;
  } catch (error) {
    console.error('Error syncing worker profiles:', error);
    const cached = localStorage.getItem(MOCK_WORKERS_KEY);
    return cached ? JSON.parse(cached) : [];
  }
}

/**
 * Get all worker profiles
 */
export async function getAllWorkerProfiles(): Promise<DbWorkerProfile[]> {
  try {
    const dbWorkers = await db.workerProfiles.toArray();
    if (dbWorkers.length > 0) {
      localStorage.setItem(MOCK_WORKERS_KEY, JSON.stringify(dbWorkers));
      return dbWorkers;
    }
  } catch (err) {
    console.warn('Falling back to local storage worker cache', err);
  }
  const cached = localStorage.getItem(MOCK_WORKERS_KEY);
  return cached ? JSON.parse(cached) : [];
}

/**
 * Save or update a Worker Profile
 */
export async function saveWorkerProfile(worker: DbWorkerProfile): Promise<DbWorkerProfile> {
  const updatedWorker = {
    ...worker,
    updatedAt: new Date().toISOString()
  };

  try {
    await db.workerProfiles.put(updatedWorker);
  } catch (err) {
    console.warn('Error saving worker profile to Dexie:', err);
  }

  // Update local storage cache
  const all = await getAllWorkerProfiles();
  const idx = all.findIndex(w => w.id === updatedWorker.id);
  if (idx >= 0) {
    all[idx] = updatedWorker;
  } else {
    all.push(updatedWorker);
  }
  localStorage.setItem(MOCK_WORKERS_KEY, JSON.stringify(all));

  return updatedWorker;
}

/**
 * Archive worker profile
 */
export async function archiveWorkerProfile(workerId: string): Promise<void> {
  const all = await getAllWorkerProfiles();
  const worker = all.find(w => w.id === workerId);
  if (worker) {
    worker.status = 'ARCHIVED';
    await saveWorkerProfile(worker);
  }
}

/**
 * Safe delete worker: Checks if transactions/bills exist.
 * Returns { deleted: boolean, archived: boolean, message: string }
 */
export async function deleteOrArchiveWorker(workerId: string): Promise<{ deleted: boolean; archived: boolean; message: string }> {
  let billCount = 0;
  try {
    billCount = await db.bills.where('workerId').equals(workerId).count();
  } catch {
    // If query fails, check bills array
    const bills = await db.bills.toArray();
    billCount = bills.filter(b => b.workerId === workerId).length;
  }

  if (billCount > 0) {
    await archiveWorkerProfile(workerId);
    return {
      deleted: false,
      archived: true,
      message: `Worker has ${billCount} sales record(s). Worker profile has been ARCHIVED instead of permanently deleted to preserve audit and report logs.`
    };
  }

  // If no transactions exist, safe to permanently delete
  try {
    await db.workerProfiles.delete(workerId);
  } catch (err) {
    console.warn('Dexie delete error:', err);
  }

  const all = await getAllWorkerProfiles();
  const filtered = all.filter(w => w.id !== workerId);
  localStorage.setItem(MOCK_WORKERS_KEY, JSON.stringify(filtered));

  return {
    deleted: true,
    archived: false,
    message: 'Worker profile successfully removed.'
  };
}

/**
 * Get Today's metrics for a worker (Sales count & Total sales amount)
 */
export async function getWorkerTodayMetrics(workerId: string): Promise<WorkerTodayMetrics> {
  const todayStr = new Date().toISOString().split('T')[0];
  try {
    const bills = await db.bills.where('date').equals(todayStr).toArray();
    const workerBills = bills.filter(b => b.workerId === workerId);
    const todaySalesTotal = workerBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    return {
      todayCustomersCount: workerBills.length,
      todaySalesTotal
    };
  } catch {
    return { todayCustomersCount: 0, todaySalesTotal: 0 };
  }
}

/**
 * Calculate Worker Wages for a given date range
 */
export async function calculateWorkerWages(
  workerId: string,
  startDate: string,
  endDate: string,
  extraTips: number = 0,
  extraBonuses: number = 0,
  extraDeductions: number = 0
): Promise<WorkerWageSummary> {
  const workers = await getAllWorkerProfiles();
  const worker = workers.find(w => w.id === workerId);

  const name = worker ? worker.name : 'Unknown Worker';
  const dailyWageRate = worker?.dailyWage || 0;
  const commissionPercentage = worker?.commissionPercentage || 0;

  // 1. Calculate sales in date range
  let salesTotal = 0;
  try {
    const bills = await db.bills.toArray();
    const rangeBills = bills.filter(b => b.workerId === workerId && b.date >= startDate && b.date <= endDate);
    salesTotal = rangeBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
  } catch (err) {
    console.warn('Error querying bills for wage calculation:', err);
  }

  // 2. Calculate Attendance days
  let daysPresent = 0;
  let daysHalfDay = 0;
  try {
    const attendance = await db.attendanceRecords.toArray();
    const workerAtt = attendance.filter(a => a.workerId === workerId && a.date >= startDate && a.date <= endDate);
    daysPresent = workerAtt.filter(a => a.status === 'PRESENT').length;
    daysHalfDay = workerAtt.filter(a => a.status === 'HALF_DAY').length;
  } catch (err) {
    console.warn('Error querying attendance for wage calculation:', err);
  }

  const totalDailyWage = (daysPresent * dailyWageRate) + (daysHalfDay * 0.5 * dailyWageRate);
  const totalCommission = (salesTotal * commissionPercentage) / 100;
  const totalPayableWage = totalDailyWage + totalCommission + extraTips + extraBonuses - extraDeductions;

  return {
    workerId,
    workerName: name,
    startDate,
    endDate,
    daysPresent,
    daysHalfDay,
    dailyWageRate,
    totalDailyWage,
    totalSales: salesTotal,
    commissionPercentage,
    totalCommission,
    tips: extraTips,
    bonuses: extraBonuses,
    deductions: extraDeductions,
    totalPayableWage
  };
}
