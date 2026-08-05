import React from 'react';
import { Package, Tag, Edit2, Trash2, ArrowUpRight, ArrowDownLeft, Lock } from 'lucide-react';
import { DbProduct } from '../../database/db';

interface ProductCardProps {
  product: DbProduct;
  canEditPrice: boolean;
  hasPurchaseCostPermission: boolean;
  formatStockUnit: (qty: number, unit?: string) => string;
  onOpenPriceModal: (product: DbProduct) => void;
  onEditOpen: (product: DbProduct) => void;
  onDeleteProduct: (id: string, name: string) => void;
  onRestockOpen: (product: DbProduct) => void;
  onReduceOpen: (product: DbProduct) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  canEditPrice,
  hasPurchaseCostPermission,
  formatStockUnit,
  onOpenPriceModal,
  onEditOpen,
  onDeleteProduct,
  onRestockOpen,
  onReduceOpen,
}) => {
  const isOut = product.currentStock <= 0;
  const isLow = product.currentStock > 0 && product.currentStock <= product.lowStockAlert;

  return (
    <div
      className={`p-4 bg-white dark:bg-slate-900 rounded-2xl border flex flex-col justify-between space-y-3.5 transition-all shadow-xs hover:shadow-md ${
        isOut
          ? 'border-rose-100 dark:border-rose-950/40 bg-rose-50/10 dark:bg-rose-950/10'
          : isLow
            ? 'border-amber-100 dark:border-amber-950/40 bg-amber-50/10 dark:bg-amber-950/10'
            : 'border-slate-150 dark:border-slate-850'
      }`}
    >
      {/* Header: Brand, Product Name, Category & Stock Status */}
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-1">
          <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400 flex items-center gap-1">
            <Package size={10} className="text-indigo-500" />
            {product.brand || 'Retail Product'}
          </span>
          <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
            {product.name}
          </h4>
          {product.variant && (
            <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-slate-50 dark:bg-slate-950 text-slate-500 rounded border border-slate-150 dark:border-slate-850 mt-1">
              Variant: {product.variant}
            </span>
          )}
        </div>

        <div className="text-right shrink-0 space-y-1">
          {isOut ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/30">
              Out of Stock
            </span>
          ) : isLow ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/30">
              Low Stock Alert
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/30">
              In Stock
            </span>
          )}
          <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">{product.category}</span>
        </div>
      </div>

      {/* Product Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850/60 divide-x divide-slate-150 dark:divide-slate-850">
        <div>
          <span className="text-[8px] font-extrabold uppercase text-slate-400 block tracking-wider">Inventory Stock</span>
          <strong className="text-sm font-black text-slate-800 dark:text-white block mt-0.5">
            {product.currentStock} <span className="text-[10px] font-medium text-slate-400">{formatStockUnit(product.currentStock, product.stockUnit)}</span>
          </strong>
          <span className="text-[9px] text-slate-400">Unit: {product.stockUnit || 'Pcs'}</span>
        </div>

        <div className="pl-2.5 flex flex-col justify-between">
          <div>
            <span className="text-[8px] font-extrabold uppercase text-slate-400 block tracking-wider">Selling Price</span>
            <strong className="text-sm font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">
              ₹{product.sellingPrice.toFixed(2)}
            </strong>
            {hasPurchaseCostPermission && (
              <span className="text-[9px] text-slate-400 block">Purchase cost: ₹{product.purchasePrice.toFixed(2)}</span>
            )}
          </div>
          {canEditPrice ? (
            <button
              onClick={() => onOpenPriceModal(product)}
              className="mt-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              title="Edit price"
            >
              <Tag size={9} /> Edit Price
            </button>
          ) : (
            <span className="mt-1 text-[9px] text-slate-400 font-medium flex items-center gap-0.5" title="Price edit restricted">
              <Lock size={9} /> Locked
            </span>
          )}
        </div>
      </div>

      {product.description && (
        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
          {product.description}
        </p>
      )}

      {/* Action Controls */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-850/60 gap-2">
        <button
          onClick={() => onRestockOpen(product)}
          className="flex-1 h-8 text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all border border-indigo-100/50 dark:border-indigo-900/30"
        >
          <ArrowUpRight size={12} />
          Add Stock
        </button>

        <button
          onClick={() => onReduceOpen(product)}
          className="flex-1 h-8 text-[10px] font-black uppercase text-amber-700 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:text-amber-400 px-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all border border-amber-100/50 dark:border-amber-900/30"
        >
          <ArrowDownLeft size={12} />
          Reduce Stock
        </button>

        <div className="flex gap-1 items-center">
          {canEditPrice && (
            <button
              onClick={() => onOpenPriceModal(product)}
              className="w-8 h-8 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center cursor-pointer"
              title="Edit Price & Rate"
            >
              <Tag size={12} />
            </button>
          )}

          <button
            onClick={() => onEditOpen(product)}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-850 dark:hover:text-slate-100 flex items-center justify-center cursor-pointer"
            title="Edit Product"
          >
            <Edit2 size={12} />
          </button>

          <button
            onClick={() => onDeleteProduct(product.id, product.name)}
            className="w-8 h-8 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-slate-800 text-rose-500 hover:text-rose-600 flex items-center justify-center cursor-pointer"
            title="Delete Product"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
