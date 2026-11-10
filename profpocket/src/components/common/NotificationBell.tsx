import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  generateNotifications, 
  markNotificationAsDismissed, 
  clearDismissedNotifications,
  requestBrowserNotificationPermission 
} from '../../services/notificationService';
import { AppNotificationItem } from '../../types';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  Check, 
  X, 
  ShieldAlert, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const NotificationBell: React.FC = () => {
  const { purchases, notifications, setSelectedPurchase, showToast } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate real-time notifications
  const items = generateNotifications(purchases, notifications);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleNotificationClick = (item: AppNotificationItem) => {
    markNotificationAsDismissed(item.id);
    if (item.purchaseId) {
      const match = purchases.find((p) => p.id === item.purchaseId);
      if (match) {
        setSelectedPurchase(match);
      }
    }
    setIsOpen(false);
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    markNotificationAsDismissed(id);
    showToast('Reminder dismissed', 'info');
  };

  const handleDismissAll = () => {
    items.forEach((item) => markNotificationAsDismissed(item.id));
    setIsOpen(false);
    showToast('All notifications dismissed', 'info');
  };

  const hasUrgent = items.some((item) => item.type === 'warranty_7d' || item.type === 'return_deadline');

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
          isOpen
            ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <Bell className="w-4 h-4" />
        {items.length > 0 && (
          <span
            className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
              hasUrgent ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Popover Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Warranty & Return Alerts
              </span>
              {items.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                  {items.length} new
                </span>
              )}
            </div>
            {items.length > 0 && (
              <button
                onClick={handleDismissAll}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          {/* List of items */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {items.length > 0 ? (
              items.map((item) => {
                const isCritical = item.type === 'warranty_7d';
                const isReturn = item.type === 'return_deadline';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    role="button"
                    tabIndex={0}
                    className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex items-start gap-3 text-left group"
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isCritical
                          ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                          : isReturn
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                      }`}
                    >
                      {isCritical ? (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      ) : isReturn ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {item.message}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDismiss(e, item.id)}
                      title="Dismiss reminder"
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center space-y-2">
                <Check className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  You're all caught up!
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  No upcoming 7-day or 30-day warranty expirations or return deadlines requiring attention.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
