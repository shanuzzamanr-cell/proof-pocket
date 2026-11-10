import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../data/samplePurchases';
import { getWarrantyStatus } from '../../utils/dateUtils';
import { Category, Purchase } from '../../types';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  ShieldCheck, 
  ShoppingBag, 
  DollarSign, 
  Sparkles, 
  Calendar,
  AlertTriangle,
  Store,
  Tag,
  ArrowUpRight
} from 'lucide-react';

export const AnalyticsScreen: React.FC = () => {
  const { purchases, currency, setActiveScreen, setIsAddModalOpen, isLoading } = useApp();

  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Compute available years from purchase records
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    purchases.forEach((p) => {
      if (p.purchaseDate) {
        years.add(p.purchaseDate.split('-')[0]);
      }
    });
    return Array.from(years).sort().reverse();
  }, [purchases]);

  // Filter purchases by selected year if specified
  const filteredPurchases = useMemo(() => {
    if (selectedYear === 'all') return purchases;
    return purchases.filter((p) => p.purchaseDate && p.purchaseDate.startsWith(selectedYear));
  }, [purchases, selectedYear]);

  // Metrics calculations
  const totalSpend = filteredPurchases.reduce((acc, p) => acc + (p.price || 0), 0);
  const avgPurchasePrice = filteredPurchases.length > 0 ? totalSpend / filteredPurchases.length : 0;

  // Most expensive item
  const mostExpensiveItem = useMemo(() => {
    if (filteredPurchases.length === 0) return null;
    return [...filteredPurchases].sort((a, b) => b.price - a.price)[0];
  }, [filteredPurchases]);

  // Warranty status distributions
  const warrantyDistribution = useMemo(() => {
    let critical7d = 0;
    let urgent30d = 0;
    let upcoming90d = 0;
    let activeOver90d = 0;
    let expired = 0;
    let noWarranty = 0;

    filteredPurchases.forEach((p) => {
      const status = getWarrantyStatus(p.warrantyEndDate, p.hasWarranty);
      switch (status.urgencyCategory) {
        case 'critical_7d':
          critical7d++;
          break;
        case 'urgent_30d':
          urgent30d++;
          break;
        case 'upcoming_90d':
          upcoming90d++;
          break;
        case 'active':
          activeOver90d++;
          break;
        case 'expired':
          expired++;
          break;
        case 'no_warranty':
        default:
          noWarranty++;
          break;
      }
    });

    return { critical7d, urgent30d, upcoming90d, activeOver90d, expired, noWarranty };
  }, [filteredPurchases]);

  const activeProtectedSpend = useMemo(() => {
    return filteredPurchases.reduce((acc, p) => {
      const s = getWarrantyStatus(p.warrantyEndDate, p.hasWarranty);
      if (s.urgencyCategory !== 'expired' && s.urgencyCategory !== 'no_warranty') {
        return acc + p.price;
      }
      return acc;
    }, 0);
  }, [filteredPurchases]);

  // Monthly Spending for the last 12 months or selected year
  const monthlyData = useMemo(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const currentYear = selectedYear === 'all' ? new Date().getFullYear().toString() : selectedYear;
    const totals = new Array(12).fill(0);

    filteredPurchases.forEach((p) => {
      if (p.purchaseDate && p.purchaseDate.startsWith(currentYear)) {
        const parts = p.purchaseDate.split('-');
        const monthIndex = parseInt(parts[1], 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          totals[monthIndex] += p.price || 0;
        }
      }
    });

    const maxSpend = Math.max(...totals, 100);

    return months.map((month, idx) => ({
      month,
      amount: totals[idx],
      percentage: Math.round((totals[idx] / maxSpend) * 100),
    }));
  }, [filteredPurchases, selectedYear]);

  // Category Spending breakdown
  const categoryStats = useMemo(() => {
    const catMap: Record<string, { total: number; count: number }> = {};

    filteredPurchases.forEach((p) => {
      const cat = p.category || 'Other';
      if (!catMap[cat]) {
        catMap[cat] = { total: 0, count: 0 };
      }
      catMap[cat].total += p.price || 0;
      catMap[cat].count += 1;
    });

    const categories = Object.keys(catMap).map((cat) => ({
      name: cat,
      total: catMap[cat].total,
      count: catMap[cat].count,
      percent: totalSpend > 0 ? (catMap[cat].total / totalSpend) * 100 : 0,
    }));

    return categories.sort((a, b) => b.total - a.total);
  }, [filteredPurchases, totalSpend]);

  // Top Retailers
  const topStores = useMemo(() => {
    const storeMap: Record<string, { total: number; count: number }> = {};
    filteredPurchases.forEach((p) => {
      const store = p.storeName?.trim() || 'Other';
      if (!storeMap[store]) storeMap[store] = { total: 0, count: 0 };
      storeMap[store].total += p.price || 0;
      storeMap[store].count += 1;
    });

    return Object.keys(storeMap)
      .map((s) => ({
        name: s,
        total: storeMap[s].total,
        count: storeMap[s].count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredPurchases]);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto py-12 text-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-mono">Generating financial & warranty analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Spending & Protection Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time financial insights, category distribution, and warranty risk assessment.
          </p>
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-slate-500">Period:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xs outline-none cursor-pointer"
          >
            <option value="all">All-Time</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                Year {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {purchases.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            No Purchase Data to Analyze Yet
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Log receipts and product purchases to unlock monthly financial charts, category breakdowns, and warranty risk metrics.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Add First Purchase
          </button>
        </div>
      ) : (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Total Spending */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Total Purchases</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1.5">
                {formatCurrency(totalSpend, currency)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {filteredPurchases.length} total logged items
              </p>
            </div>

            {/* Average Spend per Item */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Average Item Price</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1.5">
                {formatCurrency(avgPurchasePrice, currency)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Mean spend across {filteredPurchases.length} items
              </p>
            </div>

            {/* Active Protected Value */}
            <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 shadow-xs">
              <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                <span className="text-xs font-semibold">Active Protected Spend</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300 mt-1.5">
                {formatCurrency(activeProtectedSpend, currency)}
              </p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                {totalSpend > 0 ? Math.round((activeProtectedSpend / totalSpend) * 100) : 0}% of vault currently covered
              </p>
            </div>

            {/* Most Expensive Purchase */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Largest Single Item</span>
                <ShoppingBag className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1.5">
                {mostExpensiveItem ? formatCurrency(mostExpensiveItem.price, currency) : '$0'}
              </p>
              <p className="text-[11px] text-slate-400 truncate mt-1">
                {mostExpensiveItem ? mostExpensiveItem.productName : 'None'}
              </p>
            </div>
          </div>

          {/* Monthly Spending Trend Bar Chart */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>Monthly Spending Cadence</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Visual cashflow breakdown across the calendar year
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 self-start sm:self-auto">
                {selectedYear === 'all' ? 'Current Year' : selectedYear} Total:{' '}
                {formatCurrency(
                  monthlyData.reduce((acc, m) => acc + m.amount, 0),
                  currency
                )}
              </span>
            </div>

            {/* Responsive Chart Container */}
            <div className="h-48 flex items-end justify-between gap-1 sm:gap-2 pt-6 pb-2 px-1 border-b border-slate-100 dark:border-slate-800">
              {monthlyData.map((d) => (
                <div key={d.month} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-mono font-bold px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap shadow-md z-10">
                    {d.month}: {formatCurrency(d.amount, currency)}
                  </div>

                  {/* Bar */}
                  <div
                    className="w-full max-w-[28px] rounded-t-lg bg-emerald-500/80 hover:bg-emerald-600 dark:bg-emerald-500/70 dark:hover:bg-emerald-400 transition-all min-h-[4px]"
                    style={{ height: `${Math.max(4, d.percentage)}%` }}
                  />

                  {/* Month Label */}
                  <span className="text-[10px] text-slate-400 font-mono mt-2 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    {d.month}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Distribution & Warranty Urgency Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category Breakdown */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  <span>Category Spending Breakdown</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {categoryStats.length} Categories
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {categoryStats.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {cat.name} ({cat.count})
                      </span>
                      <span className="font-mono text-slate-600 dark:text-slate-400 font-medium">
                        {formatCurrency(cat.total, currency)} ({Math.round(cat.percent)}%)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all"
                        style={{ width: `${cat.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Warranty Urgency Distribution */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Warranty Expiry Risk Tiers</span>
                </h3>
                <button
                  onClick={() => setActiveScreen('warranty')}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Tracker</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {/* Critical <= 7d */}
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block">
                    Critical (&le; 7 days)
                  </span>
                  <p className="text-xl font-bold font-mono text-rose-800 dark:text-rose-300 mt-1">
                    {warrantyDistribution.critical7d}
                  </p>
                  <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80">Immediate claim required</span>
                </div>

                {/* Urgent <= 30d */}
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block">
                    Urgent (&le; 30 days)
                  </span>
                  <p className="text-xl font-bold font-mono text-amber-800 dark:text-amber-300 mt-1">
                    {warrantyDistribution.urgent30d}
                  </p>
                  <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Expiring this month</span>
                </div>

                {/* Upcoming <= 90d */}
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 block">
                    Upcoming (&le; 90 days)
                  </span>
                  <p className="text-xl font-bold font-mono text-blue-800 dark:text-blue-300 mt-1">
                    {warrantyDistribution.upcoming90d}
                  </p>
                  <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80">Expiring in 3 months</span>
                </div>

                {/* Safe Active > 90d */}
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block">
                    Healthy Active (&gt; 90d)
                  </span>
                  <p className="text-xl font-bold font-mono text-emerald-800 dark:text-emerald-300 mt-1">
                    {warrantyDistribution.activeOver90d}
                  </p>
                  <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Under solid protection</span>
                </div>

                {/* Expired */}
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                    Expired Coverage
                  </span>
                  <p className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
                    {warrantyDistribution.expired}
                  </p>
                  <span className="text-[10px] text-slate-400">Past warranty term</span>
                </div>

                {/* No Warranty */}
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                    No Warranty
                  </span>
                  <p className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
                    {warrantyDistribution.noWarranty}
                  </p>
                  <span className="text-[10px] text-slate-400">Sold as-is / standard</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Retailers & Merchant Breakdown */}
          {topStores.length > 0 && (
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-600" />
                  <span>Top Retailers by Volume</span>
                </h3>
                <span className="text-[11px] text-slate-400">Where you shop most</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {topStores.map((store, idx) => (
                  <div
                    key={store.name}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>#{idx + 1}</span>
                      <span>{store.count} items</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {store.name}
                    </h4>
                    <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 pt-0.5">
                      {formatCurrency(store.total, currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
