/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ChevronDown, 
  Calendar, 
  Clock, 
  Package, 
  Database,
  Info,
  Scissors,
  Users,
  Check,
  ToggleLeft,
  ToggleRight,
  Tag,
  Lock
} from 'lucide-react';
import { db, DbProduct, DbStockHistory, DbWorkerProfile, DbPriceHistory } from '../database/db';
import { priceService } from '../services/priceService';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { SubscriptionGuard } from '../components/SubscriptionGuard';
import { ProductCard } from '../components/catalog/ProductCard';
import { ServiceCard } from '../components/catalog/ServiceCard';
import { useNavigate } from 'react-router-dom';

const STOCK_UNITS = [
  'Packet', 'Piece', 'Bag', 'Box', 'Bottle', 'Can', 'Carton', 'Tray', 'Sachet', 'kg', 'g', 'L', 'ml'
];

const formatStockUnit = (count: number, unit: string): string => {
  if (!unit) return '';
  if (count === 1) {
    return unit;
  }
  const lower = unit.toLowerCase();
  if (['kg', 'g', 'l', 'ml'].includes(lower)) {
    return unit;
  }
  if (lower === 'box') {
    return `${unit}es`;
  }
  return `${unit}s`;
};

const RETAIL_CATEGORIES = [
  'Groceries', 'Beverages', 'Snacks', 'Dairy', 'Bakery',
  'Personal Care', 'Household', 'Electronics', 'Stationery', 'Others'
];

const SERVICE_CATEGORIES = [
  'Haircut & Styling', 'Beard & Grooming', 'Facial & Skincare', 'Hair Color & Treatments',
  'Spa & Massage', 'Nail & Beauty', 'Consultation', 'Repair & Service', 'Tailoring & Alterations', 'Others'
];

export const Products: React.FC = () => {
  const { user, isOwner, business } = useAuth();
  const { isExpired } = useSubscription();
  const navigate = useNavigate();
  
  const isServiceBusiness = business?.type === 'SERVICE';
  const isProductBusiness = business?.type === 'PRODUCT';
  const isHybridBusiness = business?.type === 'HYBRID';

  const PRESET_CATEGORIES = isServiceBusiness ? SERVICE_CATEGORIES : RETAIL_CATEGORIES;

  // Owner & Manager Role Permissions for Price Editing
  const canEditPrice = isOwner || user?.role === UserRole.MANAGER || user?.role === UserRole.OWNER;

  // Owner is permitted to see purchase cost by default.
  const hasPurchaseCostPermission = isOwner && !isServiceBusiness;
  
  // Navigation tabs: Catalog, Stock Movement Ledger, or Price Audit Log
  const [activeTab, setActiveTab] = useState<'catalog' | 'ledger' | 'priceHistory'>('catalog');

  // Products & Stock History list states
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [history, setHistory] = useState<DbStockHistory[]>([]);
  const [workerProfiles, setWorkerProfiles] = useState<DbWorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Price Management States
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [selectedProductForPrice, setSelectedProductForPrice] = useState<DbProduct | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<number | ''>('');
  const [priceError, setPriceError] = useState<string | null>(null);
  const [showPriceConfirm, setShowPriceConfirm] = useState(false);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [priceHistoryList, setPriceHistoryList] = useState<DbPriceHistory[]>([]);
  const [priceSearchTerm, setPriceSearchTerm] = useState('');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [catalogSubFilter, setCatalogSubFilter] = useState<'all' | 'services' | 'products'>('all');

  // Modals & Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [isReduceOpen, setIsReduceOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<DbProduct | null>(null);

  // Form Fields State
  const [itemType, setItemType] = useState<'PRODUCT' | 'SERVICE'>(isServiceBusiness ? 'SERVICE' : 'PRODUCT');
  const [brand, setBrand] = useState('');
  const [productName, setProductName] = useState('');
  const [variant, setVariant] = useState('');
  const [category, setCategory] = useState(PRESET_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [description, setDescription] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [tax, setTax] = useState<number | ''>('');
  const [stockUnit, setStockUnit] = useState(STOCK_UNITS[0]);
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [openingStock, setOpeningStock] = useState<number | ''>('');
  const [lowStockAlert, setLowStockAlert] = useState<number | ''>(5);

  // Service Specific Form Fields State
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(30);
  const [assignedWorkerIds, setAssignedWorkerIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Stock Adjustment Input State
  const [adjustmentAmount, setAdjustmentAmount] = useState<number | ''>('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Toast message
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Query Database
  useEffect(() => {
    loadDatabase();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const loadDatabase = async () => {
    try {
      setLoading(true);
      const allProducts = await db.products.toArray();
      const allHistory = await db.stockHistory.toArray();
      const allWorkers = await db.workerProfiles.toArray();
      const allPriceHistory = await priceService.getPriceHistory();

      setProducts(allProducts);
      setHistory(allHistory.sort((a, b) => b.timestamp - a.timestamp));
      setWorkerProfiles(allWorkers.filter(w => w.status === 'ACTIVE'));
      setPriceHistoryList(allPriceHistory);
    } catch (err) {
      console.error('Error querying IndexedDB:', err);
      showToast('IndexedDB database initialization error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPriceModal = (product: DbProduct) => {
    if (!canEditPrice) {
      showToast('Access Denied: Only Owner and Manager roles are permitted to edit prices.', 'error');
      return;
    }
    setSelectedProductForPrice(product);
    setNewPriceValue(product.sellingPrice);
    setPriceError(null);
    setShowPriceConfirm(false);
    setIsPriceModalOpen(true);
  };

  const handleSavePriceUpdate = async () => {
    if (!selectedProductForPrice) return;

    const val = priceService.validatePrice(newPriceValue);
    if (!val.isValid) {
      setPriceError(val.error || 'Invalid price value.');
      return;
    }

    if (val.numericValue === selectedProductForPrice.sellingPrice) {
      setPriceError('New price is identical to current price. No change made.');
      return;
    }

    setPriceError(null);

    if (!showPriceConfirm) {
      setShowPriceConfirm(true);
      return;
    }

    setIsSavingPrice(true);
    try {
      const result = await priceService.updateItemPrice({
        userRole: user?.role,
        userName: user?.fullName || user?.email || 'Authorized User',
        userId: user?.id,
        product: selectedProductForPrice,
        newPrice: val.numericValue,
      });

      showToast(result.message, 'success');
      setIsPriceModalOpen(false);
      setShowPriceConfirm(false);
      setSelectedProductForPrice(null);
      await loadDatabase();
    } catch (err: any) {
      setPriceError(err?.message || 'Failed to update price.');
      showToast(err?.message || 'Failed to update price.', 'error');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const resetForm = () => {
    setItemType(isServiceBusiness ? 'SERVICE' : 'PRODUCT');
    setBrand('');
    setProductName('');
    setVariant('');
    setCategory(PRESET_CATEGORIES[0]);
    setCustomCategory('');
    setIsCustomCategory(false);
    setDescription('');
    setPurchasePrice('');
    setSellingPrice('');
    setTax('');
    setStockUnit(STOCK_UNITS[0]);
    setIsUnitDropdownOpen(false);
    setOpeningStock('');
    setLowStockAlert(5);
    setDurationMinutes(30);
    setAssignedWorkerIds([]);
    setIsActive(true);
    setEditingProductId(null);
  };

  // Seed standard boilerplate templates if the store catalog is blank
  const handlePreseed = async () => {
    try {
      setLoading(true);
      const count = await db.products.count();
      if (count > 0) {
        showToast('Catalog records are already populated', 'info');
        return;
      }

      let sampleItems: DbProduct[] = [];

      if (isServiceBusiness) {
        sampleItems = [
          {
            id: 'srv_1',
            itemType: 'SERVICE',
            name: 'Classic Haircut & Wash',
            category: 'Haircut & Styling',
            purchasePrice: 0,
            sellingPrice: 250,
            tax: 0,
            stockUnit: 'Service',
            openingStock: 0,
            currentStock: 0,
            lowStockAlert: 0,
            durationMinutes: 30,
            isActive: true,
            description: 'Precision haircut with head wash and hair setting',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'srv_2',
            itemType: 'SERVICE',
            name: 'Beard Trim & Hot Towel Shaping',
            category: 'Beard & Grooming',
            purchasePrice: 0,
            sellingPrice: 150,
            tax: 0,
            stockUnit: 'Service',
            openingStock: 0,
            currentStock: 0,
            lowStockAlert: 0,
            durationMinutes: 20,
            isActive: true,
            description: 'Clean beard shaping with steam hot towel treatment',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'srv_3',
            itemType: 'SERVICE',
            name: 'Deep Cleansing Glow Facial',
            category: 'Facial & Skincare',
            purchasePrice: 0,
            sellingPrice: 600,
            tax: 5,
            stockUnit: 'Service',
            openingStock: 0,
            currentStock: 0,
            lowStockAlert: 0,
            durationMinutes: 45,
            isActive: true,
            description: 'Skin exfoliation, massage, blackhead extraction & face pack',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
      } else {
        sampleItems = [
          {
            id: 'prod_g1',
            itemType: 'PRODUCT',
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
            itemType: 'PRODUCT',
            brand: 'Amul',
            name: 'Salted Pasteurised Butter',
            variant: '500g Block',
            category: 'Dairy',
            purchasePrice: 215,
            sellingPrice: 250,
            tax: 12,
            stockUnit: 'Piece',
            openingStock: 12,
            currentStock: 4,
            lowStockAlert: 5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
      }

      const sampleHistory: DbStockHistory[] = sampleItems.map(p => {
        const now = new Date();
        return {
          productId: p.id,
          productName: p.name,
          brand: p.brand,
          variant: p.variant,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          action: 'Created',
          quantityChanged: p.openingStock,
          reason: 'Initial standard catalog template pre-seed',
          previousStock: 0,
          newStock: p.openingStock,
          timestamp: now.getTime()
        };
      });

      for (const p of sampleItems) {
        await db.products.add(p);
      }
      for (const h of sampleHistory) {
        await db.stockHistory.add(h);
      }

      showToast('Successfully seeded catalog with template entries!');
      await loadDatabase();
    } catch (err) {
      console.error(err);
      showToast('Seeding error encountered', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isExpired) {
      showToast('Free Trial / Subscription Expired. Modifying products or services is disabled.', 'error');
      navigate('/subscription');
      return;
    }

    if (!productName.trim()) {
      showToast(`${itemType === 'SERVICE' ? 'Service' : 'Product'} name cannot be empty`, 'error');
      return;
    }

    const finalCategory = isCustomCategory ? customCategory.trim() : category;
    if (!finalCategory) {
      showToast('Please specify a category', 'error');
      return;
    }

    const pPrice = itemType === 'SERVICE' ? 0 : (Number(purchasePrice) || 0);
    const sPrice = Number(sellingPrice) || 0;
    const rateTax = tax === '' ? undefined : Number(tax);
    const alertLevel = itemType === 'SERVICE' ? 0 : (Number(lowStockAlert) || 0);
    const initialQty = itemType === 'SERVICE' ? 0 : (Number(openingStock) || 0);
    const finalStockUnit = itemType === 'SERVICE' ? 'Service' : stockUnit;

    if (pPrice < 0) {
      showToast('Purchase price cannot be a negative number', 'error');
      return;
    }

    if (sPrice <= 0) {
      showToast('Price must be greater than zero (₹0.00)', 'error');
      return;
    }

    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];

      if (formMode === 'add') {
        const generatedId = (itemType === 'SERVICE' ? 'srv_' : 'prod_') + Math.random().toString(36).substring(2, 11);
        const newProduct: DbProduct = {
          id: generatedId,
          itemType,
          brand: itemType === 'SERVICE' ? undefined : (brand.trim() || undefined),
          name: productName.trim(),
          variant: itemType === 'SERVICE' ? undefined : (variant.trim() || undefined),
          category: finalCategory,
          description: description.trim() || undefined,
          purchasePrice: pPrice,
          sellingPrice: sPrice,
          tax: rateTax,
          stockUnit: finalStockUnit,
          openingStock: initialQty,
          currentStock: initialQty,
          lowStockAlert: alertLevel,
          durationMinutes: itemType === 'SERVICE' ? (Number(durationMinutes) || 0) : undefined,
          assignedWorkerIds: itemType === 'SERVICE' ? assignedWorkerIds : undefined,
          isActive: itemType === 'SERVICE' ? isActive : true,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        };

        await db.products.add(newProduct);

        const historyLog: DbStockHistory = {
          productId: generatedId,
          productName: newProduct.name,
          brand: newProduct.brand,
          variant: newProduct.variant,
          date: dateStr,
          time: timeStr,
          action: 'Created',
          quantityChanged: initialQty,
          reason: `Initial ${itemType === 'SERVICE' ? 'service catalog registration' : 'product inventory opening stock entry'}`,
          previousStock: 0,
          newStock: initialQty,
          timestamp: now.getTime()
        };
        await db.stockHistory.add(historyLog);
        showToast(`"${newProduct.name}" saved in catalog`);
      } else {
        // Edit flow
        if (!editingProductId) return;
        const originalItem = await db.products.get(editingProductId);
        if (!originalItem) {
          showToast('Record not found', 'error');
          return;
        }

        const updatedProduct: DbProduct = {
          ...originalItem,
          itemType,
          brand: itemType === 'SERVICE' ? undefined : (brand.trim() || undefined),
          name: productName.trim(),
          variant: itemType === 'SERVICE' ? undefined : (variant.trim() || undefined),
          category: finalCategory,
          description: description.trim() || undefined,
          purchasePrice: pPrice,
          sellingPrice: sPrice,
          tax: rateTax,
          stockUnit: finalStockUnit,
          lowStockAlert: alertLevel,
          durationMinutes: itemType === 'SERVICE' ? (Number(durationMinutes) || 0) : undefined,
          assignedWorkerIds: itemType === 'SERVICE' ? assignedWorkerIds : undefined,
          isActive: itemType === 'SERVICE' ? isActive : originalItem.isActive,
          updatedAt: now.toISOString()
        };

        if (originalItem.sellingPrice !== sPrice) {
          if (!canEditPrice) {
            showToast('Access Denied: Only Owner and Manager roles are permitted to edit prices.', 'error');
            return;
          }
          const priceAuditLog: DbPriceHistory = {
            productId: originalItem.id,
            productName: updatedProduct.name,
            itemType: updatedProduct.itemType || 'PRODUCT',
            previousPrice: originalItem.sellingPrice,
            newPrice: sPrice,
            changedBy: `${user?.fullName || user?.email || 'Authorized User'} (${user?.role})`,
            changedByUserId: user?.id || '',
            changedAt: now.toISOString(),
            timestamp: now.getTime(),
          };
          await db.priceHistory.add(priceAuditLog);
        }

        await db.products.put(updatedProduct);

        const historyLog: DbStockHistory = {
          productId: originalItem.id,
          productName: updatedProduct.name,
          brand: updatedProduct.brand,
          variant: updatedProduct.variant,
          date: dateStr,
          time: timeStr,
          action: 'Edited',
          quantityChanged: 0,
          reason: `${itemType === 'SERVICE' ? 'Service' : 'Product'} specifications updated in catalog`,
          previousStock: originalItem.currentStock,
          newStock: originalItem.currentStock,
          timestamp: now.getTime()
        };
        await db.stockHistory.add(historyLog);
        showToast(`"${updatedProduct.name}" specifications updated`);
      }

      setIsFormOpen(false);
      resetForm();
      await loadDatabase();
    } catch (err) {
      console.error(err);
      showToast('Failed to write changes to database', 'error');
    }
  };

  const handleEditOpen = (product: DbProduct) => {
    setFormMode('edit');
    setEditingProductId(product.id);
    const resolvedItemType = product.itemType || (isServiceBusiness ? 'SERVICE' : 'PRODUCT');
    setItemType(resolvedItemType);

    setBrand(product.brand || '');
    setProductName(product.name);
    setVariant(product.variant || '');
    
    if (PRESET_CATEGORIES.includes(product.category)) {
      setCategory(product.category);
      setIsCustomCategory(false);
    } else {
      setCategory('Others');
      setCustomCategory(product.category);
      setIsCustomCategory(true);
    }

    setDescription(product.description || '');
    setPurchasePrice(product.purchasePrice);
    setSellingPrice(product.sellingPrice);
    setTax(product.tax !== undefined ? product.tax : '');
    setStockUnit(product.stockUnit);
    setOpeningStock(product.openingStock);
    setLowStockAlert(product.lowStockAlert);
    
    setDurationMinutes(product.durationMinutes || 30);
    setAssignedWorkerIds(product.assignedWorkerIds || []);
    setIsActive(product.isActive !== false);

    setIsFormOpen(true);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (isExpired) {
      showToast('Free Trial / Subscription Expired. Deleting catalog items is disabled.', 'error');
      navigate('/subscription');
      return;
    }

    if (!window.confirm(`Are you absolutely sure you want to delete "${name}"? This will purge all associated local records.`)) {
      return;
    }

    try {
      await db.products.delete(id);
      
      const now = new Date();
      const historyLog: DbStockHistory = {
        productId: id,
        productName: name,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        action: 'Reduced',
        quantityChanged: 0,
        reason: 'Item completely deleted from product catalog',
        previousStock: 0,
        newStock: 0,
        timestamp: now.getTime()
      };
      await db.stockHistory.add(historyLog);

      showToast(`Removed "${name}" from store database`);
      await loadDatabase();
    } catch (err) {
      console.error(err);
      showToast('Error executing record deletion', 'error');
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || adjustmentAmount === '') return;

    const qty = Number(adjustmentAmount);
    if (qty <= 0) {
      showToast('Inward intake quantity must be greater than zero', 'error');
      return;
    }

    try {
      const now = new Date();
      const finalStock = selectedProduct.currentStock + qty;

      await db.products.update(selectedProduct.id, {
        currentStock: finalStock,
        updatedAt: now.toISOString()
      });

      const historyLog: DbStockHistory = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        brand: selectedProduct.brand,
        variant: selectedProduct.variant,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        action: 'Restocked',
        quantityChanged: qty,
        reason: adjustmentReason.trim() || 'Manual stock inflow purchase replenishment',
        previousStock: selectedProduct.currentStock,
        newStock: finalStock,
        timestamp: now.getTime()
      };
      await db.stockHistory.add(historyLog);

      showToast(`Inwarded +${qty} units of "${selectedProduct.name}" successfully`);
      setIsRestockOpen(false);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      setSelectedProduct(null);
      await loadDatabase();
    } catch (err) {
      console.error(err);
      showToast('Error recording intake', 'error');
    }
  };

  const handleReduceStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || adjustmentAmount === '') return;

    const qty = Number(adjustmentAmount);
    if (qty <= 0) {
      showToast('Reduction quantity must be greater than zero', 'error');
      return;
    }

    if (selectedProduct.currentStock - qty < 0) {
      showToast('Negative stock levels are not permitted', 'error');
      return;
    }

    try {
      const now = new Date();
      const finalStock = selectedProduct.currentStock - qty;

      await db.products.update(selectedProduct.id, {
        currentStock: finalStock,
        updatedAt: now.toISOString()
      });

      const historyLog: DbStockHistory = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        brand: selectedProduct.brand,
        variant: selectedProduct.variant,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        action: 'Reduced',
        quantityChanged: -qty,
        reason: adjustmentReason.trim() || 'Manual stock deduction check / breakage audit',
        previousStock: selectedProduct.currentStock,
        newStock: finalStock,
        timestamp: now.getTime()
      };
      await db.stockHistory.add(historyLog);

      showToast(`Reduced inventory count by -${qty} units for "${selectedProduct.name}"`);
      setIsReduceOpen(false);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      setSelectedProduct(null);
      await loadDatabase();
    } catch (err) {
      console.error(err);
      showToast('Error updating stock level', 'error');
    }
  };

  const filteredProducts = products.filter(p => {
    const isServiceItem = p.itemType === 'SERVICE' || (isServiceBusiness && p.itemType !== 'PRODUCT');
    const isProductItem = p.itemType === 'PRODUCT' || (!isServiceBusiness && p.itemType !== 'SERVICE');

    if (catalogSubFilter === 'services' && !isServiceItem) return false;
    if (catalogSubFilter === 'products' && !isProductItem) return false;

    const term = searchTerm.toLowerCase();
    const matchSearch = 
      p.name.toLowerCase().includes(term) ||
      (p.brand || '').toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term);

    const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;

    let matchStock = true;
    if (stockFilter === 'low') {
      matchStock = !isServiceItem && p.currentStock > 0 && p.currentStock <= p.lowStockAlert;
    } else if (stockFilter === 'out') {
      matchStock = !isServiceItem && p.currentStock <= 0;
    }

    return matchSearch && matchCategory && matchStock;
  });

  const serviceItems = products.filter(p => p.itemType === 'SERVICE' || (isServiceBusiness && p.itemType !== 'PRODUCT'));
  const productItems = products.filter(p => p.itemType === 'PRODUCT' || (!isServiceBusiness && p.itemType !== 'SERVICE'));

  const totalCount = products.length;
  const totalServicesCount = serviceItems.length;
  const activeServicesCount = serviceItems.filter(s => s.isActive !== false).length;
  const avgServiceFee = totalServicesCount > 0 ? (serviceItems.reduce((acc, s) => acc + s.sellingPrice, 0) / totalServicesCount) : 0;
  
  const lowCount = productItems.filter(p => p.currentStock > 0 && p.currentStock <= p.lowStockAlert).length;
  const outCount = productItems.filter(p => p.currentStock <= 0).length;
  const totalValuation = productItems.reduce((sum, p) => sum + (p.currentStock * p.purchasePrice), 0);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6 font-sans text-slate-800 dark:text-slate-100 select-text">
      
      {/* Toast Warning/Success banner */}
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
            {toast.type === 'success' ? <CheckCircle size={15} /> : toast.type === 'error' ? <AlertTriangle size={15} /> : <Info size={15} />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expired Warning Banner */}
      {isExpired && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-red-800 dark:text-red-300 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Lock size={18} className="text-red-600 shrink-0" />
            <span className="text-xs font-medium">
              <strong>Catalog Management Disabled:</strong> Your free trial or subscription has expired. Adding, editing, and deleting products or services is restricted.
            </span>
          </div>
          <button
            onClick={() => navigate('/subscription')}
            className="px-3.5 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Subscribe / Renew Now
          </button>
        </div>
      )}

      {/* Main Module Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md">
            <Database size={11} />
            <span>IndexedDB Offline Engine</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {isServiceBusiness ? 'Services Management' : isHybridBusiness ? 'Services & Products Management' : 'Products & Inventory Management'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isServiceBusiness
              ? 'Configure service pricing, estimated durations, assigned staff, and active catalog offerings.'
              : 'Regulate active retail registers with custom alert caps, inward stock batches, and automated ledgering.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sub Navigation */}
          <div className="bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 rounded-xl flex gap-1">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Catalog
            </button>
            {!isServiceBusiness && (
              <button
                onClick={() => setActiveTab('ledger')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'ledger'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Stock History
              </button>
            )}
            <button
              onClick={() => setActiveTab('priceHistory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'priceHistory'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Tag size={13} className="text-emerald-500" />
              Price Audit
            </button>
          </div>

          {isHybridBusiness ? (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setItemType('SERVICE');
                  setFormMode('add');
                  resetForm();
                  setItemType('SERVICE');
                  setIsFormOpen(true);
                }}
                className="h-9 px-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
              >
                <Plus size={14} />
                Add Service
              </button>
              <button
                onClick={() => {
                  setItemType('PRODUCT');
                  setFormMode('add');
                  resetForm();
                  setItemType('PRODUCT');
                  setIsFormOpen(true);
                }}
                className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
              >
                <Plus size={14} />
                Add Product
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setItemType(isServiceBusiness ? 'SERVICE' : 'PRODUCT');
                setFormMode('add');
                resetForm();
                setIsFormOpen(true);
              }}
              className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            >
              <Plus size={14} />
              {isServiceBusiness ? 'Add Service' : 'Add Product'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Board */}
      {isServiceBusiness ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Services</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white">{totalServicesCount}</span>
              <span className="text-[10px] text-slate-400">Services</span>
            </div>
            {products.length === 0 && (
              <button
                onClick={handlePreseed}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 mt-2 hover:underline cursor-pointer"
              >
                <Sparkles size={11} /> Load Service Templates
              </button>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Active Offerings</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeServicesCount}</span>
              <span className="text-[10px] text-slate-400">Available</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-2 block">Visible in billing POS</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Average Fee</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xs text-slate-400 font-bold">₹</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white">{Math.round(avgServiceFee)}</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-2 block">Per service session</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Service Categories</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white">
                {Array.from(new Set(serviceItems.map(s => s.category))).length}
              </span>
              <span className="text-[10px] text-slate-400">Categories</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-2 block">Organized service lines</span>
          </div>
        </div>
      ) : isHybridBusiness ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Services</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{totalServicesCount}</span>
              <span className="text-[10px] text-slate-400">Services</span>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Retail Products</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{productItems.length}</span>
              <span className="text-[10px] text-slate-400">SKUs</span>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Low Stock Items</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className={`text-2xl font-black ${lowCount > 0 ? 'text-amber-500' : 'text-slate-800 dark:text-white'}`}>{lowCount}</span>
              <span className="text-[10px] text-slate-400">SKUs</span>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Retail Valuation</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xs text-slate-400 font-bold">₹</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white">{totalValuation.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={`grid grid-cols-2 ${hasPurchaseCostPermission ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Products</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white">{totalCount}</span>
              <span className="text-[10px] text-slate-400">SKUs</span>
            </div>
            {products.length === 0 && (
              <button
                onClick={handlePreseed}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 mt-2 hover:underline cursor-pointer"
              >
                <Sparkles size={11} /> Load Template Seed
              </button>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Out of Stock</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className={`text-2xl font-black ${outCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>{outCount}</span>
              <span className="text-[10px] text-slate-400">SKUs</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-2 block">Requires replenishment</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Low Stock Alert</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className={`text-2xl font-black ${lowCount > 0 ? 'text-amber-500' : 'text-slate-800 dark:text-white'}`}>{lowCount}</span>
              <span className="text-[10px] text-slate-400">SKUs</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-2 block">Approaching safe caps</span>
          </div>

          {hasPurchaseCostPermission && (
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Inventory Net Worth</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-xs text-slate-400 font-bold">₹</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white">{totalValuation.toLocaleString('en-IN')}</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-2 block">Evaluated by purchase price</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'catalog' ? (
        <div className="space-y-4">
          {/* Filters & Instant Search */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products by brand, catalog label, variant or category..."
                className="w-full h-10 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none h-10 pl-3.5 pr-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {PRESET_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {Array.from(new Set(products.map(p => p.category)))
                    .filter(cat => !PRESET_CATEGORIES.includes(cat))
                    .map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>

              <div className="bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 rounded-xl flex gap-1">
                <button
                  onClick={() => setStockFilter('all')}
                  className={`px-3 h-8 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    stockFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStockFilter('low')}
                  className={`px-3 h-8 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    stockFilter === 'low'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-amber-600'
                  }`}
                >
                  Low Stock
                </button>
                <button
                  onClick={() => setStockFilter('out')}
                  className={`px-3 h-8 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    stockFilter === 'out'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-rose-600'
                  }`}
                >
                  Out of Stock
                </button>
              </div>
            </div>
          </div>

          {/* Database Inventory Cards Grid */}
          {loading ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Accessing Local IndexedDB Storage...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-950 rounded-full flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-800">
                <ShoppingBag className="text-slate-400" size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Matching Catalog Records</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-normal">
                  Adjust active filter parameters or add a new {isServiceBusiness ? 'service offering' : 'catalog item'}.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(p => {
                const isServiceItem = p.itemType === 'SERVICE' || (isServiceBusiness && p.itemType !== 'PRODUCT');
                
                if (isServiceItem) {
                  return (
                    <ServiceCard
                      key={p.id}
                      service={p}
                      canEditPrice={canEditPrice}
                      workerProfiles={workerProfiles}
                      onOpenPriceModal={handleOpenPriceModal}
                      onEditOpen={handleEditOpen}
                      onDeleteService={handleDeleteProduct}
                    />
                  );
                }

                return (
                  <ProductCard
                    key={p.id}
                    product={p}
                    canEditPrice={canEditPrice}
                    hasPurchaseCostPermission={hasPurchaseCostPermission}
                    formatStockUnit={formatStockUnit}
                    onOpenPriceModal={handleOpenPriceModal}
                    onEditOpen={handleEditOpen}
                    onDeleteProduct={handleDeleteProduct}
                    onRestockOpen={(prod) => {
                      setSelectedProduct(prod);
                      setAdjustmentAmount('');
                      setAdjustmentReason('');
                      setIsRestockOpen(true);
                    }}
                    onReduceOpen={(prod) => {
                      setSelectedProduct(prod);
                      setAdjustmentAmount('');
                      setAdjustmentReason('');
                      setIsReduceOpen(true);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'ledger' ? (
        /* Ledger / audit transaction log view */
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl p-4 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
                <History className="text-indigo-500" size={16} />
                Movement Audit Ledger
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Detailed local storage logging capturing inward replenish actions, outward breaks, register calibration and deletions.
              </p>
            </div>
            {history.length > 0 && (
              <button
                onClick={async () => {
                  if (window.confirm('Wipe out all offline stock audit ledgers? This action is permanent.')) {
                    await db.stockHistory.clear();
                    showToast('History ledger successfully purged');
                    await loadDatabase();
                  }
                }}
                className="text-[10px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
              >
                Clear History logs
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <History className="mx-auto mb-2 text-slate-300" size={24} />
              <p className="text-xs font-semibold">Stock ledger history is clean</p>
              <p className="text-[10px] text-slate-500">Intakes or stock adjustments will register automatically here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-sans text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 font-bold text-[9px] uppercase tracking-wider bg-slate-50 dark:bg-slate-950">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Product Spec</th>
                    <th className="py-2.5 px-3">Action Type</th>
                    <th className="py-2.5 px-3 text-right">Adjustment Quantity</th>
                    <th className="py-2.5 px-3">Auditing Notes / Reason</th>
                    <th className="py-2.5 px-3 text-right">Updated Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60">
                  {history.map(h => {
                    const isIncrease = h.action === 'Created' || h.action === 'Restocked';
                    const isDecrease = h.action === 'Reduced';
                    
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                        <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          <div className="flex flex-col">
                            <span className="font-semibold flex items-center gap-1">
                              <Calendar size={11} />
                              {h.date}
                            </span>
                            <span className="text-[10px] mt-0.5 flex items-center gap-1">
                              <Clock size={11} />
                              {h.time}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <strong className="text-slate-800 dark:text-white font-bold">{h.productName}</strong>
                            <span className="text-[10px] text-slate-400">
                              {h.brand && `${h.brand} `}{h.variant && `• ${h.variant}`}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                            h.action === 'Created'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                              : h.action === 'Edited'
                                ? 'bg-slate-50 text-slate-600 dark:bg-slate-950/40 dark:text-slate-400'
                                : h.action === 'Restocked'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}>
                            {h.action === 'Restocked' && <ArrowUpRight size={10} />}
                            {h.action === 'Reduced' && <ArrowDownLeft size={10} />}
                            {h.action}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`font-mono font-black ${
                            isIncrease
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isDecrease && h.quantityChanged < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-500'
                          }`}>
                            {isIncrease && '+'}
                            {h.quantityChanged === 0 ? '—' : h.quantityChanged}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-slate-500 dark:text-slate-400 max-w-xs block truncate font-medium">
                            {h.reason}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-800 dark:text-white">
                          {h.newStock}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Price History Audit Log View */
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
                <Tag className="text-emerald-500" size={16} />
                Price Adjustment Audit Trail
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Immutable record logging every product and service price modification, authorized user, and timestamp.
              </p>
            </div>

            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={priceSearchTerm}
                onChange={(e) => setPriceSearchTerm(e.target.value)}
                placeholder="Filter by item or user..."
                className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {priceHistoryList.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Tag size={20} />
              </div>
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300">No Price Modifications Logged</h4>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Price changes made by Owner or Manager roles will be automatically recorded here with timestamps and user details.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Previous Price</th>
                    <th className="py-2.5 px-3">New Price</th>
                    <th className="py-2.5 px-3">Price Shift</th>
                    <th className="py-2.5 px-3">Authorized User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {priceHistoryList
                    .filter(item =>
                      item.productName.toLowerCase().includes(priceSearchTerm.toLowerCase()) ||
                      item.changedBy.toLowerCase().includes(priceSearchTerm.toLowerCase())
                    )
                    .map((item, idx) => {
                      const diff = item.newPrice - item.previousPrice;
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/40">
                          <td className="py-3 px-3 text-[11px] text-slate-500">
                            {new Date(item.changedAt).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-850 dark:text-white">
                            {item.productName}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${
                              item.itemType === 'SERVICE'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            }`}>
                              {item.itemType || 'PRODUCT'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            ₹{item.previousPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                            ₹{item.newPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-3">
                            {diff > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                +₹{diff.toFixed(2)}
                              </span>
                            ) : diff < 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                                -₹{Math.abs(diff).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">₹0.00</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400 text-[11px]">
                            {item.changedBy}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RENDER DIALOG: Save / Edit Modal Container */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                    {formMode === 'add'
                      ? (itemType === 'SERVICE' ? 'Add Service Offering' : 'Add Retail Product')
                      : (itemType === 'SERVICE' ? 'Modify Service Details' : 'Modify Product Specifications')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {itemType === 'SERVICE'
                      ? 'Configure service pricing, session duration, and staff assignments'
                      : 'Adjust pricing rules, inventory units, and low stock alert thresholds'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-5 space-y-5">
                
                {/* Item Type Selector for Hybrid Mode (Only in Add Mode) */}
                {isHybridBusiness && formMode === 'add' && (
                  <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                        Select Item Type
                      </span>
                      <p className="text-[10px] text-slate-500">Choose whether you are adding a Service or a Retail Inventory Item</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setItemType('SERVICE');
                          setCategory(SERVICE_CATEGORIES[0]);
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                          itemType === 'SERVICE'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Scissors size={12} /> Service
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setItemType('PRODUCT');
                          setCategory(RETAIL_CATEGORIES[0]);
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                          itemType === 'PRODUCT'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Package size={12} /> Product
                      </button>
                    </div>
                  </div>
                )}

                {/* Section 1: Basic Information */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 pb-1">
                    {itemType === 'SERVICE' ? 'Service Specifications' : 'Basic Specifications'}
                  </h4>

                  <div className={`grid grid-cols-1 ${itemType === 'SERVICE' ? 'sm:grid-cols-2' : 'sm:grid-cols-2'} gap-3.5`}>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                        {itemType === 'SERVICE' ? 'Service Name *' : 'Product Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder={itemType === 'SERVICE' ? 'e.g. Haircut & Head Wash' : 'e.g. Premium White Basmati Rice'}
                        className="w-full h-9 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                      />
                    </div>

                    {itemType === 'PRODUCT' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Brand Name (Optional)</label>
                        <input
                          type="text"
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          placeholder="e.g. India Gate, Nestle"
                          className="w-full h-9 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Category Specification *</label>
                      {isCustomCategory ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            placeholder="Enter custom category"
                            className="flex-1 h-9 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => setIsCustomCategory(false)}
                            className="h-9 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 text-xs rounded-lg font-bold"
                          >
                            Reset
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            value={category}
                            onChange={(e) => {
                              if (e.target.value === 'Others') {
                                setIsCustomCategory(true);
                              } else {
                                setCategory(e.target.value);
                              }
                            }}
                            className="appearance-none w-full h-9 pl-3 pr-8 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer text-slate-800 dark:text-slate-100"
                          >
                            {PRESET_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {itemType === 'PRODUCT' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Variant / Size (Optional)</label>
                      <input
                        type="text"
                        value={variant}
                        onChange={(e) => setVariant(e.target.value)}
                        placeholder="e.g. 5kg Sack, 250ml Can"
                        className="w-full h-9 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                      {itemType === 'SERVICE' ? 'Service Description (Optional)' : 'Product Description (Optional)'}
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={itemType === 'SERVICE' ? 'Describe service process, included add-ons, or customer guidelines...' : 'Add specific store attributes, rack location etc...'}
                      rows={2}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>
                </div>

                {/* Section 2: Pricing & Duration Framework */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 pb-1">
                    {itemType === 'SERVICE' ? 'Service Pricing & Duration' : 'Pricing Framework (INR)'}
                  </h4>

                  <div className={`grid grid-cols-1 ${itemType === 'SERVICE' ? 'sm:grid-cols-3' : (hasPurchaseCostPermission ? 'sm:grid-cols-3' : 'sm:grid-cols-2')} gap-3.5`}>
                    {itemType === 'PRODUCT' && hasPurchaseCostPermission && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Purchase Unit Cost *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          placeholder="Cost price (₹)"
                          className="w-full h-9 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                          {itemType === 'SERVICE' ? 'Service Fee *' : 'Selling Retail Price *'}
                        </label>
                        {!canEditPrice && (
                          <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Lock size={10} /> Owner/Manager required
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        disabled={!canEditPrice}
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="Price (₹)"
                        className={`w-full h-9 px-3 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 ${
                          !canEditPrice ? 'bg-slate-100 dark:bg-slate-800/60 opacity-70 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-950'
                        }`}
                      />
                    </div>

                    {itemType === 'SERVICE' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Est. Duration (Minutes) *</label>
                        <input
                          type="number"
                          required
                          min="5"
                          step="5"
                          value={durationMinutes}
                          onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                          placeholder="e.g. 30"
                          className="w-full h-9 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">GST Tax % (Optional)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={tax}
                        onChange={(e) => setTax(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="e.g. 0, 5, 18"
                        className="w-full h-9 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Service Specific Staff Assignment & Availability */}
                {itemType === 'SERVICE' && (
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 pb-1">
                      Staff Assignment & Availability
                    </h4>

                    {workerProfiles.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                          Assigned Staff Members (Optional)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {workerProfiles.map(w => {
                            const isAssigned = assignedWorkerIds.includes(w.id);
                            return (
                              <button
                                type="button"
                                key={w.id}
                                onClick={() => {
                                  if (isAssigned) {
                                    setAssignedWorkerIds(assignedWorkerIds.filter(id => id !== w.id));
                                  } else {
                                    setAssignedWorkerIds([...assignedWorkerIds, w.id]);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                                  isAssigned
                                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                }`}
                              >
                                <span>{w.name}</span>
                                {isAssigned && <Check size={13} className="text-purple-600 dark:text-purple-400" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">Active Offering Status</span>
                        <span className="text-[10px] text-slate-400">Available for checkout and booking in POS</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsActive(!isActive)}
                        className="text-indigo-600 dark:text-indigo-400 cursor-pointer"
                      >
                        {isActive ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-slate-400" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Section 3: Stock Metrics (Only for Retail Product) */}
                {itemType === 'PRODUCT' && (
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 pb-1">
                      Stock & Measurement Metrics
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Stock Unit Droplist</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                            className="w-full h-9 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer text-slate-800 dark:text-slate-100 flex items-center justify-between text-left"
                          >
                            <span>{stockUnit}</span>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isUnitDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          <AnimatePresence>
                            {isUnitDropdownOpen && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setIsUnitDropdownOpen(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -4 }}
                                  className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto py-1"
                                >
                                  {STOCK_UNITS.map(unit => (
                                    <button
                                      key={unit}
                                      type="button"
                                      onClick={() => {
                                        setStockUnit(unit);
                                        setIsUnitDropdownOpen(false);
                                      }}
                                      className={`w-full px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors flex items-center justify-between ${
                                        stockUnit === unit
                                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                      }`}
                                    >
                                      <span>{unit}</span>
                                      {stockUnit === unit && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                                      )}
                                    </button>
                                  ))}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Opening Stock Count *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          disabled={formMode === 'edit'}
                          value={openingStock}
                          onChange={(e) => setOpeningStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                          placeholder="Opening stock Qty"
                          className="w-full h-9 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 disabled:opacity-55 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Low Stock Alert Level *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={lowStockAlert}
                          onChange={(e) => setLowStockAlert(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                          placeholder="Safe stock limit"
                          className="w-full h-9 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                  >
                    {formMode === 'add' ? (itemType === 'SERVICE' ? 'Save Service Offering' : 'Register Product') : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENDER DIALOG: Restock (Inward Intake) Dialog */}
      <AnimatePresence>
        {isRestockOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                    Add Stock Batch
                  </h4>
                  <p className="text-[11px] text-slate-500">{selectedProduct.name}</p>
                </div>
                <button
                  onClick={() => {
                    setIsRestockOpen(false);
                    setSelectedProduct(null);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-750 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleRestock} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Current Stock</span>
                    <strong className="block text-slate-800 dark:text-white font-extrabold mt-0.5">
                      {selectedProduct.currentStock} {formatStockUnit(selectedProduct.currentStock, selectedProduct.stockUnit)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">New stock preview</span>
                    <strong className="block text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5">
                      {selectedProduct.currentStock + (Number(adjustmentAmount) || 0)} {formatStockUnit(selectedProduct.currentStock + (Number(adjustmentAmount) || 0), selectedProduct.stockUnit)}
                    </strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wide">Add Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Enter quantity to add..."
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="w-full h-9 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wide">Add Stock Reason (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Weekly distributor replenishment, purchase #1024"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRestockOpen(false);
                      setSelectedProduct(null);
                    }}
                    className="h-9 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer"
                  >
                    Add Stock
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENDER DIALOG: Reduce Stock Dialog */}
      <AnimatePresence>
        {isReduceOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                    Reduce Stock
                  </h4>
                  <p className="text-[11px] text-slate-500">{selectedProduct.name}</p>
                </div>
                <button
                  onClick={() => {
                    setIsReduceOpen(false);
                    setSelectedProduct(null);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-750 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleReduceStock} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Current Stock</span>
                    <strong className="block text-slate-800 dark:text-white font-extrabold mt-0.5">
                      {selectedProduct.currentStock} {formatStockUnit(selectedProduct.currentStock, selectedProduct.stockUnit)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">New Stock Preview</span>
                    <strong className={`block font-extrabold mt-0.5 ${
                      selectedProduct.currentStock - (Number(adjustmentAmount) || 0) < 0 
                        ? 'text-rose-600' 
                        : 'text-amber-500'
                    }`}>
                      {Math.max(0, selectedProduct.currentStock - (Number(adjustmentAmount) || 0))} {formatStockUnit(Math.max(0, selectedProduct.currentStock - (Number(adjustmentAmount) || 0)), selectedProduct.stockUnit)}
                    </strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wide">Reduce Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedProduct.currentStock}
                    placeholder="Enter quantity to deduct..."
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="w-full h-9 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                  {adjustmentAmount !== '' && Number(adjustmentAmount) > selectedProduct.currentStock && (
                    <span className="text-[10px] text-rose-500 font-bold block mt-1">
                      ⚠️ Deducted amount exceeds current stock availability
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wide">Reduce Stock Reason (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Expired batch checkout, package damage, inventory discrepancy"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReduceOpen(false);
                      setSelectedProduct(null);
                    }}
                    className="h-9 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustmentAmount !== '' && Number(adjustmentAmount) > selectedProduct.currentStock}
                    className="h-9 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reduce Stock
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Price Edit Modal */}
      <AnimatePresence>
        {isPriceModalOpen && selectedProductForPrice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                    <Tag size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-850 dark:text-white">
                      Update Price & Rate
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {selectedProductForPrice.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsPriceModalOpen(false);
                    setShowPriceConfirm(false);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {/* Current vs New Price Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block tracking-wider">
                      Current Active Price
                    </span>
                    <span className="text-base font-black text-slate-700 dark:text-slate-200 block mt-1">
                      ₹{selectedProductForPrice.sellingPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
                    <span className="text-[9px] font-bold uppercase text-indigo-500 block tracking-wider">
                      Type
                    </span>
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 block mt-1 truncate">
                      {selectedProductForPrice.itemType === 'SERVICE' ? 'Service Fee' : 'Retail Product'}
                    </span>
                  </div>
                </div>

                {/* New Price Input Field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center justify-between">
                    <span>New Price (₹) *</span>
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold">Must be &gt; ₹0.00</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      autoFocus
                      value={newPriceValue}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                        setNewPriceValue(val);
                        setPriceError(null);
                        setShowPriceConfirm(false);
                      }}
                      placeholder="Enter updated price"
                      className="w-full h-11 pl-8 pr-4 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-indigo-500 rounded-xl text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Price Difference Indicator */}
                {newPriceValue !== '' && !isNaN(Number(newPriceValue)) && Number(newPriceValue) > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Price Delta:</span>
                    {Number(newPriceValue) > selectedProductForPrice.sellingPrice ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        +₹{(Number(newPriceValue) - selectedProductForPrice.sellingPrice).toFixed(2)} Increase
                      </span>
                    ) : Number(newPriceValue) < selectedProductForPrice.sellingPrice ? (
                      <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        -₹{(selectedProductForPrice.sellingPrice - Number(newPriceValue)).toFixed(2)} Decrease
                      </span>
                    ) : (
                      <span className="font-bold text-slate-500">No Price Shift</span>
                    )}
                  </div>
                )}

                {/* Validation Error Alert */}
                {priceError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <span>{priceError}</span>
                  </div>
                )}

                {/* Confirmation Warning Box */}
                {showPriceConfirm && (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                      <span>Confirm Price Change</span>
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                      Are you sure you want to change price for <strong>{selectedProductForPrice.name}</strong> from <strong>₹{selectedProductForPrice.sellingPrice.toFixed(2)}</strong> to <strong>₹{Number(newPriceValue).toFixed(2)}</strong>?
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Existing bills retain historical prices. All new invoices will automatically apply this updated rate.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPriceModalOpen(false);
                    setShowPriceConfirm(false);
                  }}
                  className="px-4 h-9 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>

                {!showPriceConfirm ? (
                  <button
                    type="button"
                    onClick={handleSavePriceUpdate}
                    className="px-4 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                  >
                    Update Price
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSavingPrice}
                    onClick={handleSavePriceUpdate}
                    className="px-4 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingPrice ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Confirm & Save</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
