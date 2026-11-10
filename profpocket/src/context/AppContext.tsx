import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Purchase, 
  ActiveScreen, 
  UserProfile, 
  AppNotificationSettings, 
  CurrencyCode, 
  Category
} from '../types';
import { DEFAULT_USER } from '../data/samplePurchases';
import { 
  getAllPurchases, 
  addPurchaseRecord, 
  updatePurchaseRecord, 
  deletePurchaseRecord, 
  clearAllPurchasesFromDB, 
  seedInitialPurchases,
  bulkImportPurchases
} from '../services/db';
import { 
  subscribeToUserPurchases, 
  createCloudPurchase, 
  updateCloudPurchase, 
  deleteCloudPurchase 
} from '../services/cloudPurchaseService';
import { useAuth } from './AuthContext';

export type WarrantyFilterOption = 'all' | 'active' | 'expiring_soon' | 'expired' | 'no_warranty';

interface AppContextType {
  purchases: Purchase[];
  isLoading: boolean;
  cloudSyncStatus: 'synced' | 'local_only' | 'syncing' | 'error';
  dbError: string | null;
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
  selectedPurchase: Purchase | null;
  setSelectedPurchase: (purchase: Purchase | null) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  editingPurchase: Purchase | null;
  setEditingPurchase: (purchase: Purchase | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: Category | 'All';
  setSelectedCategory: (cat: Category | 'All') => void;
  warrantyFilter: WarrantyFilterOption;
  setWarrantyFilter: (filter: WarrantyFilterOption) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  notifications: AppNotificationSettings;
  setNotifications: React.Dispatch<React.SetStateAction<AppNotificationSettings>>;
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  addPurchase: (purchaseData: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Purchase>;
  updatePurchase: (id: string, updates: Partial<Purchase>) => Promise<Purchase>;
  deletePurchase: (id: string) => Promise<void>;
  resetData: () => Promise<void>;
  clearData: () => Promise<void>;
  importData: (importedPurchases: Purchase[]) => Promise<number>;
  toast: { message: string; type?: 'success' | 'info' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_THEME = 'proofpocket_theme_v1';
const STORAGE_KEY_CURRENCY = 'proofpocket_currency_v1';
const STORAGE_KEY_PROFILE = 'proofpocket_profile_v1';
const STORAGE_KEY_NOTIF = 'proofpocket_notifs_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile: cloudUserProfile, updateUserProfileData } = useAuth();

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Purchases & Cloud sync states
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'local_only' | 'syncing' | 'error'>('local_only');
  const [dbError, setDbError] = useState<string | null>(null);

  // Active Screen
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');

  // Modals & Selection
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [warrantyFilter, setWarrantyFilter] = useState<WarrantyFilterOption>('all');

  // Currency
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    return (localStorage.getItem(STORAGE_KEY_CURRENCY) as CurrencyCode) || 'USD';
  });

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY_CURRENCY, code);
    if (user) {
      updateUserProfileData({ preferredCurrency: code }).catch(() => {});
    }
    showToast(`Currency set to ${code}`, 'info');
  };

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_USER;
  });

  // Keep local user profile in sync with Cloud Auth profile
  useEffect(() => {
    if (user && cloudUserProfile) {
      setUserProfile({
        name: cloudUserProfile.displayName || user.displayName || 'ProofPocket User',
        email: cloudUserProfile.email || user.email || '',
        avatarUrl: cloudUserProfile.photoURL || user.photoURL || '/src/assets/images/avatar_sarah_chen_1794233966180.jpg',
        joinedDate: cloudUserProfile.createdAt ? `Member since ${new Date(cloudUserProfile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : 'Member since 2026',
      });
      if (cloudUserProfile.preferredCurrency && cloudUserProfile.preferredCurrency !== currency) {
        setCurrencyState(cloudUserProfile.preferredCurrency as CurrencyCode);
      }
    }
  }, [user, cloudUserProfile]);

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    setUserProfile(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(updated));
      return updated;
    });

    if (user) {
      try {
        await updateUserProfileData({
          displayName: updates.name,
          email: updates.email,
        });
      } catch {
        // error logged in service
      }
    }
    showToast('Profile updated', 'success');
  };

  // Notifications
  const [notifications, setNotifications] = useState<AppNotificationSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTIF);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      warrantyThirtyDays: true,
      warrantySevenDays: true,
      warrantyOneDay: true,
      returnWindowReminder: true,
      weeklyDigest: false,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_NOTIF, JSON.stringify(notifications));
  }, [notifications]);

  // Toast
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  // Synchronize purchases data:
  // If user is authenticated -> Attach real-time Cloud Firestore onSnapshot
  // If user is guest / offline -> Load from IndexedDB
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    if (user) {
      setCloudSyncStatus('syncing');
      setIsLoading(true);

      unsubscribeFirestore = subscribeToUserPurchases(
        user.uid,
        (cloudPurchases) => {
          setPurchases(cloudPurchases);
          setIsLoading(false);
          setCloudSyncStatus('synced');
          setDbError(null);
        },
        (err) => {
          console.error('[ProofPocket] Cloud sync error:', err);
          setCloudSyncStatus('error');
          setDbError(err?.message || 'Cloud Firestore sync failed');
          setIsLoading(false);
        }
      );
    } else {
      // Guest / Local IndexedDB Mode
      setCloudSyncStatus('local_only');
      setIsLoading(true);
      getAllPurchases()
        .then((items) => {
          setPurchases(items);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('[ProofPocket] Local DB load failed:', err);
          setDbError(err?.message || 'Local DB error');
          setIsLoading(false);
        });
    }

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [user]);

  // Create Purchase action
  const addPurchase = async (purchaseData: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>): Promise<Purchase> => {
    const nowISO = new Date().toISOString();
    const newPurchase: Purchase = {
      ...purchaseData,
      id: `prch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    try {
      if (user) {
        // Save to Cloud Firestore
        await createCloudPurchase(user.uid, newPurchase);
        showToast(`Saved "${newPurchase.productName}" to Cloud Vault`, 'success');
      } else {
        // Save to IndexedDB
        await addPurchaseRecord(newPurchase);
        setPurchases(prev => [newPurchase, ...prev]);
        showToast(`Added "${newPurchase.productName}" to local vault`, 'success');
      }
      return newPurchase;
    } catch (err: any) {
      console.error('[ProofPocket] Failed to add purchase:', err);
      showToast(`Error saving purchase: ${err?.message || 'Storage error'}`, 'error');
      throw err;
    }
  };

  // Update Purchase action
  const updatePurchase = async (id: string, updates: Partial<Purchase>): Promise<Purchase> => {
    try {
      if (user) {
        await updateCloudPurchase(user.uid, id, updates);
        showToast('Cloud record updated successfully', 'success');
        const updated: Purchase = {
          ...purchases.find(p => p.id === id)!,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        if (selectedPurchase && selectedPurchase.id === id) {
          setSelectedPurchase(updated);
        }
        return updated;
      } else {
        const updated = await updatePurchaseRecord(id, updates);
        setPurchases(prev => prev.map(p => (p.id === id ? updated : p)));
        if (selectedPurchase && selectedPurchase.id === id) {
          setSelectedPurchase(updated);
        }
        showToast('Purchase updated successfully', 'success');
        return updated;
      }
    } catch (err: any) {
      console.error('[ProofPocket] Failed to update purchase:', err);
      showToast(`Error updating purchase: ${err?.message || 'Storage error'}`, 'error');
      throw err;
    }
  };

  // Delete Purchase action
  const deletePurchase = async (id: string): Promise<void> => {
    const target = purchases.find(p => p.id === id);
    try {
      if (user) {
        await deleteCloudPurchase(user.uid, id);
        if (selectedPurchase && selectedPurchase.id === id) {
          setSelectedPurchase(null);
        }
        showToast(`Deleted "${target?.productName || 'Purchase'}" from Cloud`, 'info');
      } else {
        await deletePurchaseRecord(id);
        setPurchases(prev => prev.filter(p => p.id !== id));
        if (selectedPurchase && selectedPurchase.id === id) {
          setSelectedPurchase(null);
        }
        showToast(`Deleted "${target?.productName || 'Purchase'}"`, 'info');
      }
    } catch (err: any) {
      console.error('[ProofPocket] Failed to delete purchase:', err);
      showToast('Error deleting purchase', 'error');
      throw err;
    }
  };

  const resetData = async (): Promise<void> => {
    try {
      const items = await seedInitialPurchases(true);
      if (!user) {
        setPurchases(items);
      }
      setSelectedPurchase(null);
      showToast('Reset sample purchases', 'info');
    } catch (err) {
      console.error('[ProofPocket] Failed to reset data:', err);
      showToast('Error resetting database', 'error');
    }
  };

  const clearData = async (): Promise<void> => {
    try {
      if (!user) {
        await clearAllPurchasesFromDB();
        setPurchases([]);
      }
      setSelectedPurchase(null);
      showToast('Vault cleared', 'info');
    } catch (err) {
      console.error('[ProofPocket] Failed to clear data:', err);
      showToast('Error clearing database', 'error');
    }
  };

  const importData = async (importedPurchases: Purchase[]): Promise<number> => {
    try {
      let count = 0;
      if (user) {
        for (const item of importedPurchases) {
          await createCloudPurchase(user.uid, item);
          count++;
        }
      } else {
        count = await bulkImportPurchases(importedPurchases);
        const all = await getAllPurchases();
        setPurchases(all);
      }
      showToast(`Imported ${count} purchase records`, 'success');
      return count;
    } catch (err) {
      console.error('[ProofPocket] Failed to import data:', err);
      showToast('Failed to import backup file', 'error');
      throw err;
    }
  };

  return (
    <AppContext.Provider
      value={{
        purchases,
        isLoading,
        cloudSyncStatus,
        dbError,
        activeScreen,
        setActiveScreen,
        selectedPurchase,
        setSelectedPurchase,
        isAddModalOpen,
        setIsAddModalOpen,
        editingPurchase,
        setEditingPurchase,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        warrantyFilter,
        setWarrantyFilter,
        theme,
        toggleTheme,
        currency,
        setCurrency,
        notifications,
        setNotifications,
        userProfile,
        updateUserProfile,
        addPurchase,
        updatePurchase,
        deletePurchase,
        resetData,
        clearData,
        importData,
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
