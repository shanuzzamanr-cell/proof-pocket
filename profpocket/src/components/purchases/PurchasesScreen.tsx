import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PurchaseCard } from './PurchaseCard';
import { Category, WarrantyUrgencyCategory } from '../../types';
import { formatCurrency } from '../../data/samplePurchases';
import { getWarrantyStatus } from '../../utils/dateUtils';
import { 
  Search, 
  ArrowUpDown, 
  Plus, 
  ShoppingBag, 
  LayoutGrid, 
  List,
  X,
  ShieldCheck, 
  Filter, 
  SlidersHorizontal, 
  Printer, 
  Sparkles, 
  DollarSign, 
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ReportExportModal } from '../export/ReportExportModal';
import { ReceiptScannerModal } from '../scanner/ReceiptScannerModal';

const CATEGORIES: (Category | 'All')[] = [
  'All',
  'Electronics',
  'Audio',
  'Home Appliances',
  'Wearables',
  'Furniture',
  'Tools & Gadgets',
  'Computers',
  'Other',
];

type SortOption = 'newest' | 'oldest' | 'price_high' | 'price_low' | 'name_asc' | 'expiry_soon';
type UrgencyFilterOption = 'all' | 'critical_7d' | 'urgent_30d' | 'upcoming_90d' | 'active' | 'expired' | 'no_warranty';

export const PurchasesScreen: React.FC = () => {
  const { 
    purchases, 
    searchQuery, 
    setSearchQuery, 
    selectedCategory, 
    setSelectedCategory, 
    setIsAddModalOpen,
    currency,
    isLoading 
  } = useApp();

  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilterOption>('all');
  
  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  // Filter and sort purchases
  const filteredPurchases = useMemo(() => {
    return purchases
      .filter((p) => {
        // Category filter
        if (selectedCategory !== 'All' && p.category !== selectedCategory) {
          return false;
        }

        // Urgency / Warranty Status filter
        if (urgencyFilter !== 'all') {
          const s = getWarrantyStatus(p.warrantyEndDate, p.hasWarranty);
          if (s.urgencyCategory !== urgencyFilter) {
            return false;
          }
        }

        // Price range filter
        const min = parseFloat(minPrice);
        if (!isNaN(min) && p.price < min) {
          return false;
        }
        const max = parseFloat(maxPrice);
        if (!isNaN(max) && p.price > max) {
          return false;
        }

        // Date range filter
        if (startDate && p.purchaseDate < startDate) {
          return false;
        }
        if (endDate && p.purchaseDate > endDate) {
          return false;
        }

        // Search query filter (matches product name, brand, store, serial, order #, or notes)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.productName.toLowerCase().includes(q);
          const matchBrand = p.brand.toLowerCase().includes(q);
          const matchStore = p.storeName.toLowerCase().includes(q);
          const matchSerial = p.serialNumber?.toLowerCase().includes(q);
          const matchOrder = p.orderNumber?.toLowerCase().includes(q);
          const matchNotes = p.notes?.toLowerCase().includes(q);
          if (!matchName && !matchBrand && !matchStore && !matchSerial && !matchOrder && !matchNotes) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'newest') {
          return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
        }
        if (sortOption === 'oldest') {
          return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        }
        if (sortOption === 'price_high') {
          return b.price - a.price;
        }
        if (sortOption === 'price_low') {
          return a.price - b.price;
        }
        if (sortOption === 'name_asc') {
          return a.productName.localeCompare(b.productName);
        }
        if (sortOption === 'expiry_soon') {
          const aInfo = getWarrantyStatus(a.warrantyEndDate, a.hasWarranty);
          const bInfo = getWarrantyStatus(b.warrantyEndDate, b.hasWarranty);
          return aInfo.daysLeft - bInfo.daysLeft;
        }
        return 0;
      });
  }, [purchases, selectedCategory, urgencyFilter, minPrice, maxPrice, startDate, endDate, searchQuery, sortOption]);

  const filteredTotalValue = filteredPurchases.reduce((acc, p) => acc + p.price, 0);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setUrgencyFilter('all');
    setMinPrice('');
    setMaxPrice('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = 
    searchQuery !== '' || 
    selectedCategory !== 'All' || 
    urgencyFilter !== 'all' || 
    minPrice !== '' || 
    maxPrice !== '' || 
    startDate !== '' || 
    endDate !== '';

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto py-12 text-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-mono">Loading purchase vault from storage...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-14">
      {/* Title & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Purchases
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredPurchases.length}</strong> of {purchases.length} items · Total Value:{' '}
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {formatCurrency(filteredTotalValue, currency)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Smart OCR Scanner CTA */}
          <button
            onClick={() => setIsScannerModalOpen(true)}
            className="h-9 px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200/50 dark:border-emerald-800/50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Scan Receipt</span>
          </button>

          {/* Export Report */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export or print PDF report"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Compact list view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Add Purchase */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Purchase</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Primary Search & Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product, brand, store, serial, order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Urgency Status Filter */}
        <div className="sm:col-span-3 relative">
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value as UrgencyFilterOption)}
            className="w-full pl-8 pr-7 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs font-medium cursor-pointer"
          >
            <option value="all">Warranty: All Tiers</option>
            <option value="critical_7d">Critical (&le; 7 days)</option>
            <option value="urgent_30d">Urgent (&le; 30 days)</option>
            <option value="upcoming_90d">Upcoming (&le; 90 days)</option>
            <option value="active">Active (&gt; 90 days)</option>
            <option value="expired">Expired Warranties</option>
            <option value="no_warranty">No Warranty</option>
          </select>
          <ShieldCheck className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Sort & Advanced Filters Toggle */}
        <div className="sm:col-span-3 flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="w-full pl-8 pr-7 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs font-medium cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="price_high">Price: High to Low</option>
              <option value="price_low">Price: Low to High</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="expiry_soon">Expiring Soonest</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
              showAdvancedFilters || minPrice || maxPrice || startDate || endDate
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
            title="Toggle advanced price & date range filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Advanced Filter Drawer (Price Range & Date Range) */}
      {showAdvancedFilters && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>Advanced Filter Parameters</span>
            </span>
            <button
              onClick={clearAllFilters}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Min Price */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Min Price ({currency})
              </label>
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Max Price ({currency})
              </label>
              <input
                type="number"
                min="0"
                placeholder="1000.00"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* From Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Purchased After
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Purchased Before
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center gap-1.5 min-w-max">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-semibold'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Filter Clear Tag */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active filters: {filteredPurchases.length} matching purchases</span>
          </div>
          <button
            onClick={clearAllFilters}
            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Purchases List / Grid */}
      {filteredPurchases.length > 0 ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-3.5'
              : 'space-y-2'
          }
        >
          {filteredPurchases.map((purchase) => (
            <PurchaseCard 
              key={purchase.id} 
              purchase={purchase} 
              compact={viewMode === 'list'}
            />
          ))}
        </div>
      ) : purchases.length === 0 ? (
        /* Empty State: Whole Vault is Empty */
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Your Purchase Vault is Empty
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Start adding your products to keep receipts organized and never miss a warranty expiration.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setIsScannerModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Scan Receipt Image</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Manual Entry</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty State: Search / Filter Yielded No Results */
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              No purchases match your criteria
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              We couldn't find any products matching your active filters. Try broadening your price range or search terms.
            </p>
          </div>
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-xl transition-colors inline-block cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Modals */}
      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        initialPurchases={filteredPurchases}
      />

      <ReceiptScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
      />
    </div>
  );
};
