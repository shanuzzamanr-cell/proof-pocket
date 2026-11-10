import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ActiveScreen } from '../../types';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ShieldCheck, 
  BarChart3,
  Settings, 
  Plus, 
  Receipt,
  Cloud,
  CloudOff,
  LogOut,
  LogIn
} from 'lucide-react';
import { calculateWarrantyStatus } from '../../data/samplePurchases';

export const Sidebar: React.FC = () => {
  const { 
    activeScreen, 
    setActiveScreen, 
    purchases, 
    setIsAddModalOpen, 
    userProfile,
    cloudSyncStatus 
  } = useApp();

  const { user, signOut, setIsAuthModalOpen } = useAuth();

  const expiringCount = purchases.filter(p => {
    const s = calculateWarrantyStatus(p.warrantyEndDate, p.hasWarranty);
    return s.status === 'expiring_soon';
  }).length;

  const navItems: { id: ActiveScreen; label: string; icon: React.FC<{ className?: string }>; badge?: number | string; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'purchases', label: 'My Purchases', icon: ShoppingBag, badge: purchases.length },
    { 
      id: 'warranty', 
      label: 'Warranty Tracker', 
      icon: ShieldCheck, 
      badge: expiringCount > 0 ? `${expiringCount} exp` : undefined,
      badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
    },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 shrink-0 select-none transition-colors">
      {/* Brand */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-none">
              ProofPocket
            </h1>
            <p className="text-[11px] text-slate-400 font-medium tracking-tight mt-0.5">
              Receipt & Warranty Vault
            </p>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="p-4">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full h-10 px-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Purchase</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                    item.badgeColor || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Vault Status Card */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Vault Status
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {user ? 'Cloud Live' : 'Local Mode'}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(15, purchases.length * 15))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
            <span>{purchases.length} items logged</span>
            <span className="flex items-center gap-1">
              {user ? <Cloud className="w-3 h-3 text-emerald-500" /> : <CloudOff className="w-3 h-3" />}
              {user ? 'Firestore' : 'IndexedDB'}
            </span>
          </div>
        </div>
      </div>

      {/* User profile / Auth row */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        {user ? (
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setActiveScreen('settings')}
              className="flex items-center gap-2.5 min-w-0 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer flex-1"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user.displayName?.[0] || user.email?.[0] || 'U'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {user.displayName || userProfile.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user.email}
                </p>
              </div>
            </button>
            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-emerald-600" />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </aside>
  );
};
