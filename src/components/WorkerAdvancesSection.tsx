/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  DollarSign, 
  Plus, 
  Minus, 
  History, 
  Trash2, 
  Calendar, 
  User, 
  FileText, 
  AlertCircle, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2,
  Coins,
  X
} from 'lucide-react';
import { db, DbWorkerAdvance, DbWorkerProfile } from '../database/db';

interface WorkerAdvancesSectionProps {
  workers: DbWorkerProfile[];
  currentUserId?: string;
  currentUserName?: string;
}

export const WorkerAdvancesSection: React.FC<WorkerAdvancesSectionProps> = ({
  workers,
  currentUserId,
  currentUserName
}) => {
  // Live query for all worker advances from Dexie (Offline-first local store)
  const allAdvances = useLiveQuery(() => db.workerAdvances.toArray(), []) || [];

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modal states
  const [showGiveModal, setShowGiveModal] = useState<boolean>(false);
  const [showRecoverModal, setShowRecoverModal] = useState<boolean>(false);

  // Form states
  const todayStr = new Date().toISOString().split('T')[0];
  const [targetWorkerId, setTargetWorkerId] = useState<string>('');
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [advanceDate, setAdvanceDate] = useState<string>(todayStr);
  const [advanceNotes, setAdvanceNotes] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to calculate outstanding advance for a specific worker
  const calculateWorkerOutstanding = (workerId: string): number => {
    const workerLogs = allAdvances.filter(a => a.workerId === workerId);
    const given = workerLogs.filter(a => a.type === 'GIVE').reduce((acc, a) => acc + (a.amount || 0), 0);
    const recovered = workerLogs.filter(a => a.type === 'RECOVER').reduce((acc, a) => acc + (a.amount || 0), 0);
    return Math.max(0, given - recovered);
  };

  // Calculate total outstanding advance across all workers
  const activeWorkers = workers.filter(w => w.status === 'ACTIVE');
  const totalOutstandingAcrossAll = activeWorkers.reduce((acc, w) => acc + calculateWorkerOutstanding(w.id), 0);
  const workersWithAdvancesCount = activeWorkers.filter(w => calculateWorkerOutstanding(w.id) > 0).length;

  // Open Give modal for specific worker
  const handleOpenGive = (workerId?: string) => {
    setTargetWorkerId(workerId || (activeWorkers[0]?.id || ''));
    setAdvanceAmount('');
    setAdvanceDate(todayStr);
    setAdvanceNotes('');
    setShowGiveModal(true);
  };

  // Open Recover modal for specific worker
  const handleOpenRecover = (workerId?: string) => {
    setTargetWorkerId(workerId || (activeWorkers[0]?.id || ''));
    setAdvanceAmount('');
    setAdvanceDate(todayStr);
    setAdvanceNotes('');
    setShowRecoverModal(true);
  };

  // Handle Give Advance submission
  const handleSubmitGive = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(advanceAmount);
    if (!targetWorkerId) {
      showToast('Please select a valid worker.', 'error');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid advance amount greater than ₹0.', 'error');
      return;
    }

    const workerObj = workers.find(w => w.id === targetWorkerId);
    if (!workerObj) {
      showToast('Selected worker not found.', 'error');
      return;
    }

    try {
      const now = new Date();
      const newAdvance: DbWorkerAdvance = {
        id: `ADV-${now.getTime()}-${Math.floor(Math.random() * 1000)}`,
        workerId: workerObj.id,
        workerName: workerObj.name,
        type: 'GIVE',
        amount: amountNum,
        date: advanceDate || todayStr,
        time: now.toTimeString().split(' ')[0],
        notes: advanceNotes.trim() || 'Worker advance given',
        timestamp: now.getTime(),
        createdBy: currentUserName || 'System',
        createdById: currentUserId
      };

      await db.workerAdvances.add(newAdvance);
      showToast(`Successfully issued ₹${amountNum} advance to ${workerObj.name}!`);
      setShowGiveModal(false);
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to record advance: ${err.message || err}`, 'error');
    }
  };

  // Handle Recover Advance submission
  const handleSubmitRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(advanceAmount);
    if (!targetWorkerId) {
      showToast('Please select a valid worker.', 'error');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid recovery amount greater than ₹0.', 'error');
      return;
    }

    const workerObj = workers.find(w => w.id === targetWorkerId);
    if (!workerObj) {
      showToast('Selected worker not found.', 'error');
      return;
    }

    const currentOutstanding = calculateWorkerOutstanding(workerObj.id);
    if (amountNum > currentOutstanding) {
      const confirmed = window.confirm(`Warning: Recovery amount (₹${amountNum}) exceeds current outstanding advance (₹${currentOutstanding}). Do you still want to proceed?`);
      if (!confirmed) return;
    }

    try {
      const now = new Date();
      const newAdvance: DbWorkerAdvance = {
        id: `ADV-${now.getTime()}-${Math.floor(Math.random() * 1000)}`,
        workerId: workerObj.id,
        workerName: workerObj.name,
        type: 'RECOVER',
        amount: amountNum,
        date: advanceDate || todayStr,
        time: now.toTimeString().split(' ')[0],
        notes: advanceNotes.trim() || 'Worker advance recovered',
        timestamp: now.getTime(),
        createdBy: currentUserName || 'System',
        createdById: currentUserId
      };

      await db.workerAdvances.add(newAdvance);
      showToast(`Successfully recovered ₹${amountNum} advance from ${workerObj.name}!`);
      setShowRecoverModal(false);
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to record recovery: ${err.message || err}`, 'error');
    }
  };

  // Delete advance log entry
  const handleDeleteAdvanceLog = async (logId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this advance transaction record?');
    if (!confirmed) return;

    try {
      await db.workerAdvances.delete(logId);
      showToast('Advance transaction record deleted.');
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to delete record: ${err.message || err}`, 'error');
    }
  };

  // Filter advances history
  const filteredHistory = allAdvances
    .filter(a => {
      const matchesWorker = selectedWorkerId === 'all' || a.workerId === selectedWorkerId;
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        a.workerName.toLowerCase().includes(term) ||
        (a.notes || '').toLowerCase().includes(term) ||
        a.date.includes(term);
      return matchesWorker && matchesSearch;
    })
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all animate-fade-in ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-600 text-white' 
            : 'bg-rose-600 text-white'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Overview Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Outstanding Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Outstanding Advances</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
              <Coins size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              ₹{totalOutstandingAcrossAll.toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-slate-400">Total active advance balance across staff</p>
          </div>
        </div>

        {/* Staff with Advances Count */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workers with Advances</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <User size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {workersWithAdvancesCount} / {activeWorkers.length}
            </div>
            <p className="text-[10px] text-slate-400">Active staff members with open balances</p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenGive()}
            className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            <Plus size={14} />
            <span>Give Advance</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenRecover()}
            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-slate-200 dark:border-slate-700"
          >
            <Minus size={14} />
            <span>Recover Advance</span>
          </button>
        </div>
      </div>

      {/* Worker-wise Outstanding Advances Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Coins size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span>Worker Advance Balances</span>
            </h3>
            <p className="text-[10px] text-slate-400">Outstanding advance balances and quick management per worker</p>
          </div>
        </div>

        {activeWorkers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No active worker profiles found in system.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeWorkers.map(w => {
              const outstanding = calculateWorkerOutstanding(w.id);
              const workerLogs = allAdvances.filter(a => a.workerId === w.id);
              const totalGiven = workerLogs.filter(a => a.type === 'GIVE').reduce((acc, a) => acc + a.amount, 0);
              const totalRecovered = workerLogs.filter(a => a.type === 'RECOVER').reduce((acc, a) => acc + a.amount, 0);

              return (
                <div 
                  key={w.id}
                  className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {w.name}
                      </span>
                      <span className="text-[9px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                        {w.role}
                      </span>
                    </div>
                    {w.phone && (
                      <p className="text-[10px] text-slate-400">{w.phone}</p>
                    )}
                  </div>

                  {/* Balance Display */}
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-medium">Outstanding Advance</span>
                      <span className={`text-sm font-black font-mono ${outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
                        ₹{outstanding.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1">
                      <span>Total Given: ₹{totalGiven}</span>
                      <span>Recovered: ₹{totalRecovered}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenGive(w.id)}
                      className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1 border border-indigo-200/40 dark:border-indigo-800/40"
                    >
                      <Plus size={12} />
                      <span>Give</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRecover(w.id)}
                      className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1 border border-emerald-200/40 dark:border-emerald-800/40"
                    >
                      <Minus size={12} />
                      <span>Recover</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedWorkerId(w.id)}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700"
                      title="View history logs for this worker"
                    >
                      <History size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction History Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <History size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span>Advance Transaction Audit Log</span>
            </h3>
            <p className="text-[10px] text-slate-400">Complete historical record of advances given and recovered (Dexie Offline Store)</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search notes or worker..."
                className="pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white w-40 sm:w-48"
              />
            </div>

            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Workers</option>
              {activeWorkers.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No advance transaction logs found for selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Worker Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Notes / Reason</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredHistory.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition-all">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {log.date} {log.time && <span className="opacity-75">({log.time})</span>}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                      {log.workerName}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {log.type === 'GIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50">
                          <ArrowUpRight size={10} />
                          <span>GIVEN</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
                          <ArrowDownRight size={10} />
                          <span>RECOVERED</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-extrabold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                      ₹{log.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {log.notes || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDeleteAdvanceLog(log.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all cursor-pointer"
                        title="Delete log entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GIVE ADVANCE MODAL */}
      {showGiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Plus size={16} className="text-indigo-600" />
                <span>Issue Worker Advance</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowGiveModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitGive} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Select Worker</label>
                <select
                  value={targetWorkerId}
                  onChange={(e) => setTargetWorkerId(e.target.value)}
                  required
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  {activeWorkers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.role}) — Outstanding: ₹{calculateWorkerOutstanding(w.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Advance Cash Amount (₹)</label>
                <input
                  type="number"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="e.g. 1000"
                  required
                  min="1"
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Date</label>
                <input
                  type="date"
                  value={advanceDate}
                  onChange={(e) => setAdvanceDate(e.target.value)}
                  required
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Notes / Reason (Optional)</label>
                <textarea
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  placeholder="Reason for advance..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGiveModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase cursor-pointer shadow-md"
                >
                  Issue Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECOVER ADVANCE MODAL */}
      {showRecoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Minus size={16} className="text-emerald-600" />
                <span>Recover Worker Advance</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRecoverModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitRecover} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Select Worker</label>
                <select
                  value={targetWorkerId}
                  onChange={(e) => setTargetWorkerId(e.target.value)}
                  required
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  {activeWorkers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.role}) — Outstanding: ₹{calculateWorkerOutstanding(w.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Recovery Cash Amount (₹)</label>
                <input
                  type="number"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="e.g. 500"
                  required
                  min="1"
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Date</label>
                <input
                  type="date"
                  value={advanceDate}
                  onChange={(e) => setAdvanceDate(e.target.value)}
                  required
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Notes / Reason (Optional)</label>
                <textarea
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  placeholder="Salary deduction / cash return..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRecoverModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase cursor-pointer shadow-md"
                >
                  Recover Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
