/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  User, 
  Phone, 
  Tag, 
  CreditCard, 
  Check, 
  Printer, 
  X, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  Database,
  CheckCircle2,
  AlertTriangle,
  History,
  Edit,
  Share2,
  QrCode,
  ChevronDown,
  Lock,
  Coins
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db, DbProduct, DbBill, DbStockHistory, DbWorkerProfile } from '../database/db';
import { syncAndMigrateWorkerProfiles } from '../services/workerService';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { SubscriptionGuard } from '../components/SubscriptionGuard';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ReceiptPreviewModal } from '../components/ReceiptPreviewModal';
import { UserCheck } from 'lucide-react';

interface CartItem {
  product: DbProduct;
  quantity: number;
}

export const POSPlaceholder: React.FC = () => {
  const { user, business } = useAuth();
  const { isExpired } = useSubscription();
  const navigate = useNavigate();
  const cashierName = user?.fullName || 'Cashier Admin';
  const businessName = business?.name || 'ChhuttaPOS';
  const taxNumber = business?.taxNumber || '';

  // Tab State for POS Navigation
  const [posTab, setPosTab] = useState<'checkout' | 'history'>('checkout');

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Bill currently being edited state
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  // Bills history and search state
  const [billsHistory, setBillsHistory] = useState<DbBill[]>([]);
  const [historySearch, setHistorySearch] = useState('');

  // Clock state for real-time undo countdown
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Owner Payment Settings state
  const [paymentSettings, setPaymentSettings] = useState<any>(() => {
    const defaults = {
      upiId: '',
      businessName: '',
      businessPhone: '',
      merchantName: '',
    };
    const saved = localStorage.getItem('chhutta_owner_payment_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return defaults;
  });

  const [nextBillNo, setNextBillNo] = useState('BILL-000001');

  useEffect(() => {
    const fetchNextBillNo = async () => {
      try {
        const count = await db.bills.count();
        const nextNumStr = String(count + 1).padStart(6, '0');
        setNextBillNo(`BILL-${nextNumStr}`);
      } catch (e) {
        console.error(e);
      }
    };
    fetchNextBillNo();
  }, [posTab, billsHistory]);

  // Billing settings state
  const [billingSettings, setBillingSettings] = useState<any>({
    lockUpiAfterPayment: false,
    lockSplitAfterPayment: false,
    allowCashUndo60s: true,
    requirePinForUndo: false,
    lockAllCompleted: false,
    allowEditingCompleted: true,
  });

  // Products and states
  const [shareMobile, setShareMobile] = useState('');
  const [showWhatsAppPrompt, setShowWhatsAppPrompt] = useState(false);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');

  // Assigned Worker state (single source of truth)
  const [workers, setWorkers] = useState<DbWorkerProfile[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [isWorkerDropdownOpen, setIsWorkerDropdownOpen] = useState(false);

  // Derived selected worker & name
  const selectedWorker = workers.find(w => w.id === selectedWorkerId);
  const selectedWorkerName = selectedWorker?.name || (selectedWorkerId ? '' : cashierName);

  // Load workers and auto-assign
  const loadWorkers = async () => {
    try {
      const list = await syncAndMigrateWorkerProfiles(user?.id, user?.fullName, user?.role);
      const activeList = list.filter(w => w.status !== 'ARCHIVED' && w.status !== 'INACTIVE' && w.status !== 'DISABLED');
      setWorkers(activeList);

      if (activeList.length > 0) {
        setSelectedWorkerId(prevId => {
          if (prevId && activeList.some(w => w.id === prevId)) {
            return prevId;
          }
          const matchingUserWorker = activeList.find(w => w.staffAccountId === user?.id || w.id === `WORKER-${user?.id}`);
          const defaultWorker = matchingUserWorker || activeList[0];
          return defaultWorker.id;
        });
      }
    } catch (e) {
      console.error('Error loading workers in POS:', e);
    }
  };

  const handleSelectWorker = (workerId: string) => {
    if (workerId) {
      setSelectedWorkerId(workerId);
    }
  };
  
  // Discount & Tip state
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [tipValue, setTipValue] = useState<string>('');

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'SPLIT'>('CASH');
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitUpi, setSplitUpi] = useState<string>('');

  // UI state for Toast and Receipt Modal
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<DbBill | null>(null);

  // Load products and worker profiles on mount
  useEffect(() => {
    loadProducts();
    loadWorkers();
  }, [user?.id]);

  // Synchronize billing settings & history
  const loadBillsHistory = async () => {
    try {
      const allBills = await db.bills.orderBy('timestamp').reverse().toArray();
      setBillsHistory(allBills);
    } catch (err) {
      console.error('Error loading bills history:', err);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('chhutta_billing_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBillingSettings({
          allowCashUndo60s: true, // fallback default
          ...parsed
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaults = {
        lockUpiAfterPayment: false,
        lockSplitAfterPayment: false,
        allowCashUndo60s: true,
        requirePinForUndo: false,
        lockAllCompleted: false,
        allowEditingCompleted: true,
      };
      localStorage.setItem('chhutta_billing_settings', JSON.stringify(defaults));
      setBillingSettings(defaults);
    }

    const savedPayment = localStorage.getItem('chhutta_owner_payment_settings');
    if (savedPayment) {
      try {
        setPaymentSettings(JSON.parse(savedPayment));
      } catch (e) {
        console.error(e);
      }
    } else {
      setPaymentSettings({
        upiId: '',
        businessName: '',
        businessPhone: '',
        merchantName: '',
      });
    }

    loadBillsHistory();
  }, [posTab]);

  // Clock tick effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper helper functions
  const isBillLocked = (bill: DbBill) => {
    if (!billingSettings.allowEditingCompleted) return true;
    if (billingSettings.lockAllCompleted) return true;
    if (bill.paymentMethod === 'UPI' && billingSettings.lockUpiAfterPayment) return true;
    if (bill.paymentMethod === 'SPLIT' && billingSettings.lockSplitAfterPayment) return true;
    return false;
  };

  const getCashUndoSecondsLeft = (bill: DbBill) => {
    if (bill.paymentMethod !== 'CASH') return 0;
    const elapsedMs = currentTime - bill.timestamp;
    const remainingSecs = Math.max(0, 60 - Math.floor(elapsedMs / 1000));
    return remainingSecs;
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const allProducts = await db.products.toArray();
      setProducts(allProducts);
    } catch (err) {
      console.error('Error loading products from IndexedDB:', err);
      showToast('Error loading active product catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Pre-seed template items if catalog is completely empty
  const handlePreseed = async () => {
    try {
      setLoading(true);
      const sampleProducts: DbProduct[] = [
        {
          id: 'prod_g1',
          brand: 'Tata',
          name: 'Premium CTC Loose Tea',
          variant: '1kg Packet',
          category: 'Groceries',
          purchasePrice: 280,
          sellingPrice: 340,
          tax: 5,
          stockUnit: 'Packet',
          openingStock: 30,
          currentStock: 30,
          lowStockAlert: 8,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prod_b2',
          brand: 'Amul',
          name: 'Salted Pasteurised Butter',
          variant: '500g Block',
          category: 'Dairy',
          purchasePrice: 215,
          sellingPrice: 250,
          tax: 12,
          stockUnit: 'Piece',
          openingStock: 12,
          currentStock: 12,
          lowStockAlert: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'prod_s3',
          brand: 'Haldirams',
          name: 'Allo Bhujia Crispy Snacks',
          variant: '400g Sachet',
          category: 'Snacks',
          purchasePrice: 68,
          sellingPrice: 85,
          tax: 12,
          stockUnit: 'Sachet',
          openingStock: 50,
          currentStock: 50,
          lowStockAlert: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      for (const p of sampleProducts) {
        await db.products.add(p);
        
        const now = new Date();
        const historyLog: DbStockHistory = {
          productId: p.id,
          productName: p.name,
          brand: p.brand,
          variant: p.variant,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          action: 'Created',
          quantityChanged: p.openingStock,
          reason: 'Initial standard template pre-seed registration',
          previousStock: 0,
          newStock: p.openingStock,
          timestamp: now.getTime()
        };
        await db.stockHistory.add(historyLog);
      }

      showToast('Successfully seeded inventory with template items!');
      await loadProducts();
    } catch (err) {
      console.error(err);
      showToast('Seeding error encountered', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add Product or Service to Cart
  const addToCart = (product: DbProduct) => {
    const isService = product.itemType === 'SERVICE';
    if (!isService && product.currentStock <= 0) {
      showToast(`"${product.name}" is out of stock!`, 'error');
      return;
    }

    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (!isService && currentQty >= product.currentStock) {
        showToast(`Cannot add more. Only ${product.currentStock} units available in stock.`, 'error');
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    showToast(`Added ${product.name} to bill`, 'success');
  };

  // Update Cart Quantity
  const updateQuantity = (productId: string, valStr: string) => {
    const qty = parseInt(valStr, 10);
    const cartItem = cart.find(item => item.product.id === productId);
    if (!cartItem) return;

    if (isNaN(qty) || qty <= 0) {
      // Remove item
      setCart(cart.filter(item => item.product.id !== productId));
      return;
    }

    const isService = cartItem.product.itemType === 'SERVICE';

    if (!isService && qty > cartItem.product.currentStock) {
      showToast(`Cannot exceed available stock level (${cartItem.product.currentStock} units)`, 'error');
      const updatedCart = cart.map(item => {
        if (item.product.id === productId) {
          return { ...item, quantity: item.product.currentStock };
        }
        return item;
      });
      setCart(updatedCart);
      return;
    }

    const updatedCart = cart.map(item => {
      if (item.product.id === productId) {
        return { ...item, quantity: qty };
      }
      return item;
    });
    setCart(updatedCart);
  };

  const incrementQuantity = (productId: string) => {
    const item = cart.find(c => c.product.id === productId);
    if (!item) return;
    updateQuantity(productId, String(item.quantity + 1));
  };

  const decrementQuantity = (productId: string) => {
    const item = cart.find(c => c.product.id === productId);
    if (!item) return;
    updateQuantity(productId, String(item.quantity - 1));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
    showToast('Item removed from active cart', 'info');
  };

  const clearCart = () => {
    setCart([]);
    setDiscountType('none');
    setDiscountValue('');
    setTipValue('');
    setCustomerName('');
    setCustomerMobile('');
    setPaymentMethod('CASH');
    setSplitCash('');
    setSplitUpi('');
    setEditingBillId(null);
    showToast('Active checkout cart cleared', 'info');
  };

  // Save changes to edited bill
  const handleSaveBillEdit = async () => {
    if (!editingBillId) return;

    if (cart.length === 0) {
      showToast('Billing cart is empty! Cannot save bill changes.', 'error');
      return;
    }

    const hasZeroOrNegative = cart.some(item => item.quantity <= 0);
    if (hasZeroOrNegative) {
      showToast('Billing item quantities must be greater than zero.', 'error');
      return;
    }

    // Verify split payment validity if it was SPLIT
    if (paymentMethod === 'SPLIT' && !isSplitValid) {
      showToast(`Invalid Split Payment: Total split (₹${splitSum.toFixed(2)}) must equal grand total (₹${grandTotal.toFixed(2)}).`, 'error');
      return;
    }

    try {
      const originalBill = await db.bills.get(editingBillId);
      if (!originalBill) {
        showToast('Original bill not found in database.', 'error');
        return;
      }

      // 1. Revert original stock levels
      for (const origItem of originalBill.items) {
        const dbProd = await db.products.get(origItem.productId);
        if (dbProd) {
          const revertedStock = dbProd.currentStock + origItem.quantity;
          await db.products.update(origItem.productId, {
            currentStock: revertedStock,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 2. Validate new stock availability (using reverted baseline)
      for (const newItem of cart) {
        const dbProd = await db.products.get(newItem.product.id);
        if (!dbProd || dbProd.currentStock < newItem.quantity) {
          // Rollback: Re-apply the original bill stock changes if edit validation fails
          for (const origItem of originalBill.items) {
            const dp = await db.products.get(origItem.productId);
            if (dp) {
              await db.products.update(origItem.productId, {
                currentStock: Math.max(0, dp.currentStock - origItem.quantity)
              });
            }
          }
          showToast(`Stock levels validation failed: ${newItem.product.name} only has ${dbProd?.currentStock || 0} units left!`, 'error');
          return;
        }
      }

      // 3. Deduct new edited stock levels
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];

      for (const newItem of cart) {
        const dbProd = await db.products.get(newItem.product.id);
        if (dbProd) {
          const finalStock = dbProd.currentStock - newItem.quantity;
          await db.products.update(newItem.product.id, {
            currentStock: finalStock,
            updatedAt: now.toISOString()
          });

          // Log Stock Modification History
          const historyLog: DbStockHistory = {
            productId: newItem.product.id,
            productName: dbProd.name,
            brand: dbProd.brand,
            variant: dbProd.variant,
            date: dateStr,
            time: timeStr,
            action: 'Reduced',
            quantityChanged: -newItem.quantity,
            reason: `Modified Sale ${editingBillId}`,
            previousStock: dbProd.currentStock,
            newStock: finalStock,
            timestamp: now.getTime()
          };
          await db.stockHistory.add(historyLog);
        }
      }

      // 4. Update bill record in IndexedDB
      const updatedBill: DbBill = {
        ...originalBill,
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          brand: item.product.brand,
          variant: item.product.variant,
          category: item.product.category,
          sellingPrice: item.product.sellingPrice,
          quantity: item.quantity,
          lineTotal: item.product.sellingPrice * item.quantity
        })),
        subtotal,
        tipAmount: calculatedTip,
        discountType,
        discountValue: dValue,
        discountAmount: calculatedDiscount,
        grandTotal,
        cashAmount: paymentMethod === 'CASH' ? grandTotal : (paymentMethod === 'SPLIT' ? numericSplitCash : 0),
        upiAmount: paymentMethod === 'UPI' ? grandTotal : (paymentMethod === 'SPLIT' ? numericSplitUpi : 0)
      };

      await db.bills.put(updatedBill);
      showToast(`Bill ${editingBillId} changes saved successfully!`, 'success');

      // Clear edit states and active cart
      setEditingBillId(null);
      setCart([]);
      setDiscountType('none');
      setDiscountValue('');
      setTipValue('');
      setCustomerName('');
      setCustomerMobile('');
      setSplitCash('');
      setSplitUpi('');

      // Reload references and head to history log
      await loadProducts();
      await loadBillsHistory();
      setPosTab('history');
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to edit transaction: ${err.message || err}`, 'error');
    }
  };

  // Delete completed bill permanently
  const handleDeleteBill = async (billId: string) => {
    if (billingSettings.requirePinForUndo) {
      const pin = window.prompt("Enter Owner/Manager security PIN to authenticate bill deletion:");
      if (!pin) return;
      if (pin !== "1234") {
        showToast("Invalid administrative security PIN!", "error");
        return;
      }
    }

    const confirmed = window.confirm(`Are you sure you want to delete bill ${billId} permanently? This will restore product stock levels.`);
    if (!confirmed) return;

    try {
      const bill = await db.bills.get(billId);
      if (!bill) {
        showToast('Receipt record not found.', 'error');
        return;
      }

      // Restore product stocks
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];

      for (const item of bill.items) {
        const dbProd = await db.products.get(item.productId);
        if (dbProd) {
          const restoredStock = dbProd.currentStock + item.quantity;
          await db.products.update(item.productId, {
            currentStock: restoredStock,
            updatedAt: now.toISOString()
          });

          // Record restocked log entry
          const historyLog: DbStockHistory = {
            productId: item.productId,
            productName: dbProd.name,
            brand: dbProd.brand,
            variant: dbProd.variant,
            date: dateStr,
            time: timeStr,
            action: 'Restocked',
            quantityChanged: item.quantity,
            reason: `Restored on deletion of ${billId}`,
            previousStock: dbProd.currentStock,
            newStock: restoredStock,
            timestamp: now.getTime()
          };
          await db.stockHistory.add(historyLog);
        }
      }

      // Delete record from Dexie
      await db.bills.delete(billId);
      showToast(`Bill ${billId} deleted permanently. Stocks restored.`, 'success');

      // Refresh data
      await loadProducts();
      await loadBillsHistory();
    } catch (err: any) {
      console.error(err);
      showToast(`Deletion failed: ${err.message || err}`, 'error');
    }
  };

  // Undo CASH transaction within 60-second window
  const handleUndoCashBill = async (bill: DbBill) => {
    if (billingSettings.requirePinForUndo) {
      const pin = window.prompt("Enter Owner/Manager security PIN to authorize this Cash Undo:");
      if (!pin) return;
      if (pin !== "1234") {
        showToast("Invalid administrative security PIN!", "error");
        return;
      }
    }

    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];

      // Restore stocks
      for (const item of bill.items) {
        const dbProd = await db.products.get(item.productId);
        if (dbProd) {
          const restoredStock = dbProd.currentStock + item.quantity;
          await db.products.update(item.productId, {
            currentStock: restoredStock,
            updatedAt: now.toISOString()
          });

          // Record restocked movement
          const historyLog: DbStockHistory = {
            productId: item.productId,
            productName: dbProd.name,
            brand: dbProd.brand,
            variant: dbProd.variant,
            date: dateStr,
            time: timeStr,
            action: 'Restocked',
            quantityChanged: item.quantity,
            reason: `Reverted on Undo Cash of ${bill.id}`,
            previousStock: dbProd.currentStock,
            newStock: restoredStock,
            timestamp: now.getTime()
          };
          await db.stockHistory.add(historyLog);
        }
      }

      // Repopulate cart with undone transaction items
      const cartItems: CartItem[] = [];
      for (const item of bill.items) {
        const dbProd = await db.products.get(item.productId);
        if (dbProd) {
          cartItems.push({
            product: dbProd,
            quantity: item.quantity
          });
        }
      }
      setCart(cartItems);

      // Restore state fields
      setCustomerName(bill.customerName === 'Walk-in Customer' ? '' : bill.customerName);
      setCustomerMobile(bill.customerMobile || '');
      setDiscountType(bill.discountType);
      setDiscountValue(bill.discountValue > 0 ? String(bill.discountValue) : '');
      setTipValue(bill.tipAmount ? String(bill.tipAmount) : '');
      setPaymentMethod('CASH');

      // Delete the bill
      await db.bills.delete(bill.id);

      showToast(`Bill ${bill.id} successfully undone! Items reloaded for quick adjustment.`, 'success');

      // Switch view and refresh products
      await loadProducts();
      await loadBillsHistory();
      setPosTab('checkout');
    } catch (err: any) {
      console.error(err);
      showToast(`Undo failed: ${err.message || err}`, 'error');
    }
  };

  const triggerCheckoutConfirmation = () => {
    if (isExpired) {
      showToast('Free Trial / Subscription Expired. Customer billing is disabled.', 'error');
      navigate('/subscription');
      return;
    }

    // 1. Validation
    if (cart.length === 0) {
      showToast('Billing cart is empty! Please add products.', 'error');
      return;
    }

    const hasZeroOrNegative = cart.some(item => item.quantity <= 0);
    if (hasZeroOrNegative) {
      showToast('Billing item quantities must be greater than zero.', 'error');
      return;
    }

    if (paymentMethod === 'SPLIT' && !isSplitValid) {
      showToast(`Invalid Split Payment: Total split (₹${splitSum.toFixed(2)}) must equal grand total (₹${grandTotal.toFixed(2)}).`, 'error');
      return;
    }

    setShowConfirmDialog(true);
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  const calculatedTip = Math.max(0, Number(tipValue) || 0);
  
  let calculatedDiscount = 0;
  const dValue = Number(discountValue) || 0;
  if (discountType === 'percentage' && dValue > 0) {
    calculatedDiscount = (subtotal * Math.min(100, dValue)) / 100;
  } else if (discountType === 'fixed' && dValue > 0) {
    calculatedDiscount = Math.min(subtotal, dValue);
  }

  const grandTotal = Math.max(0, subtotal + calculatedTip - calculatedDiscount);

  // Live validation for Split payment
  const numericSplitCash = Number(splitCash) || 0;
  const numericSplitUpi = Number(splitUpi) || 0;
  const splitSum = numericSplitCash + numericSplitUpi;
  const isSplitValid = Math.abs(splitSum - grandTotal) < 0.01;

  // Search filter
  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      p.name.toLowerCase().includes(term) ||
      (p.brand || '').toLowerCase().includes(term) ||
      (p.variant || '').toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term);

    const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  // Complete checkout process
  const handleCheckout = async () => {
    if (isExpired) {
      showToast('Free Trial / Subscription Expired. Customer billing is disabled.', 'error');
      navigate('/subscription');
      return;
    }

    // 1. Validation
    if (cart.length === 0) {
      showToast('Billing cart is empty! Please add products.', 'error');
      return;
    }

    const hasZeroOrNegative = cart.some(item => item.quantity <= 0);
    if (hasZeroOrNegative) {
      showToast('Billing item quantities must be greater than zero.', 'error');
      return;
    }

    // Verify stock availability for physical products
    for (const item of cart) {
      if (item.product.itemType === 'SERVICE') continue;
      const dbProd = await db.products.get(item.product.id);
      if (!dbProd || dbProd.currentStock < item.quantity) {
        showToast(`Out-of-stock warning: ${item.product.name} only has ${dbProd?.currentStock || 0} units left!`, 'error');
        return;
      }
    }

    if (paymentMethod === 'SPLIT' && !isSplitValid) {
      showToast(`Invalid Split Payment: Total split (₹${splitSum.toFixed(2)}) must equal grand total (₹${grandTotal.toFixed(2)}).`, 'error');
      return;
    }

    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];

      // Sequential bill numbers
      const billCount = await db.bills.count();
      const nextNumStr = String(billCount + 1).padStart(6, '0');
      const billNumber = `BILL-${nextNumStr}`;

      const assignedWorkerName = selectedWorkerName || cashierName;
      const assignedWorkerId = selectedWorkerId || undefined;

      const newBill: DbBill = {
        id: billNumber,
        billNumber,
        timestamp: now.getTime(),
        date: dateStr,
        time: timeStr,
        cashierName: assignedWorkerName,
        workerId: assignedWorkerId,
        workerName: assignedWorkerName,
        businessId: business?.id || undefined,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerMobile: customerMobile.trim() || undefined,
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          brand: item.product.brand,
          variant: item.product.variant,
          category: item.product.category,
          sellingPrice: item.product.sellingPrice,
          quantity: item.quantity,
          lineTotal: item.product.sellingPrice * item.quantity
        })),
        subtotal,
        tipAmount: calculatedTip,
        discountType,
        discountValue: dValue,
        discountAmount: calculatedDiscount,
        grandTotal,
        paymentMethod,
        cashAmount: paymentMethod === 'CASH' ? grandTotal : (paymentMethod === 'SPLIT' ? numericSplitCash : 0),
        upiAmount: paymentMethod === 'UPI' ? grandTotal : (paymentMethod === 'SPLIT' ? numericSplitUpi : 0)
      };

      // 2. Reduce Stock and create stockHistory
      for (const item of cart) {
        const prodId = item.product.id;
        const dbProd = await db.products.get(prodId);
        if (dbProd) {
          const finalStock = Math.max(0, dbProd.currentStock - item.quantity);
          // Update product stock
          await db.products.update(prodId, {
            currentStock: finalStock,
            updatedAt: now.toISOString()
          });

          // Record stock movement history ledger
          const historyLog: DbStockHistory = {
            productId: prodId,
            productName: dbProd.name,
            brand: dbProd.brand,
            variant: dbProd.variant,
            date: dateStr,
            time: timeStr,
            action: 'Reduced',
            quantityChanged: -item.quantity,
            reason: `Sold in Sale ${billNumber}`,
            previousStock: dbProd.currentStock,
            newStock: finalStock,
            timestamp: now.getTime()
          };
          await db.stockHistory.add(historyLog);
        }
      }

      // 3. Save Bill
      await db.bills.add(newBill);

      showToast(`Sale successfully billed as ${billNumber}!`, 'success');
      
      // Update our product listing screen reference and history cache
      await loadProducts();
      await loadBillsHistory();
      
      // Show Printable Receipt Modal
      setActiveReceipt(newBill);

      // Clear Cart state
      setCart([]);
      setDiscountType('none');
      setDiscountValue('');
      setTipValue('');
      setCustomerName('');
      setCustomerMobile('');
      setSplitCash('');
      setSplitUpi('');
    } catch (err: any) {
      console.error('Checkout billing error:', err);
      showToast(`Billing pipeline failed: ${err.message || err}`, 'error');
    }
  };

  const handleWhatsAppShare = (customMobile?: string) => {
    const targetMobile = customMobile || activeReceipt?.customerMobile || '';
    if (!targetMobile) {
      setShareMobile('');
      setShowWhatsAppPrompt(true);
      return;
    }
    
    // Format phone number (strip non-digits)
    let cleanMobile = targetMobile.replace(/\D/g, '');
    if (cleanMobile.length === 10) {
      cleanMobile = '91' + cleanMobile; // default to India prefix
    }
    
    const itemsText = activeReceipt?.items.map(item => `• ${item.productName} (x${item.quantity}): ₹${item.lineTotal.toFixed(2)}`).join('\n') || '';
    
    const paymentDetails = activeReceipt?.paymentMethod === 'SPLIT'
      ? `Split (Cash: ₹${activeReceipt.cashAmount.toFixed(2)}, UPI: ₹${activeReceipt.upiAmount.toFixed(2)})`
      : activeReceipt?.paymentMethod;

    const msg = `*Thank you for shopping at ${paymentSettings.businessName || businessName}!* 🙏\n\n` +
                `*Bill No:* ${activeReceipt?.billNumber}\n` +
                `*Date:* ${activeReceipt?.date} ${activeReceipt?.time}\n` +
                `---------------------------------\n` +
                `*Items Purchased:*\n${itemsText}\n` +
                `---------------------------------\n` +
                `*Grand Total:* ₹${activeReceipt?.grandTotal.toFixed(2)}\n` +
                `*Payment Method:* ${paymentDetails}\n\n` +
                `Have a wonderful day! Visit again soon. ✨`;

    const url = `https://api.whatsapp.com/send?phone=${cleanMobile}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setShowWhatsAppPrompt(false);
  };

  // In-page Print trigger using clean React hidden container method (Requirement 8)
  const triggerPrintReceipt = () => {
    window.print();
  };

  // Hidden print block injected dynamically for iframe-safe optional physical printing
  const printStyle = `
    @media print {
      body {
        background: white !important;
        color: black !important;
      }
      /* Hide standard page elements */
      #root, header, nav, footer, button, .no-print {
        display: none !important;
      }
      /* Expand printable area */
      #print-receipt-area {
        display: block !important;
        width: 80mm !important;
        padding: 4mm !important;
        margin: 0 auto !important;
        font-family: 'Courier New', Courier, monospace !important;
        font-size: 11px !important;
        color: black !important;
        background: white !important;
      }
      #print-receipt-area * {
        visibility: visible !important;
      }
    }
    #print-receipt-area {
      display: none;
    }
  `;

  return (
    <div className="max-w-7xl mx-auto py-4 px-4 space-y-6 font-sans text-slate-800 dark:text-slate-100">
      
      {/* Inject styling rules dynamically */}
      <style>{printStyle}</style>

      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                : toast.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                  : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={15} /> : toast.type === 'error' ? <AlertTriangle size={15} /> : <AlertCircle size={15} />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminal Title Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 no-print">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md">
            <Database size={11} />
            <span>Sprint 1.1 Offline Checkout Engine</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Active POS Terminal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cashier / Worker: <strong className="text-slate-700 dark:text-slate-350">{selectedWorkerName || cashierName}</strong> • Business: <strong className="text-slate-700 dark:text-slate-350">{businessName}</strong>
          </p>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 no-print">
        <button
          onClick={() => setPosTab('checkout')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            posTab === 'checkout'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingCart size={15} />
          <span>New Sale (POS Terminal)</span>
        </button>
        <button
          onClick={() => setPosTab('history')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer relative ${
            posTab === 'history'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History size={15} />
          <span>Billing History</span>
          {billsHistory.length > 0 && (
            <span className="absolute -top-0.5 right-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {billsHistory.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Terminal Interface Splitter wrapped in active tab */}
      {posTab === 'checkout' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start no-print">
        
        {/* Left Section: Catalog & Fast Search (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Quick Filters Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl p-4 space-y-3.5 shadow-sm">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Fast search catalog by brand, product name, variant or category..."
                className="w-full h-10 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>

            {/* Category selection bar */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-500 hover:text-slate-850 dark:hover:text-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog grid */}
          {loading ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850">
              <RefreshCw className="animate-spin text-indigo-500 mx-auto mb-2" size={24} />
              <p className="text-xs font-semibold text-slate-400">Loading offline catalogue cache...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-4">
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-800">
                <ShoppingCart className="text-slate-400" size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Matching Products</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  There are no products matching your search term. You can seed demo items to quickly test.
                </p>
                {products.length === 0 && (
                  <button
                    onClick={handlePreseed}
                    className="mt-3 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-150/50 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Sparkles size={13} /> Load Demo Seed Items
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map(p => {
                const isService = p.itemType === 'SERVICE';
                const isOut = !isService && p.currentStock <= 0;
                const isDisabled = isService ? (p.isActive === false) : isOut;
                const inCart = cart.find(item => item.product.id === p.id);
                const remainingStock = p.currentStock - (inCart?.quantity || 0);
                
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={isDisabled}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between space-y-3.5 cursor-pointer transition-all ${
                      isDisabled
                        ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-900 opacity-60 cursor-not-allowed'
                        : (!isService && remainingStock <= 0)
                          ? 'bg-amber-50/10 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/60 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-850 hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600'
                    }`}
                  >
                    <div className="space-y-1 w-full">
                      <div className="flex justify-between items-start gap-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest block truncate px-1.5 py-0.5 rounded ${
                          isService
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                            : 'text-slate-400'
                        }`}>
                          {isService ? 'Service' : (p.brand || 'No Brand')}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider shrink-0 bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200/50">
                          {p.category}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white leading-snug line-clamp-2">
                        {p.name}
                      </h4>
                      {p.variant && !isService && (
                        <span className="inline-block text-[9px] font-semibold text-slate-400">
                          {p.variant}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between w-full border-t border-slate-50 dark:border-slate-850/60 pt-2.5">
                      <div>
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold block">Price</span>
                        <strong className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                          ₹{p.sellingPrice.toFixed(2)}
                        </strong>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold block">
                          {isService ? 'Duration' : 'Stock'}
                        </span>
                        {isService ? (
                          <span className="text-[9px] font-extrabold text-purple-600 dark:text-purple-400">
                            ⏱️ {p.durationMinutes || 30} mins
                          </span>
                        ) : isOut ? (
                          <span className="text-[9px] font-bold text-rose-500 uppercase">Out</span>
                        ) : remainingStock <= 0 ? (
                          <span className="text-[9px] font-bold text-amber-500 uppercase">Maxed</span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-500 uppercase">
                            {remainingStock} left
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Section: Active Cart Lane & Checkout Details (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {isExpired && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-800 dark:text-red-300 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Lock size={18} className="text-red-600 shrink-0" />
                <span className="text-xs font-medium">
                  <strong>Customer Billing Disabled:</strong> Your free trial or subscription has expired. Please subscribe or renew to continue checkout billing.
                </span>
              </div>
              <button
                onClick={() => navigate('/subscription')}
                className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                Subscribe / Renew
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-3xl p-5 shadow-sm space-y-4">
            
            {editingBillId && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-3 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-amber-500" size={15} />
                  <span>Editing sale: <strong>{editingBillId}</strong> (Cashier & payment method locked)</span>
                </div>
                <button
                  onClick={() => {
                    setEditingBillId(null);
                    clearCart();
                  }}
                  className="font-extrabold text-[10px] uppercase hover:underline text-amber-600 dark:text-amber-400 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Cart Header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-indigo-500" size={18} />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Active Checkout Cart</h3>
                <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {cart.length} items
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ShoppingCart className="mx-auto text-slate-300" size={32} />
                <p className="text-xs font-semibold">Your checkout cart is empty</p>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                  Click on products in the catalog on the left to begin building the customer bill.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                {cart.map(item => (
                  <div
                    key={item.product.id}
                    className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <h5 className="font-bold text-slate-800 dark:text-white truncate">
                        {item.product.name}
                      </h5>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        {item.product.variant && <span>{item.product.variant}</span>}
                        <span>•</span>
                        <strong>₹{item.product.sellingPrice.toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => decrementQuantity(item.product.id)}
                        className="w-7 h-7 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center cursor-pointer font-bold"
                      >
                        <Minus size={11} />
                      </button>
                      
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product.id, e.target.value)}
                        className="w-10 h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />

                      <button
                        onClick={() => incrementQuantity(item.product.id)}
                        className="w-7 h-7 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center cursor-pointer font-bold"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    {/* Line total and Delete */}
                    <div className="text-right shrink-0 min-w-16">
                      <div className="font-black text-slate-900 dark:text-white">
                        ₹{(item.product.sellingPrice * item.quantity).toFixed(2)}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 transition-all inline-block mt-0.5 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Optional Customer Details */}
            <div className="border-t border-slate-100 dark:border-slate-850/60 pt-4 space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <User size={12} />
                <span>Customer Profile (Optional)</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full h-8 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">Mobile Number</label>
                  <input
                    type="text"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full h-8 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Assigned Worker Section */}
            <div className="border-t border-slate-100 dark:border-slate-850/60 pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                  <UserCheck size={13} />
                  <span>Assigned Worker / Stylist</span>
                </div>
                {selectedWorkerName && (
                  <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-200/50">
                    {selectedWorkerName}
                  </span>
                )}
              </div>

              {workers.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic bg-slate-50 dark:bg-slate-950 p-2 rounded-xl">
                  Defaulting to Cashier ({cashierName}).
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Custom Dropdown Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsWorkerDropdownOpen(!isWorkerDropdownOpen)}
                      className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between gap-2 focus:outline-none focus:border-indigo-500 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                    >
                      <span className="truncate">
                        {selectedWorker ? (
                          `${selectedWorker.name} (${selectedWorker.role})${selectedWorker.dailyWage ? ` • ₹${selectedWorker.dailyWage}/day` : ''}`
                        ) : (
                          `Default Cashier (${cashierName})`
                        )}
                      </span>
                      <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isWorkerDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu Popup */}
                    {isWorkerDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-20" 
                          onClick={() => setIsWorkerDropdownOpen(false)} 
                        />
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 animate-in fade-in slide-in-from-top-2 duration-150">
                          {workers.map((w) => {
                            const isSelected = selectedWorkerId === w.id;
                            return (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => {
                                  handleSelectWorker(w.id);
                                  setIsWorkerDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 font-bold text-indigo-600 dark:text-indigo-300'
                                    : 'text-slate-700 dark:text-slate-200 font-medium'
                                }`}
                              >
                                <div className="truncate pr-2">
                                  <div className="font-bold flex items-center gap-1.5">
                                    <span>{w.name}</span>
                                    <span className="text-[10px] font-normal text-slate-400">({w.role})</span>
                                  </div>
                                  {w.dailyWage ? (
                                    <div className="text-[10px] text-slate-400 font-normal">Wage: ₹{w.dailyWage}/day</div>
                                  ) : null}
                                </div>
                                {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quick Pill Selection */}
                  <div className="flex flex-wrap gap-1.5">
                    {workers.slice(0, 5).map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          handleSelectWorker(w.id);
                          setIsWorkerDropdownOpen(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                          selectedWorkerId === w.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Discounts Section */}
            <div className="border-t border-slate-100 dark:border-slate-850/60 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <Tag size={12} />
                  <span>Manual Store Discount</span>
                </div>
                {discountType !== 'none' && (
                  <button
                    onClick={() => {
                      setDiscountType('none');
                      setDiscountValue('');
                    }}
                    className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Remove Discount
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('none');
                    setDiscountValue('');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                    discountType === 'none'
                      ? 'bg-slate-150 dark:bg-slate-800 border-slate-250 dark:border-slate-700 text-slate-800 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  No Discount
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('percentage')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                    discountType === 'percentage'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  Percentage (%)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                    discountType === 'fixed'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  Fixed Amount (₹)
                </button>
              </div>

              {discountType !== 'none' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">
                    {discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Cash Amount (₹)'}
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 150'}
                    className="w-full h-8 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Tip Section */}
            <div className="border-t border-slate-100 dark:border-slate-850/60 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <Coins size={12} className="text-indigo-500" />
                  <span>Worker / Staff Tip (Fixed ₹)</span>
                </div>
                {Number(tipValue) > 0 && (
                  <button
                    type="button"
                    onClick={() => setTipValue('')}
                    className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Clear Tip
                  </button>
                )}
              </div>

              <div className="flex gap-1.5">
                {[10, 20, 50, 100].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTipValue(String(preset))}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                      tipValue === String(preset)
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    +₹{preset}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">Custom Tip Amount (₹)</label>
                <input
                  type="number"
                  value={tipValue}
                  onChange={(e) => setTipValue(e.target.value)}
                  placeholder="e.g. 50"
                  min="0"
                  className="w-full h-8 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="border-t border-slate-100 dark:border-slate-850/60 pt-4 space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <CreditCard size={12} />
                <span>Payment Modality {editingBillId && <span className="text-[9px] text-amber-500 font-bold tracking-normal uppercase">(Locked on Edit)</span>}</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={editingBillId !== null}
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all cursor-pointer border ${
                    paymentMethod === 'CASH'
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950'
                  } ${editingBillId !== null ? 'opacity-55 cursor-not-allowed' : ''}`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  disabled={editingBillId !== null}
                  onClick={() => setPaymentMethod('UPI')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all cursor-pointer border ${
                    paymentMethod === 'UPI'
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950'
                  } ${editingBillId !== null ? 'opacity-55 cursor-not-allowed' : ''}`}
                >
                  UPI Scan
                </button>
                <button
                  type="button"
                  disabled={editingBillId !== null}
                  onClick={() => {
                    setPaymentMethod('SPLIT');
                    // auto prefill cash split
                    setSplitCash(String(Math.floor(grandTotal / 2)));
                    setSplitUpi(String(grandTotal - Math.floor(grandTotal / 2)));
                  }}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all cursor-pointer border ${
                    paymentMethod === 'SPLIT'
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950'
                  } ${editingBillId !== null ? 'opacity-55 cursor-not-allowed' : ''}`}
                >
                  Split Pay
                </button>
              </div>

              {/* Split payment input fields */}
              {paymentMethod === 'SPLIT' && (
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850/60 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Cash Received (₹)</label>
                      <input
                        type="number"
                        disabled={editingBillId !== null}
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value)}
                        placeholder="0"
                        className="w-full h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-black focus:outline-none focus:border-indigo-500 disabled:opacity-55 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">UPI Received (₹)</label>
                      <input
                        type="number"
                        disabled={editingBillId !== null}
                        value={splitUpi}
                        onChange={(e) => setSplitUpi(e.target.value)}
                        placeholder="0"
                        className="w-full h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-black focus:outline-none focus:border-indigo-500 disabled:opacity-55 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Split matching status */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400">Split Total entered:</span>
                    {isSplitValid ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <Check size={12} /> Validated ₹{splitSum.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold flex items-center gap-1">
                        <AlertTriangle size={12} /> ₹{splitSum.toFixed(2)} / ₹{grandTotal.toFixed(2)} (Delta: ₹{Math.abs(grandTotal - splitSum).toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic UPI QR Code Section */}
            {(paymentMethod === 'UPI' || paymentMethod === 'SPLIT') && (
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/40 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1">
                    <QrCode size={12} />
                    <span>Dynamic Payment QR</span>
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                    {nextBillNo}
                  </span>
                </div>

                {!paymentSettings.upiId ? (
                  <div className="text-center p-3 text-amber-600 dark:text-amber-400 text-[11px] font-medium leading-normal bg-amber-50/50 dark:bg-amber-950/10 rounded-xl border border-amber-200/50 dark:border-amber-900/40 space-y-1">
                    <p className="font-bold">Business UPI ID is not configured. Please ask the Owner to complete Payment Settings.</p>
                    <p className="text-[10px] opacity-80">Please configure your UPI ID in Settings.</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="bg-white p-2 rounded-xl border border-slate-100 shrink-0 shadow-sm">
                      <QRCodeSVG
                        value={`upi://pay?pa=${encodeURIComponent(paymentSettings.upiId)}&pn=${encodeURIComponent(paymentSettings.businessName || businessName)}&am=${grandTotal.toFixed(2)}&tn=${nextBillNo}`}
                        size={100}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="text-left space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                        ₹{grandTotal.toFixed(2)}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                        Scan using any UPI app (GPay, PhonePe, Paytm, BHIM) to pay instantly.
                      </p>
                      <div className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded inline-block">
                        VPA: {paymentSettings.upiId}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Totals Summary */}
            <div className="border-t border-slate-150 dark:border-slate-800 pt-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">₹{subtotal.toFixed(2)}</span>
              </div>
              {calculatedTip > 0 && (
                <div className="flex justify-between text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                  <span>Tip</span>
                  <span>+₹{calculatedTip.toFixed(2)}</span>
                </div>
              )}
              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-xs text-rose-500 font-bold">
                  <span>Discount</span>
                  <span>-₹{calculatedDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed border-slate-100 dark:border-slate-850">
                <span className="font-extrabold text-slate-900 dark:text-white">FINAL TOTAL</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <SubscriptionGuard message="Free Trial / Subscription Expired. Customer billing is disabled. Please subscribe or renew to continue.">
              <button
                onClick={editingBillId ? handleSaveBillEdit : triggerCheckoutConfirmation}
                disabled={cart.length === 0 || (paymentMethod === 'SPLIT' && !isSplitValid)}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-500/10"
              >
                <CheckCircle2 size={16} />
                {editingBillId ? 'Save Edited Transaction' : 'Complete Checkout & Save Sale'}
              </button>
            </SubscriptionGuard>

          </div>
        </div>

      </div>
      )}

      {/* ========================================== */}
      {/* BILLING HISTORY SUB-TAB VIEW              */}
      {/* ========================================== */}
      {posTab === 'history' && (
        <div className="space-y-6 no-print animate-fade-in">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Total Sales count</span>
                <strong className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                  {billsHistory.length} bills
                </strong>
              </div>
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center border border-indigo-100/50">
                <Receipt size={18} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Total Bill Revenue</span>
                <strong className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                  ₹{billsHistory.reduce((sum, b) => sum + b.grandTotal, 0).toFixed(2)}
                </strong>
              </div>
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center border border-emerald-100/40">
                <Database size={18} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Cash Register</span>
                <strong className="text-xl font-black text-slate-700 dark:text-slate-200 mt-1 block">
                  ₹{billsHistory.reduce((sum, b) => sum + b.cashAmount, 0).toFixed(2)}
                </strong>
              </div>
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center">
                <CreditCard size={18} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">UPI Registers</span>
                <strong className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                  ₹{billsHistory.reduce((sum, b) => sum + b.upiAmount, 0).toFixed(2)}
                </strong>
              </div>
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                <Check size={18} />
              </div>
            </div>
          </div>

          {/* Search History Filter */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl p-4 flex gap-3 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search history by receipt number, customer name, cashier or product name..."
                className="w-full h-10 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>
          </div>

          {/* Bills List */}
          {billsHistory.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-850 space-y-3">
              <History size={32} className="mx-auto text-slate-300" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-350">No Bills Recorded Yet</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                No billing transactions are found in IndexedDB storage. Completed transactions will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {billsHistory
                .filter(bill => {
                  const s = historySearch.toLowerCase();
                  if (!s) return true;
                  return (
                    bill.billNumber.toLowerCase().includes(s) ||
                    bill.customerName.toLowerCase().includes(s) ||
                    (bill.customerMobile || '').includes(s) ||
                    bill.cashierName.toLowerCase().includes(s) ||
                    bill.items.some(it => it.productName.toLowerCase().includes(s))
                  );
                })
                .map(bill => {
                  const locked = isBillLocked(bill);
                  const undoSeconds = getCashUndoSecondsLeft(bill);
                  const isCashAndUndoable = bill.paymentMethod === 'CASH' && undoSeconds > 0 && !locked;

                  return (
                    <div
                      key={bill.id}
                      className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all hover:shadow-md"
                    >
                      
                      {/* Left: Metadata */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm font-black text-slate-950 dark:text-white">
                            {bill.billNumber}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200/50">
                            {bill.date} {bill.time}
                          </span>
                          
                          {/* Payment Method badge */}
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                            bill.paymentMethod === 'CASH'
                              ? 'bg-slate-50 dark:bg-slate-950 text-slate-600 border border-slate-200/50'
                              : bill.paymentMethod === 'UPI'
                                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                                : 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                          }`}>
                            {bill.paymentMethod}
                          </span>

                          {/* Lock/Editable Protection Badges */}
                          {locked ? (
                            <span className="bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-rose-200/40 inline-flex items-center gap-1">
                              <AlertTriangle size={11} /> Locked
                            </span>
                          ) : (
                            <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200/30 inline-flex items-center gap-1">
                              <CheckCircle2 size={11} /> Editable
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 font-medium">
                          <div>Customer: <strong className="text-slate-800 dark:text-slate-200">{bill.customerName}</strong> {bill.customerMobile && `(${bill.customerMobile})`}</div>
                          <div>Cashier / Worker: <strong className="text-slate-800 dark:text-slate-200">{bill.workerName || bill.cashierName}</strong></div>
                          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                            Items: {bill.items.map(it => `${it.productName} (${it.quantity})`).join(', ')}
                          </div>
                        </div>
                      </div>

                      {/* Right: Total & Action Controls */}
                      <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3 shrink-0">
                        <div className="text-left md:text-right">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Grand Total</span>
                          <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                            ₹{bill.grandTotal.toFixed(2)}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          
                          {/* Undo Cash Button (60s Limit) */}
                          {isCashAndUndoable && (
                            <button
                              onClick={() => handleUndoCashBill(bill)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm shadow-amber-500/10"
                            >
                              <History size={12} className="animate-spin" style={{ animationDuration: '3s' }} />
                              <span>Undo Cash ({undoSeconds}s)</span>
                            </button>
                          )}

                          {/* Print Receipt button */}
                          <button
                            onClick={() => setActiveReceipt(bill)}
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-600 dark:text-slate-350 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Printer size={12} />
                            <span>Print</span>
                          </button>

                          {/* Edit Bill Button */}
                          {!locked && (
                            <button
                              onClick={async () => {
                                // Load items back to active cart
                                const cartItems: CartItem[] = [];
                                for (const item of bill.items) {
                                  const dbProd = await db.products.get(item.productId);
                                  if (dbProd) {
                                    cartItems.push({
                                      product: dbProd,
                                      quantity: item.quantity
                                    });
                                  }
                                }
                                setCart(cartItems);
                                setCustomerName(bill.customerName === 'Walk-in Customer' ? '' : bill.customerName);
                                setCustomerMobile(bill.customerMobile || '');
                                setDiscountType(bill.discountType);
                                setDiscountValue(bill.discountValue > 0 ? String(bill.discountValue) : '');
                                setPaymentMethod(bill.paymentMethod);
                                setEditingBillId(bill.id);
                                showToast(`Bill ${bill.billNumber} loaded into checkout lane for modification!`, 'info');
                                setPosTab('checkout');
                              }}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Edit size={12} />
                              <span>Edit</span>
                            </button>
                          )}

                          {/* Delete Bill button */}
                          {!locked && (
                            <button
                              onClick={() => handleDeleteBill(bill.id)}
                              className="px-3 py-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          )}

                        </div>
                      </div>

                    </div>
                  );
                })}
            </div>
          )}

        </div>
      )}

      {/* activeReceipt Printable Overlay & Modal Popup & Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-800 dark:text-slate-100 space-y-4"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center border border-indigo-100/50 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950 dark:text-white">Confirm Sale</h3>
                  <p className="text-xs text-slate-400">Please verify before continuing</p>
                </div>
              </div>

              {/* Message Block */}
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 p-4 rounded-2xl text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-800 dark:text-white">Please verify before continuing:</p>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li>Products and quantities are correct.</li>
                  <li>Prices and discounts are correct.</li>
                  <li>Customer details are correct (if entered).</li>
                  <li>Payment amount is correct.</li>
                </ul>
              </div>

              {/* Bill Details Summary Block */}
              <div className="border border-slate-100 dark:border-slate-850 rounded-2xl p-4 text-xs space-y-2.5">
                <div className="flex justify-between font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-850 pb-2">
                  <span>Billing Summary</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-wide">{paymentMethod}</span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>{item.product.name} (x{item.quantity})</span>
                      <span className="font-semibold">₹{(item.product.sellingPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 dark:border-slate-850 pt-2 space-y-1">
                  {customerName && (
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Customer:</span>
                      <span className="font-bold">{customerName}</span>
                    </div>
                  )}
                  {calculatedDiscount > 0 && (
                    <div className="flex justify-between text-[11px] text-rose-500 font-bold">
                      <span>Discount Applied:</span>
                      <span>-₹{calculatedDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1">
                    <span>Grand Total:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 text-base">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="h-10 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl flex items-center justify-center cursor-pointer transition-all"
                >
                  Back & Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    handleCheckout();
                  }}
                  className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-md shadow-indigo-500/10"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeReceipt && (
          <div>
            {/* Real-time Cash Undo Banner if active */}
            {activeReceipt.paymentMethod === 'CASH' && billingSettings.allowCashUndo60s && getCashUndoSecondsLeft(activeReceipt) > 0 && (
              <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 rounded-2xl p-3 shadow-2xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-3 max-w-md w-full">
                <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                <div className="flex-1">
                  <div className="font-extrabold text-[11px]">60s Cash Undo Safety Active ({getCashUndoSecondsLeft(activeReceipt)}s)</div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-300">Need to fix tender amount?</div>
                </div>
                <button
                  onClick={async () => {
                    const billToUndo = activeReceipt;
                    setActiveReceipt(null);
                    await handleUndoCashBill(billToUndo);
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs shrink-0"
                >
                  Undo Sale
                </button>
              </div>
            )}

            <ReceiptPreviewModal
              bill={activeReceipt}
              onClose={() => setActiveReceipt(null)}
              onNewSale={() => {
                setActiveReceipt(null);
                setCart([]);
                setCustomerName('');
                setCustomerMobile('');
                setDiscountValue('');
                setEditingBillId(null);
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* HIDDEN PHYSICAL PRINTABLE COMPONENT AREA             */}
      {/* Targeted ONLY by the print stylesheet when triggered */}
      {/* ==================================================== */}
      {activeReceipt && (
        <div id="print-receipt-area">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
              {paymentSettings.businessName || businessName}
            </h3>
            {business?.address && <div style={{ fontSize: '10px', lineHeight: 'normal' }}>{business.address}</div>}
            {(paymentSettings.businessPhone || business?.phone) && (
              <div style={{ fontSize: '10px', marginTop: '2px' }}>Phone: {paymentSettings.businessPhone || business?.phone}</div>
            )}
            {taxNumber && <div style={{ fontSize: '10px', marginTop: '3px', fontWeight: 'bold' }}>GSTIN: {taxNumber}</div>}
          </div>
          
          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />
          
          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
            <div><strong>Bill No:</strong> {activeReceipt.billNumber}</div>
            <div><strong>Date:</strong> {activeReceipt.date} {activeReceipt.time}</div>
            <div><strong>Cashier / Worker:</strong> {activeReceipt.workerName || activeReceipt.cashierName}</div>
            <div><strong>Customer:</strong> {activeReceipt.customerName}</div>
            {activeReceipt.customerMobile && <div><strong>Mobile:</strong> {activeReceipt.customerMobile}</div>}
          </div>
          
          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />
          
          <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>ITEMS</div>
          {activeReceipt.items.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '5px' }}>
              <div style={{ fontWeight: 'bold' }}>
                {item.productName}
                {(item.brand || item.variant) && ` (${[item.brand, item.variant].filter(Boolean).join(' - ')})`}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', paddingLeft: '2px' }}>
                <span>{item.quantity} x ₹{item.sellingPrice.toFixed(2)}</span>
                <span>₹{item.lineTotal.toFixed(2)}</span>
              </div>
            </div>
          ))}
          
          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />
          
          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span>
              <span>₹{activeReceipt.subtotal.toFixed(2)}</span>
            </div>
            {activeReceipt.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Discount ({activeReceipt.discountType === 'percentage' ? `${activeReceipt.discountValue}%` : 'Fixed'})</span>
                <span>-₹{activeReceipt.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
              <span>GRAND TOTAL</span>
              <span>₹{activeReceipt.grandTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />
          
          <div style={{ fontSize: '11px' }}>
            <div><strong>Payment Method:</strong> {activeReceipt.paymentMethod}</div>
            {activeReceipt.paymentMethod === 'SPLIT' && (
              <div style={{ fontSize: '10px', paddingLeft: '5px', marginTop: '2px' }}>
                <div>Cash Received: ₹{activeReceipt.cashAmount.toFixed(2)}</div>
                <div>UPI Received: ₹{activeReceipt.upiAmount.toFixed(2)}</div>
              </div>
            )}
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

          {/* Conditional QR code / confirmation text for physical printing */}
          <div style={{ textAlign: 'center', marginTop: '6px', marginBottom: '6px' }}>
            {activeReceipt.paymentMethod === 'CASH' ? (
              paymentSettings.upiId ? (
                <div style={{ display: 'inline-block', padding: '6px', background: '#fff', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'center' }}>
                  <QRCodeSVG
                    value={`upi://pay?pa=${encodeURIComponent(paymentSettings.upiId)}&pn=${encodeURIComponent(paymentSettings.businessName || businessName)}&am=${activeReceipt.grandTotal.toFixed(2)}&tn=${activeReceipt.billNumber}`}
                    size={80}
                    level="M"
                    includeMargin={false}
                  />
                  <div style={{ fontSize: '8px', fontWeight: 'bold', marginTop: '2px' }}>PAY ₹{activeReceipt.grandTotal.toFixed(2)} VIA UPI</div>
                  <div style={{ fontSize: '7px', fontFamily: 'monospace' }}>{paymentSettings.upiId}</div>
                </div>
              ) : (
                <div style={{ fontSize: '9px', fontStyle: 'italic' }}>UPI QR code not configured</div>
              )
            ) : activeReceipt.paymentMethod === 'UPI' ? (
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
                ✓ PAID DIGITAL TRANS - UPI VPA: {paymentSettings.upiId || 'Registered Merchant'}
              </div>
            ) : (
              <div style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'left', paddingLeft: '5px' }}>
                <div>✓ PAID SPLIT TRANS:</div>
                <div style={{ fontSize: '9px', fontWeight: 'normal', paddingLeft: '5px' }}>
                  • Cash part: ₹{activeReceipt.cashAmount.toFixed(2)}<br />
                  • UPI part: ₹{activeReceipt.upiAmount.toFixed(2)} (VPA: {paymentSettings.upiId || 'Merchant'})
                </div>
              </div>
            )}
          </div>
          
          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />
          
          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '8px', lineHeight: '1.4' }}>
            <div>Thank you for your visit!</div>
            <div style={{ fontWeight: 'bold', fontSize: '8px', marginTop: '2px' }}>Powered by ChhuttaPOS</div>
          </div>
        </div>
      )}

      {showWhatsAppPrompt && activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Enter Customer Mobile</h3>
              <button
                onClick={() => setShowWhatsAppPrompt(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              No customer mobile was registered for this checkout. Enter the mobile number to generate a WhatsApp shareable summary.
            </p>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400">Mobile Number (with country code, e.g. 919876543210)</label>
              <input
                type="tel"
                value={shareMobile}
                onChange={(e) => setShareMobile(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowWhatsAppPrompt(false)}
                className="flex-1 h-10 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!shareMobile.trim()) {
                    alert('Please enter a valid mobile number.');
                    return;
                  }
                  handleWhatsAppShare(shareMobile.trim());
                }}
                className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Share2 size={14} />
                Share
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

