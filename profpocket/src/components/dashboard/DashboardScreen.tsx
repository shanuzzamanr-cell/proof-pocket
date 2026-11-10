import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../data/samplePurchases';
import { getWarrantyStatus } from '../../utils/dateUtils';
import { PurchaseCard } from '../purchases/PurchaseCard';
import { ReceiptScannerModal } from '../scanner/ReceiptScannerModal';
import { 
  ShieldCheck, 
  AlertTriangle, 
  ShoppingBag, 
  Plus, 
  ArrowRight, 
  Clock, 
  Sparkles, 
  BarChart3,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const { 
    purchases, 
    userProfile, 
    setIsAddModalOpen, 
    setActiveScreen, 
    setSelectedPurchase,
    currency,
    isLoading 
  } = useApp();

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Dynamic calculations from actual saved purchase records
  const totalSpending = purchases.reduce((acc, p) => acc + (p.price || 0), 0);
  
  const statusCounts = purchases.reduce(
    (acc, p) => {
      const s = getWarrantyStatus(p.warrantyEndDate, p.hasWarranty);
      acc[s.urgencyCategory] = (acc[s.urgencyCategory] || 0) + 1;
      return acc;
    },
    { 
      critical_7d: 0, 
      urgent_30d: 0, 
      upcoming_90d: 0, 
      active: 0, 
      expired: 0, 
      no_warranty: 0 
    } as Record<string, number>
  );

  // Expiring soon items sorted by shortest days left (critical 7d or urgent 30d)
  const expiringSoonItems = purchases
    .map(p => ({
      purchase: p,
      info: getWarrantyStatus(p.warrantyEndDate, p.hasWarranty),
    }))
    .filter(item => item.info.urgencyCategory === 'critical_7d' || item.info.urgencyCategory === 'urgent_30d')
    .sort((a, b) => a.info.daysLeft - b.info.daysLeft);

  // Recently added purchases (sorted by createdAt descending, top 4)
  const recentPurchases = [...purchases]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto py-12 text-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-mono">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-4">
          <img
            src={userProfile.avatarUrl}
            alt={userProfile.name}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-sm shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 font-mono">
                {todayStr}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Smart Vault Active
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
              {getGreeting()}, {userProfile.name.split(' ')[0]}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {purchases.length} {purchases.length === 1 ? 'purchase' : 'purchases'} in vault.{' '}
              {statusCounts.critical_7d > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  {statusCounts.critical_7d} warranty nearing critical expiration (&le;7d)!
                </span>
              ) : statusCounts.urgent_30d > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {statusCounts.urgent_30d} warranties expiring soon (&le;30d).
                </span>
              ) : (
                'All active warranties are in good standing.'
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="h-11 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-95 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Scan Receipt</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Purchase</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        {/* Total Purchases Count */}
        <div 
          onClick={() => setActiveScreen('purchases')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              Total Purchases
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                {purchases.length}
              </span>
              <span className="text-xs text-slate-400">items</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">
              Saved in vault
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
          </div>
        </div>

        {/* Total Spending (Links to Analytics) */}
        <div 
          onClick={() => setActiveScreen('analytics')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-emerald-300 dark:hover:border-emerald-800 transition-all cursor-pointer group"
        >
          <div>
            <div className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Total Spending</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                {formatCurrency(totalSpending, currency)}
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block mt-1">
              View spending analytics &rarr;
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 stroke-[1.75]" />
          </div>
        </div>

        {/* Active Warranties */}
        <div 
          onClick={() => setActiveScreen('warranty')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              Active Warranties
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {statusCounts.active + statusCounts.upcoming_90d}
              </span>
              <span className="text-xs text-slate-400">covered</span>
            </div>
            <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium block mt-1">
              {statusCounts.critical_7d + statusCounts.urgent_30d > 0 ? `${statusCounts.critical_7d + statusCounts.urgent_30d} need attention` : 'Healthy coverage'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 stroke-[1.75]" />
          </div>
        </div>

        {/* Expiring Soon (< 30d) */}
        <div 
          onClick={() => setActiveScreen('warranty')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-amber-300 dark:hover:border-amber-800 transition-all cursor-pointer group"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              Expiring Soon (&le;30d)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold font-mono tabular-nums ${
                statusCounts.critical_7d + statusCounts.urgent_30d > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
              }`}>
                {statusCounts.critical_7d + statusCounts.urgent_30d}
              </span>
              {statusCounts.critical_7d > 0 && (
                <span className="text-xs font-bold text-rose-500 animate-pulse">
                  ({statusCounts.critical_7d} critical)
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">
              {statusCounts.expired} expired warranties
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 stroke-[1.75]" />
          </div>
        </div>
      </div>

      {/* Upcoming Warranty Expiration Attention Section */}
      {expiringSoonItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Upcoming Expirations (Within 30 Days)
              </h3>
            </div>
            <button
              onClick={() => setActiveScreen('warranty')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Timeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {expiringSoonItems.map(({ purchase, info }) => {
              const isCritical = info.urgencyCategory === 'critical_7d';
              return (
                <div
                  key={purchase.id}
                  onClick={() => setSelectedPurchase(purchase)}
                  role="button"
                  tabIndex={0}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                    isCritical
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 hover:border-rose-300'
                      : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 hover:border-amber-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-medium">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{purchase.brand}</span>
                      <span>·</span>
                      <span className={isCritical ? 'text-rose-700 dark:text-rose-400 font-semibold' : 'text-amber-800 dark:text-amber-300'}>
                        Expires {purchase.warrantyEndDate}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
                      {purchase.productName}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Store: {purchase.storeName}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                      isCritical
                        ? 'bg-rose-200 dark:bg-rose-900/80 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500/30'
                        : 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                    }`}>
                      {info.daysLeft}d left
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recently Added Purchases */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Recently Added Purchases
            </h3>
          </div>
          {purchases.length > 0 && (
            <button
              onClick={() => setActiveScreen('purchases')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({purchases.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentPurchases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentPurchases.map((purchase) => (
              <PurchaseCard key={purchase.id} purchase={purchase} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              No purchases logged yet in your vault.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
            >
              Add First Purchase
            </button>
          </div>
        )}
      </section>

      {/* Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
};
