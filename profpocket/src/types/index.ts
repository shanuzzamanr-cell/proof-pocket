export type Category = 
  | 'Electronics'
  | 'Audio'
  | 'Home Appliances'
  | 'Wearables'
  | 'Furniture'
  | 'Tools & Gadgets'
  | 'Computers'
  | 'Other';

export type WarrantyUnit = 'months' | 'years';

export type WarrantyStatus = 'active' | 'expiring_soon' | 'expired' | 'no_warranty';

export type WarrantyUrgencyCategory = 
  | 'critical_7d'
  | 'urgent_30d'
  | 'upcoming_90d'
  | 'active'
  | 'expired'
  | 'no_warranty';

export interface Purchase {
  id: string;
  productName: string;
  brand: string;
  category: Category;
  price: number;
  currency: string;
  purchaseDate: string; // YYYY-MM-DD
  hasWarranty: boolean;
  warrantyDuration: number;
  warrantyUnit: WarrantyUnit;
  warrantyEndDate: string | null; // YYYY-MM-DD or null if no warranty
  returnDeadline?: string | null; // YYYY-MM-DD
  storeName: string;
  storeLocation?: string;
  orderNumber?: string;
  serialNumber?: string;
  notes?: string;
  productImage?: string;
  receiptImage?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export type ActiveScreen = 'dashboard' | 'purchases' | 'warranty' | 'analytics' | 'settings';

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  joinedDate: string;
}

export interface AppNotificationSettings {
  warrantySevenDays: boolean;
  warrantyThirtyDays: boolean;
  warrantyNinetyDays: boolean;
  returnWindowReminder: boolean;
  weeklyDigest: boolean;
  browserNotificationsEnabled: boolean;
}

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  rate: number;
}

export interface OCRScanResult {
  storeName?: string;
  purchaseDate?: string;
  totalAmount?: number;
  currency?: string;
  productName?: string;
  suggestedCategory?: Category;
  orderNumber?: string;
  rawText?: string;
  confidence?: 'high' | 'medium' | 'low';
  detectedItems?: Array<{ name: string; price: number }>;
}

export interface AppNotificationItem {
  id: string;
  type: 'warranty_7d' | 'warranty_30d' | 'return_deadline' | 'system';
  title: string;
  message: string;
  date: string;
  purchaseId?: string;
  read: boolean;
}
