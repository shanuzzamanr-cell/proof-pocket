import React from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveScreen } from '../../types';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ShieldCheck, 
  BarChart3, 
  Plus 
} from 'lucide-react';
import { calculateWarrantyStatus } from '../../data/samplePurchases';

export const BottomNav: React.FC = () => {
  const { 
    activeScreen, 
    setActiveScreen, 
    setIsAddModalOpen, 
    purchases 
  } = useApp();

  const expiringCount = purchases.filter(p => {
    const s = calculateWarrantyStatus(p.warrantyEndDate, p.hasWarranty);
    return s.status === 'expiring_soon';
  }).length;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 pb-safe shadow-lg">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {/* Home */}
        <button
          onClick={() => setActiveScreen('dashboard')}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[44px] transition-colors cursor-pointer ${
            activeScreen === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Home</span>
        </button>

        {/* Purchases */}
        <button
          onClick={() => setActiveScreen('purchases')}
          className={`relative flex flex-col items-center justify-center min-w-[52px] min-h-[44px] transition-colors cursor-pointer ${
            activeScreen === 'purchases'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Purchases</span>
          {purchases.length > 0 && (
            <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        {/* Center Prominent Add Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Add Purchase"
          className="flex items-center justify-center w-12 h-12 -mt-5 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform cursor-pointer"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Warranty */}
        <button
          onClick={() => setActiveScreen('warranty')}
          className={`relative flex flex-col items-center justify-center min-w-[52px] min-h-[44px] transition-colors cursor-pointer ${
            activeScreen === 'warranty'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Warranty</span>
          {expiringCount > 0 && (
            <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-amber-500" />
          )}
        </button>

        {/* Analytics */}
        <button
          onClick={() => setActiveScreen('analytics')}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[44px] transition-colors cursor-pointer ${
            activeScreen === 'analytics'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Analytics</span>
        </button>
      </div>
    </div>
  );
};
