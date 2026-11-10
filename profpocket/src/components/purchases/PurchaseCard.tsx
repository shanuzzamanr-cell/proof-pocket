import React from 'react';
import { Purchase } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../data/samplePurchases';
import { getWarrantyStatus } from '../../utils/dateUtils';
import { ShieldCheck, AlertTriangle, XCircle, ShieldOff, Store, ChevronRight, FileText, ShieldAlert, Clock } from 'lucide-react';

interface PurchaseCardProps {
  purchase: Purchase;
  compact?: boolean;
}

export const PurchaseCard: React.FC<PurchaseCardProps> = ({ purchase, compact = false }) => {
  const { setSelectedPurchase, currency } = useApp();
  const warrantyInfo = getWarrantyStatus(purchase.warrantyEndDate, purchase.hasWarranty);

  const getStatusBadge = () => {
    switch (warrantyInfo.urgencyCategory) {
      case 'critical_7d':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Critical · {warrantyInfo.label}</span>
          </span>
        );
      case 'urgent_30d':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Urgent · {warrantyInfo.label}</span>
          </span>
        );
      case 'upcoming_90d':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Upcoming · {warrantyInfo.label}</span>
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Active · {warrantyInfo.label}</span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{warrantyInfo.label}</span>
          </span>
        );
      case 'no_warranty':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            <ShieldOff className="w-3.5 h-3.5 shrink-0" />
            <span>No Warranty</span>
          </span>
        );
    }
  };

  const imageSrc = purchase.productImage || purchase.receiptImage;

  return (
    <div
      onClick={() => setSelectedPurchase(purchase)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          setSelectedPurchase(purchase);
        }
      }}
      className="group relative flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all cursor-pointer text-left"
    >
      {/* Thumbnail */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/50 dark:border-slate-700/50">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={purchase.productName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <FileText className="w-6 h-6 stroke-[1.5]" />
            <span className="text-[9px] uppercase tracking-wider font-mono mt-1">Receipt</span>
          </div>
        )}
        {purchase.receiptImage && purchase.productImage && (
          <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/60 text-white text-[8px] font-mono tracking-tight flex items-center gap-0.5">
            <FileText className="w-2.5 h-2.5" />
            <span>Doc</span>
          </div>
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0 pr-1">
        {/* Brand & Category */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{purchase.brand}</span>
          <span aria-hidden="true">·</span>
          <span>{purchase.category}</span>
        </div>

        {/* Product Title */}
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate mt-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {purchase.productName}
        </h4>

        {/* Store & Date */}
        {!compact && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="inline-flex items-center gap-1 truncate max-w-[130px] sm:max-w-[180px]">
              <Store className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{purchase.storeName}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[11px]">{purchase.purchaseDate}</span>
          </div>
        )}

        {/* Warranty Status Label */}
        <div className="mt-1.5">
          {getStatusBadge()}
        </div>
      </div>

      {/* Price & Action */}
      <div className="flex flex-col items-end justify-between shrink-0 h-full py-0.5">
        <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
          {formatCurrency(purchase.price, currency)}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all mt-3" />
      </div>
    </div>
  );
};
