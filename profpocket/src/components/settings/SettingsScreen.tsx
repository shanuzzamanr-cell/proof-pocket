import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { CURRENCIES, formatCurrency } from '../../data/samplePurchases';
import { CurrencyCode, Purchase } from '../../types';
import { exportPurchasesToCSV, mapCSVToPurchases } from '../../utils/csvUtils';
import { requestBrowserNotificationPermission, sendBrowserNotification } from '../../services/notificationService';
import { 
  User, 
  Moon, 
  Sun, 
  Coins, 
  Bell, 
  Download, 
  Upload, 
  RotateCcw, 
  Trash2, 
  ShieldCheck, 
  HardDrive, 
  Info,
  Cloud,
  CloudOff,
  LogOut,
  LogIn,
  Key,
  Copy,
  Check,
  FileSpreadsheet,
  AlertTriangle,
  X
} from 'lucide-react';

interface ImportPreviewData {
  fileName: string;
  totalParsed: number;
  duplicateCount: number;
  newCount: number;
  newPurchases: Purchase[];
  allPurchases: Purchase[];
}

export const SettingsScreen: React.FC = () => {
  const { 
    userProfile, 
    updateUserProfile, 
    theme, 
    toggleTheme, 
    currency, 
    setCurrency, 
    notifications, 
    setNotifications,
    purchases,
    resetData,
    clearData,
    importData,
    cloudSyncStatus,
    showToast
  } = useApp();

  const { user, signOut, setIsAuthModalOpen } = useAuth();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(userProfile.name);
  const [profileEmail, setProfileEmail] = useState(userProfile.email);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  // Pre-import confirmation state
  const [importPreview, setImportPreview] = useState<ImportPreviewData | null>(null);

  const importFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    try {
      await updateUserProfile({
        name: profileName.trim() || userProfile.name,
        email: profileEmail.trim() || userProfile.email,
      });
      setIsEditingProfile(false);
    } finally {
      setIsBusy(false);
    }
  };

  const copyUidToClipboard = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    showToast('Firebase UID copied to clipboard', 'info');
    setTimeout(() => setCopiedUid(false), 2500);
  };

  // Export JSON
  const handleExportJSON = () => {
    const exportObject = {
      app: 'ProofPocket',
      version: '4.0.0-phase04',
      exportedAt: new Date().toISOString(),
      user: {
        ...userProfile,
        firebaseUid: user?.uid || null,
        isCloudAuthenticated: !!user,
      },
      purchases,
    };
    const jsonString = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proofpocket-vault-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Vault backup JSON exported successfully', 'success');
  };

  // Export CSV
  const handleExportCSV = () => {
    const csvContent = exportPurchasesToCSV(purchases);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proofpocket-purchases-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Purchases exported to CSV spreadsheet', 'success');
  };

  // Parse and preview backup file (JSON or CSV)
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isCsv = file.name.endsWith('.csv');
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        let importedItems: Purchase[] = [];

        if (isCsv) {
          const { validPurchases, errors } = mapCSVToPurchases(reader.result as string, currency);
          if (validPurchases.length === 0) {
            showToast(`Could not parse CSV: ${errors[0] || 'No valid rows found'}`, 'error');
            return;
          }
          importedItems = validPurchases as Purchase[];
        } else {
          const parsed = JSON.parse(reader.result as string);
          if (parsed && Array.isArray(parsed.purchases)) {
            importedItems = parsed.purchases;
          } else if (Array.isArray(parsed)) {
            importedItems = parsed;
          } else {
            showToast('Invalid backup file structure: missing purchases list', 'error');
            return;
          }
        }

        // Duplicate detection: compare against current purchases
        const existingKeys = new Set(
          purchases.map((p) =>
            p.serialNumber
              ? `sn-${p.serialNumber.toLowerCase()}`
              : `${p.productName.toLowerCase()}-${p.purchaseDate}-${p.price}`
          )
        );

        const newItems: Purchase[] = [];
        let dupes = 0;

        importedItems.forEach((item) => {
          const key = item.serialNumber
            ? `sn-${item.serialNumber.toLowerCase()}`
            : `${item.productName.toLowerCase()}-${item.purchaseDate}-${item.price}`;
          if (existingKeys.has(key)) {
            dupes++;
          } else {
            newItems.push(item);
          }
        });

        setImportPreview({
          fileName: file.name,
          totalParsed: importedItems.length,
          duplicateCount: dupes,
          newCount: newItems.length,
          newPurchases: newItems,
          allPurchases: importedItems,
        });
      } catch (err: any) {
        showToast(`Failed to parse file: ${err?.message || 'Invalid format'}`, 'error');
      } finally {
        if (importFileInputRef.current) importFileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const confirmImport = async (skipDuplicates: boolean) => {
    if (!importPreview) return;
    setIsBusy(true);
    try {
      const itemsToImport = skipDuplicates ? importPreview.newPurchases : importPreview.allPurchases;
      const count = await importData(itemsToImport);
      showToast(`Successfully imported ${count} purchases into your vault`, 'success');
      setImportPreview(null);
    } catch (err: any) {
      showToast(`Import error: ${err?.message || 'Failed to save items'}`, 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    showToast('Notification preference saved', 'info');
  };

  const handleToggleBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('Browser notifications are not supported in this browser.', 'error');
      return;
    }

    if (browserPermission === 'granted') {
      setNotifications(prev => ({ ...prev, browserNotificationsEnabled: !prev.browserNotificationsEnabled }));
      showToast('Browser notification setting toggled', 'info');
    } else {
      const perm = await requestBrowserNotificationPermission();
      setBrowserPermission(perm);
      if (perm === 'granted') {
        setNotifications(prev => ({ ...prev, browserNotificationsEnabled: true }));
        sendBrowserNotification('ProofPocket Notifications Enabled', 'You will now receive urgent warranty reminders in your browser.');
        showToast('Browser notifications enabled!', 'success');
      } else {
        showToast('Notification permission was denied in your browser settings.', 'error');
      }
    }
  };

  const handleReset = async () => {
    setIsBusy(true);
    try {
      await resetData();
    } finally {
      setIsBusy(false);
    }
  };

  const handleClear = async () => {
    setIsBusy(true);
    try {
      await clearData();
      setShowClearConfirm(false);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-14">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings & Cloud Vault
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your Firebase account, Cloud Firestore sync, display preferences, and data privacy.
        </p>
      </div>

      {/* Pre-Import Preview & Validation Modal */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Validate & Confirm Import
                </h3>
              </div>
              <button
                onClick={() => setImportPreview(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1.5 text-xs">
              <p className="text-slate-500">File: <strong className="text-slate-900 dark:text-white font-mono">{importPreview.fileName}</strong></p>
              <p className="text-slate-700 dark:text-slate-300">
                Total Valid Purchases Detected: <strong className="font-mono">{importPreview.totalParsed}</strong>
              </p>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {importPreview.newCount} New Items
                </span>
                {importPreview.duplicateCount > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {importPreview.duplicateCount} Duplicates Found
                  </span>
                )}
              </div>
            </div>

            {importPreview.duplicateCount > 0 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Some purchases in this file match existing records in your vault (by serial number or product name, date, and price). Choose whether to skip duplicates or import all.
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setImportPreview(null)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {importPreview.duplicateCount > 0 && (
                <button
                  onClick={() => confirmImport(true)}
                  disabled={isBusy || importPreview.newCount === 0}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Skip Duplicates ({importPreview.newCount})
                </button>
              )}

              <button
                onClick={() => confirmImport(false)}
                disabled={isBusy}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isBusy ? 'Importing...' : `Import All (${importPreview.totalParsed})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Firebase Authentication & Account Card */}
      <section className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <span>Account & Authentication</span>
          </h3>
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
              <button
                onClick={() => signOut()}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Create Account</span>
            </button>
          )}
        </div>

        {user ? (
          isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email || profileEmail}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isBusy ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs shrink-0">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user.displayName?.[0] || user.email?.[0] || 'U'
                  )}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {user.displayName || userProfile.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {user.email}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Firebase Cloud Active</span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <button
                      onClick={copyUidToClipboard}
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                      title="Copy UID"
                    >
                      <Key className="w-3 h-3" />
                      <span>UID: {user.uid.substring(0, 8)}...</span>
                      {copiedUid ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-right">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Security Rules</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">ABAC Isolated</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">users/{user.uid}</span>
              </div>
            </div>
          )
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CloudOff className="w-6 h-6 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  You are currently using Local Guest Mode
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sign in or create an account to back up your purchase receipts and access warranties on any device.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
            >
              Sign In
            </button>
          </div>
        )}
      </section>

      {/* 2. Theme & Display */}
      <section className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {theme === 'dark' ? <Moon className="w-4 h-4 text-emerald-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
          <span>Appearance & Theme</span>
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Color Mode
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Switch between Light Mode and Dark Mode.
            </p>
          </div>

          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => {
                if (theme !== 'light') toggleTheme();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
            <button
              onClick={() => {
                if (theme !== 'dark') toggleTheme();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Currency Preferences */}
      <section className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-600" />
            <span>Default Currency</span>
          </h3>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {currency} ({CURRENCIES[currency].symbol})
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select which currency symbol and format to use for your purchases and warranty asset tracking.
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
          {Object.keys(CURRENCIES).map((code) => {
            const isSelected = currency === code;
            const c = CURRENCIES[code];
            return (
              <button
                key={code}
                onClick={() => setCurrency(code as CurrencyCode)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-bold font-mono">{c.symbol}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{c.code}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Notification Preferences */}
      <section className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-600" />
          <span>Notification & Alert Automation</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure multi-tier warranty reminders and return window alerts.
        </p>

        {/* Browser Permission Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Browser Web Notifications
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Requires browser permission. Notifications deliver while the app is active in your browser. (Note: Offline background delivery when browser is closed requires web push services).
            </p>
          </div>
          <button
            onClick={handleToggleBrowserNotifications}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              notifications.browserNotificationsEnabled && browserPermission === 'granted'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
            }`}
          >
            {notifications.browserNotificationsEnabled && browserPermission === 'granted'
              ? 'Permission Enabled'
              : 'Enable Notifications'}
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-1">
          {/* 7-day alert */}
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>7-Day Critical Warranty Warning</span>
              </p>
              <p className="text-[11px] text-slate-400">Urgent prompt to test items and contact support before coverage ends</p>
            </div>
            <button
              onClick={() => toggleNotification('warrantySevenDays')}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                notifications.warrantySevenDays ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  notifications.warrantySevenDays ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 30-day alert */}
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>30-Day Urgent Warranty Warning</span>
              </p>
              <p className="text-[11px] text-slate-400">Early reminder to check product condition</p>
            </div>
            <button
              onClick={() => toggleNotification('warrantyThirtyDays')}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                notifications.warrantyThirtyDays ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  notifications.warrantyThirtyDays ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 90-day alert */}
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>90-Day Upcoming Warranty Reminder</span>
              </p>
              <p className="text-[11px] text-slate-400">Quarterly advance notice for planned renewals or maintenance</p>
            </div>
            <button
              onClick={() => toggleNotification('warrantyNinetyDays')}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                notifications.warrantyNinetyDays ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  notifications.warrantyNinetyDays ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Return window */}
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Store return window reminder (3 days prior)
              </p>
              <p className="text-[11px] text-slate-400">Alerts 3 days before store return deadline expires</p>
            </div>
            <button
              onClick={() => toggleNotification('returnWindowReminder')}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                notifications.returnWindowReminder ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  notifications.returnWindowReminder ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Weekly digest */}
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Weekly digest & warranty health report
              </p>
              <p className="text-[11px] text-slate-400">Summary of upcoming renewals and newly saved receipts</p>
            </div>
            <button
              onClick={() => toggleNotification('weeklyDigest')}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                notifications.weeklyDigest ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  notifications.weeklyDigest ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* 5. Cloud Firestore & Database Management (Backup & Restore) */}
      <section className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-600" />
            <span>Database Backup & Restore</span>
          </h3>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
            {user ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
            <span>{user ? 'Firestore Live Sync' : 'Local Offline Vault'}</span>
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Exports include all purchase metadata, warranty dates, retailers, and prices. <strong>JSON format</strong> preserves embedded receipt image data; <strong>CSV format</strong> is optimal for Excel and Google Sheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON (with images)</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV Spreadsheet</span>
          </button>

          {/* Import Backup (JSON or CSV) */}
          <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-colors cursor-pointer border border-emerald-200/60 dark:border-emerald-800/60">
            <Upload className="w-4 h-4" />
            <span>Import Backup (JSON / CSV)</span>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          {/* Reset to sample data */}
          {!user && (
            <button
              onClick={handleReset}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Sample Data</span>
            </button>
          )}

          {/* Clear vault data */}
          {!user && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-400 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Vault</span>
            </button>
          )}
        </div>

        {showClearConfirm && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-rose-800 dark:text-rose-300 font-medium">
              Are you sure? This will remove all local sample receipts and warranty records.
            </span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={isBusy}
                className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                disabled={isBusy}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
              >
                {isBusy ? 'Clearing...' : 'Confirm Clear'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 6. Phase 04 Automation & Smart Vault Badge */}
      <div className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center text-xs space-y-1">
        <p className="font-bold text-slate-800 dark:text-slate-200">
          ProofPocket — Phase 04 Smart Automation & Analytics
        </p>
        <p className="text-slate-400 text-[11px]">
          Intelligent Receipt OCR (Gemini 3.8 Flash) · Multi-Tier Warranty Risk · Print PDF Exports · CSV/JSON Vault Backups
        </p>
      </div>
    </div>
  );
};
