/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  CreditCard, 
  Package, 
  AlertTriangle, 
  Users, 
  Plus, 
  ShoppingBag, 
  BarChart3, 
  Settings, 
  Sparkles, 
  Building, 
  MapPin, 
  Clock, 
  ArrowRight,
  ChevronRight,
  QrCode
} from 'lucide-react';

import { db } from '../database/db';

export const Dashboard: React.FC = () => {
  const { business } = useAuth();
  const { isExpired } = useSubscription();
  const navigate = useNavigate();

  // Dynamic state loaded from local databases
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [activeStaff, setActiveStaff] = useState(0);

  const [todaySales, setTodaySales] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [cashSales, setCashSales] = useState(0);
  const [upiSales, setUpiSales] = useState(0);

  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const prodCount = await db.products.count();
        setTotalProducts(prodCount);

        const allProds = await db.products.toArray();
        const lowProds = allProds.filter(p => p.currentStock <= p.lowStockAlert);
        setLowStockCount(lowProds.length);

        // Fetch billing metrics
        const todayStr = new Date().toISOString().split('T')[0];
        const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM
        const allBills = await db.bills.toArray();

        let tSales = 0;
        let tOrders = 0;
        let mRevenue = 0;
        let cSales = 0;
        let uSales = 0;

        for (const bill of allBills) {
          if (bill.date === todayStr) {
            tSales += bill.grandTotal;
            tOrders += 1;
            cSales += bill.cashAmount;
            uSales += bill.upiAmount;
          }
          if (bill.date.startsWith(currentMonthPrefix)) {
            mRevenue += bill.grandTotal;
          }
        }

        setTodaySales(tSales);
        setTodayOrders(tOrders);
        setMonthlyRevenue(mRevenue);
        setCashSales(cSales);
        setUpiSales(uSales);
      } catch (e) {
        console.error('Error fetching live stats from IndexedDB:', e);
      }
    };

    fetchLiveStats();

    try {
      const staff = JSON.parse(localStorage.getItem('chhuta_mock_staff') || '[]');
      setActiveStaff(staff.length);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleNav = (path: string, blockExpired: boolean = false) => {
    if (isExpired && blockExpired) {
      alert('Subscription Expired. Please renew your plan to access this section.');
      navigate('/subscription');
    } else {
      navigate(path);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-slate-100 max-w-5xl mx-auto pb-12">
      
      {/* 1. Welcome & Store Active Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-md">
              <Sparkles size={12} className="animate-pulse shrink-0" />
              <span>ChhuttaPOS Active Store Console</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {business?.name || 'My Local Business'}
            </h2>
            
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1 shrink-0">
                <Building size={14} />
                Category: <strong className="text-slate-600 dark:text-slate-300 capitalize">{business?.type?.toLowerCase() || 'Hybrid'} Trade</strong>
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <MapPin size={14} />
                ID: <strong className="text-indigo-600 dark:text-indigo-400 font-mono uppercase">{business?.id || 'CP-SETUP'}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Secure Offline Storage Active
            </span>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Sales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Today's Sales</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg md:text-xl font-bold text-slate-950 dark:text-white">₹{todaySales.toFixed(2)}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Daily gross billing</p>
          </div>
        </div>

        {/* Card 2: Today's Orders */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Today's Orders</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <ShoppingCart size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg md:text-xl font-bold text-slate-950 dark:text-white">{todayOrders}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Completed purchases</p>
          </div>
        </div>

        {/* Card 3: Monthly Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Monthly Revenue</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <DollarSign size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg md:text-xl font-bold text-slate-950 dark:text-white">₹{monthlyRevenue.toFixed(2)}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Current month gross</p>
          </div>
        </div>

        {/* Card 4: Cash Sales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cash Sales</span>
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
              <CreditCard size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg md:text-xl font-bold text-slate-950 dark:text-white">₹{cashSales.toFixed(2)}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Physical tender drawer</p>
          </div>
        </div>

        {/* Card 5: UPI Sales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">UPI Sales</span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <QrCode size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg md:text-xl font-bold text-slate-950 dark:text-white">₹{upiSales.toFixed(2)}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Digital merchant settlement</p>
          </div>
        </div>

        {/* Card 6: Total Products */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Products</span>
            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <Package size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg md:text-xl font-bold text-slate-950 dark:text-white">{totalProducts}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Active items registered</p>
          </div>
        </div>

        {/* Card 7: Low Stock Items */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Low Stock Items</span>
            <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg md:text-xl font-bold text-slate-950 dark:text-white">{lowStockCount}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Below critical threshold</p>
          </div>
        </div>

        {/* Card 8: Active Staff */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Staff</span>
            <span className="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400">
              <Users size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg md:text-xl font-bold text-slate-950 dark:text-white">{activeStaff}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Authorized terminals active</p>
          </div>
        </div>
      </div>

      {/* 3. Quick Actions Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Quick Terminal Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => handleNav('/pos')}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-600 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 text-left transition-all cursor-pointer group"
          >
            <div className="p-2 w-fit rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
              <Plus size={16} />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">New Sale</h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Launch cash register</p>
          </button>

          <button
            onClick={() => handleNav('/products')}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-600 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/10 text-left transition-all cursor-pointer group"
          >
            <div className="p-2 w-fit rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
              <Package size={16} />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Add Product</h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Register catalog items</p>
          </button>

          <button
            onClick={() => handleNav('/reports')}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-600 hover:bg-amber-50/10 dark:hover:bg-amber-950/10 text-left transition-all cursor-pointer group"
          >
            <div className="p-2 w-fit rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 mb-3 group-hover:scale-110 transition-transform">
              <BarChart3 size={16} />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Reports</h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">View analytics insights</p>
          </button>

          <button
            onClick={() => handleNav('/settings')}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-pink-600 hover:bg-pink-50/10 dark:hover:bg-pink-950/10 text-left transition-all cursor-pointer group"
          >
            <div className="p-2 w-fit rounded-lg bg-pink-50 dark:bg-pink-950 text-pink-600 dark:text-pink-400 mb-3 group-hover:scale-110 transition-transform">
              <Settings size={16} />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Settings</h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Manage terminal configuration</p>
          </button>
        </div>
      </div>

      {/* 4. Main Two-Column Analytics Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Recent Transactions */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag size={14} />
                Recent Transactions
              </h3>
            </div>

            {/* Empty State - Required copy */}
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-slate-100 dark:border-slate-800/80 rounded-xl h-full min-h-[180px]">
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 mb-3">
                <ShoppingBag size={18} />
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                No sales yet. Your dashboard will begin displaying business insights after your first completed transaction.
              </p>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Top Selling Products */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} />
                Top Selling Products
              </h3>
            </div>

            {/* Empty State */}
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-slate-100 dark:border-slate-800/80 rounded-xl h-full min-h-[180px]">
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 mb-3">
                <Package size={18} />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal max-w-xs">
                No inventory performance data available. Top-performing catalog items will list here.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
