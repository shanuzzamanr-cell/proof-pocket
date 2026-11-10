import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../data/samplePurchases';
import { getWarrantyStatus } from '../../utils/dateUtils';
import { Purchase, WarrantyUrgencyCategory } from '../../types';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  ShieldOff,
  Calendar, 
  Sparkles,
  ChevronRight,
  Printer,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { ReportExportModal } from '../export/ReportExportModal';

type FilterTab = 'all' | 'critical_7d' | 'urgent_30d' | 'upcoming_90d' | 'active' | 'expired' | 'no_warranty';

export const WarrantyTrackerScreen: React.FC = () => {
  const { purchases, setSelectedPurchase, currency, setIsAddModalOpen, isLoading } = useApp();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Compute status for all items
  const itemsWithStatus = purchases.map((p) => ({
    purchase: p,
    info: getWarrantyStatus(p.warrantyEndDate, p.hasWarranty),
  }));

  const criticalItems = itemsWithStatus.filter(i => i.info.urgencyCategory === 'critical_7d');
  const urgentItems = itemsWithStatus.filter(i => i.info.urgencyCategory === 'urgent_30d');
  const upcomingItems = itemsWithStatus.filter(i => i.info.urgencyCategory === 'upcoming_90d');
  const activeItems = itemsWithStatus.filter(i => i.info.urgencyCategory === 'active');
  const expiredItems = itemsWithStatus.filter(i => i.info.urgencyCategory === 'expired');
  const noWarrantyItems = itemsWithStatus.filter(i => i.info.urgencyCategory === 'no_warranty');

  // Value covered
  const totalProtectedValue = [...criticalItems, ...urgentItems, ...upcomingItems, ...activeItems]
    .reduce((acc, i) => acc + (i.purchase.price || 0), 0);
  const criticalUrgentValue = [...criticalItems, ...urgentItems]
    .reduce((acc, i) => acc + (i.purchase.price || 0), 0);
  const expiredValue = expiredItems.reduce((acc, i) => acc + (i.purchase.price || 0), 0);

  // Filtered according to tab
  const displayedItems = itemsWithStatus.filter((i) => {
    if (activeTab === 'all') return true;
    return i.info.urgencyCategory === activeTab;
  }).sort((a, b) => {
    // Put non-warranty items at the end
    if (a.info.urgencyCategory === 'no_warranty') return 1;
    if (b.info.urgencyCategory === 'no_warranty') return -1;
    return a.info.daysLeft - b.info.daysLeft;
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto py-12 text-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-mono">Loading warranty tracker...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Warranty Tracker & Protection Timeline
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-tier expiration warnings (7-day critical, 30-day urgent, 90-day upcoming).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Add Product Warranty
          </button>
        </div>
      </div>

      {/* Coverage Value KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Total Protected Value
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1.5">
            {formatCurrency(totalProtectedValue, currency)}
          </p>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
            {criticalItems.length + urgentItems.length + upcomingItems.length + activeItems.length} products under active manufacturer protection
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Critical & Urgent (&le; 30d)
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1.5">
            {formatCurrency(criticalUrgentValue, currency)}
          </p>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1">
            {criticalItems.length} critical (&le;7d) · {urgentItems.length} urgent (&le;30d)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Concluded Warranties
            </span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1.5">
            {formatCurrency(expiredValue, currency)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {expiredItems.length} expired · {noWarrantyItems.length} sold without warranty
          </p>
        </div>
      </div>

      {/* Segmented Multi-Tier Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          All ({purchases.length})
        </button>

        <button
          onClick={() => setActiveTab('critical_7d')}
          className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'critical_7d'
              ? 'bg-rose-600 text-white shadow-xs font-bold'
              : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          }`}
        >
          {criticalItems.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
          <span>Critical &le;7d ({criticalItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('urgent_30d')}
          className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'urgent_30d'
              ? 'bg-amber-500 text-white shadow-xs font-bold'
              : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
          }`}
        >
          Urgent &le;30d ({urgentItems.length})
        </button>

        <button
          onClick={() => setActiveTab('upcoming_90d')}
          className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'upcoming_90d'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
          }`}
        >
          Upcoming &le;90d ({upcomingItems.length})
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'active'
              ? 'bg-emerald-600 text-white shadow-xs font-bold'
              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
          }`}
        >
          Active &gt;90d ({activeItems.length})
        </button>

        <button
          onClick={() => setActiveTab('expired')}
          className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'expired'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Expired ({expiredItems.length})
        </button>

        {noWarrantyItems.length > 0 && (
          <button
            onClick={() => setActiveTab('no_warranty')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'no_warranty'
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            No Warranty ({noWarrantyItems.length})
          </button>
        )}
      </div>

      {/* Chronological Timeline Schedule */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Protection Timeline</span>
        </h3>

        {displayedItems.length > 0 ? (
          <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-6 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {displayedItems.map(({ purchase, info }) => {
              const isCritical = info.urgencyCategory === 'critical_7d';
              const isUrgent = info.urgencyCategory === 'urgent_30d';
              const isUpcoming = info.urgencyCategory === 'upcoming_90d';
              const isExpired = info.urgencyCategory === 'expired';
              const isNoWarranty = info.urgencyCategory === 'no_warranty';

              return (
                <div
                  key={purchase.id}
                  onClick={() => setSelectedPurchase(purchase)}
                  role="button"
                  tabIndex={0}
                  className={`relative flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer group text-left ml-2 sm:ml-0 shadow-xs hover:shadow-md ${
                    isCritical
                      ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20'
                      : isUrgent
                      ? 'border-amber-200 dark:border-amber-900/60'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Timeline Node Indicator */}
                  <div
                    className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      isCritical
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 ring-4 ring-rose-50 dark:ring-slate-900'
                        : isUrgent
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 ring-4 ring-amber-50 dark:ring-slate-900'
                        : isUpcoming
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 ring-4 ring-white dark:ring-slate-900'
                        : isExpired
                        ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                        : isNoWarranty
                        ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 ring-4 ring-white dark:ring-slate-900'
                    }`}
                  >
                    {isCritical ? (
                      <ShieldAlert className="w-4 h-4 animate-bounce" />
                    ) : isUrgent ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : isUpcoming ? (
                      <Clock className="w-4 h-4" />
                    ) : isExpired ? (
                      <XCircle className="w-4 h-4" />
                    ) : isNoWarranty ? (
                      <ShieldOff className="w-4 h-4" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                  </div>

                  {/* Item Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {purchase.brand}
                          </span>
                          <span>·</span>
                          <span>{purchase.category}</span>
                          <span>·</span>
                          <span>{purchase.storeName}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {purchase.productName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 sm:text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(purchase.price, currency)}
                        </span>
                        <span
                          className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-lg ${
                            isCritical
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 ring-1 ring-rose-400/30'
                              : isUrgent
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : isUpcoming
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : isExpired
                              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              : isNoWarranty
                              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {info.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-2 font-mono text-[11px]">
                      {purchase.hasWarranty ? (
                        <>
                          <span>Coverage: {purchase.warrantyDuration} {purchase.warrantyUnit}</span>
                          <span>·</span>
                          <span>Purchase: {purchase.purchaseDate}</span>
                          <span>·</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Expires: {purchase.warrantyEndDate}
                          </span>
                        </>
                      ) : (
                        <span>Standard Sale · Purchased {purchase.purchaseDate}</span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 self-center group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all hidden sm:block" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <ShieldCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-500">
              No products found in the selected warranty status tier.
            </p>
          </div>
        )}
      </div>

      {/* Practical Warranty Tips Card */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>ProofPocket Warranty Best Practices</span>
        </h4>
        <ul className="text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
          <li>
            <strong>Inspect before the 7-day critical countdown:</strong> Test batteries, screens, connectors, and buttons before coverage lapses.
          </li>
          <li>
            <strong>Keep the serial and invoice together:</strong> Manufacturers require proof of purchase and matching serial numbers for warranty replacement.
          </li>
          <li>
            <strong>Credit card extended warranties:</strong> Many credit cards add 1 additional year beyond manufacturer warranty—ProofPocket receipts serve as proof for card benefit claims.
          </li>
        </ul>
      </div>

      {/* Report Modal */}
      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        initialPurchases={displayedItems.map(i => i.purchase)}
      />
    </div>
  );
};
