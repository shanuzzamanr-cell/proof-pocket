import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl shadow-slate-900/10 border border-slate-800 dark:border-slate-200 text-xs font-medium tracking-tight">
        {toast.type === 'error' ? (
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
        ) : toast.type === 'info' ? (
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        )}
        <span>{toast.message}</span>
      </div>
    </div>
  );
};
