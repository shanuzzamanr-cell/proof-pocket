import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { getAllPurchases } from '../../services/db';
import { migrateLocalPurchasesToCloud } from '../../services/cloudPurchaseService';
import { CloudUpload, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { Purchase } from '../../types';

export const MigrationBanner: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useApp();

  const [localItems, setLocalItems] = useState<Purchase[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocalItems([]);
      return;
    }

    // Check IndexedDB for existing local items
    const checkLocal = async () => {
      try {
        const stored = await getAllPurchases();
        if (stored && stored.length > 0) {
          setLocalItems(stored);
        }
      } catch {
        // ignore
      }
    };

    checkLocal();
  }, [user]);

  if (!user || localItems.length === 0 || isDismissed) {
    return null;
  }

  const handleStartMigration = async () => {
    setIsMigrating(true);
    try {
      const res = await migrateLocalPurchasesToCloud(user.uid, localItems);
      setMigrationResult({ success: res.successCount, errors: res.errors });
      showToast(`Migrated ${res.successCount} local purchases to Cloud Firestore!`, 'success');
      setTimeout(() => {
        setIsDismissed(true);
      }, 5000);
    } catch (err: any) {
      showToast(`Migration error: ${err?.message || 'Upload failed'}`, 'error');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="mb-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 shadow-xs animate-in fade-in transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <CloudUpload className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                Local Device Purchases Detected ({localItems.length} items)
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-300 font-semibold">
                Safe Cloud Sync
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/90 dark:text-emerald-400/90 mt-0.5 leading-relaxed">
              Sync your offline receipts, warranty timelines, and store notes into your authenticated Firebase cloud vault. Your offline records remain preserved.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={() => setIsDismissed(true)}
            className="px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer"
          >
            Not Now
          </button>
          <button
            onClick={handleStartMigration}
            disabled={isMigrating}
            className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isMigrating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sync to Cloud</span>
              </>
            )}
          </button>
        </div>
      </div>

      {migrationResult && (
        <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-900/60 flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>
            Successfully synchronized {migrationResult.success} purchase records to your Cloud Firestore account.
          </span>
        </div>
      )}
    </div>
  );
};
