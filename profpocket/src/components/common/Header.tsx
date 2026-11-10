import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Plus, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Search,
  Cloud,
  CloudOff,
  Sparkles
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { ReceiptScannerModal } from '../scanner/ReceiptScannerModal';

export const Header: React.FC = () => {
  const { 
    activeScreen, 
    setActiveScreen, 
    theme, 
    toggleTheme, 
    setIsAddModalOpen, 
    searchQuery, 
    setSearchQuery,
    cloudSyncStatus 
  } = useApp();

  const { user, setIsAuthModalOpen } = useAuth();
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const getScreenTitle = () => {
    switch (activeScreen) {
      case 'dashboard':
        return 'Overview';
      case 'purchases':
        return 'My Purchases';
      case 'warranty':
        return 'Warranty Tracker';
      case 'analytics':
        return 'Spending & Analytics';
      case 'settings':
        return 'Settings & Vault';
      default:
        return 'Overview';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Mobile Left / Desktop Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
              ProofPocket
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>ProofPocket</span>
            <span>/</span>
            <span className="font-semibold text-slate-900 dark:text-white text-sm">
              {getScreenTitle()}
            </span>
            {user ? (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono flex items-center gap-1 font-medium">
                <Cloud className="w-3 h-3 text-emerald-600" /> Cloud Synced
              </span>
            ) : (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-mono flex items-center gap-1 font-medium">
                <CloudOff className="w-3 h-3 text-slate-400" /> Offline / Guest
              </span>
            )}
          </div>
        </div>

        {/* Center / Search bar for Purchases or quick jump */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search purchases, brands, stores..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeScreen !== 'purchases') {
                  setActiveScreen('purchases');
                }
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all outline-none"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Smart Scan Quick CTA */}
          <button
            onClick={() => setIsScannerOpen(true)}
            aria-label="Smart Scan Receipt with AI"
            title="Scan Receipt with AI"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* In-app Notification Bell */}
          <NotificationBell />

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveScreen('settings')}
                className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] uppercase font-bold overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user.displayName?.[0] || user.email?.[0] || 'U'
                  )}
                </div>
                <span className="truncate max-w-[100px]">{user.displayName || user.email?.split('@')[0]}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )}

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Quick Add CTA */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Purchase</span>
          </button>
        </div>
      </div>

      {/* Global Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </header>
  );
};
