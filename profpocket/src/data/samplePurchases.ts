import { Purchase, UserProfile, CurrencyConfig } from '../types';
import { getWarrantyStatus, calculateReturnStatus } from '../utils/dateUtils';

export const DEFAULT_USER: UserProfile = {
  name: 'Sarah Chen',
  email: 'sarah.chen@example.com',
  avatarUrl: '/src/assets/images/avatar_sarah_chen_1794233966180.jpg',
  joinedDate: 'Member since Oct 2024',
};

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', rate: 1 },
  EUR: { code: 'EUR', symbol: '€', rate: 0.92 },
  GBP: { code: 'GBP', symbol: '£', rate: 0.78 },
  CAD: { code: 'CAD', symbol: 'CA$', rate: 1.35 },
  AUD: { code: 'AUD', symbol: 'AU$', rate: 1.52 },
  JPY: { code: 'JPY', symbol: '¥', rate: 155 },
};

// Seed dataset for new local databases
export const INITIAL_PURCHASES: Purchase[] = [
  {
    id: 'prch-001',
    productName: 'WH-1000XM5 Wireless Headphones',
    brand: 'Sony',
    category: 'Audio',
    price: 399.99,
    currency: 'USD',
    purchaseDate: '2024-08-15',
    hasWarranty: true,
    warrantyDuration: 2,
    warrantyUnit: 'years',
    warrantyEndDate: '2026-08-15',
    returnDeadline: '2024-09-15',
    storeName: 'TechHaven Electronics',
    storeLocation: 'San Francisco, CA (Store #042)',
    orderNumber: 'TH-98715-SF',
    serialNumber: 'SN-S8492049182',
    notes: 'Premium active noise-canceling headphones. Extended 2-year manufacturer coverage included.',
    productImage: '/src/assets/images/product_sony_headphones_1794233963392.jpg',
    receiptImage: '/src/assets/images/sample_store_receipt_1794233964680.jpg',
    createdAt: '2024-08-15T11:40:00.000Z',
    updatedAt: '2024-08-15T11:40:00.000Z',
  },
  {
    id: 'prch-002',
    productName: 'Barista Touch Espresso Machine',
    brand: 'Breville',
    category: 'Home Appliances',
    price: 899.95,
    currency: 'USD',
    purchaseDate: '2024-01-10',
    hasWarranty: true,
    warrantyDuration: 2,
    warrantyUnit: 'years',
    warrantyEndDate: '2026-01-10',
    returnDeadline: '2024-02-10',
    storeName: 'Williams Sonoma',
    storeLocation: 'Union Square, SF',
    orderNumber: 'WS-88319-ON',
    serialNumber: 'BREV-BES880BSS-09',
    notes: 'Automated touchscreen coffee maker. Registered product on Breville official portal for warranty.',
    productImage: '/src/assets/images/product_espresso_machine_1794233964820.jpg',
    receiptImage: '/src/assets/images/sample_store_receipt_1794233964680.jpg',
    createdAt: '2024-01-10T14:15:00.000Z',
    updatedAt: '2024-01-10T14:15:00.000Z',
  },
  {
    id: 'prch-003',
    productName: 'Watch Ultra 2 Titanium 49mm',
    brand: 'Apple',
    category: 'Wearables',
    price: 799.00,
    currency: 'USD',
    purchaseDate: '2024-09-22',
    hasWarranty: true,
    warrantyDuration: 1,
    warrantyUnit: 'years',
    warrantyEndDate: '2025-09-22',
    returnDeadline: '2024-10-06',
    storeName: 'Apple Store Regent',
    storeLocation: 'Downtown',
    orderNumber: 'APPL-9021-998',
    serialNumber: 'H9G49219KL8',
    notes: 'Rugged titanium adventure GPS watch. Covered by standard 1-year limited warranty.',
    productImage: '/src/assets/images/product_smart_watch_1794233965610.jpg',
    receiptImage: '/src/assets/images/sample_store_receipt_1794233964680.jpg',
    createdAt: '2024-09-22T16:20:00.000Z',
    updatedAt: '2024-09-22T16:20:00.000Z',
  },
  {
    id: 'prch-004',
    productName: 'Aeron Ergonomic Chair (Size B)',
    brand: 'Herman Miller',
    category: 'Furniture',
    price: 1495.00,
    currency: 'USD',
    purchaseDate: '2023-04-12',
    hasWarranty: true,
    warrantyDuration: 12,
    warrantyUnit: 'years',
    warrantyEndDate: '2035-04-12',
    returnDeadline: '2023-05-12',
    storeName: 'Design Within Reach',
    storeLocation: 'Potrero Hill Studio',
    orderNumber: 'DWR-449102',
    serialNumber: 'HM-AER-B-8491',
    notes: 'Graphite frame with PostureFit SL lumbar support. Herman Miller 12-year comprehensive parts warranty.',
    receiptImage: '/src/assets/images/sample_store_receipt_1794233964680.jpg',
    createdAt: '2023-04-12T10:00:00.000Z',
    updatedAt: '2023-04-12T10:00:00.000Z',
  },
  {
    id: 'prch-005',
    productName: 'V15 Detect Absolute Cordless Vacuum',
    brand: 'Dyson',
    category: 'Home Appliances',
    price: 649.99,
    currency: 'USD',
    // Set to expire soon (calculated relative to today or anchor)
    purchaseDate: '2023-01-15',
    hasWarranty: true,
    warrantyDuration: 2,
    warrantyUnit: 'years',
    warrantyEndDate: (() => {
      // Set to 18 days from current day so it always lands in "Expiring Soon (< 30d)"
      const d = new Date();
      d.setDate(d.getDate() + 18);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    })(),
    returnDeadline: '2023-02-15',
    storeName: 'Target Electronics',
    storeLocation: 'San Jose, CA',
    orderNumber: 'TGT-772183',
    serialNumber: 'DY-V15-99281',
    notes: 'Laser slim fluffy cleaner head. Clean filters regularly. Contact support before expiration if battery degradation occurs.',
    receiptImage: '/src/assets/images/sample_store_receipt_1794233964680.jpg',
    createdAt: '2023-01-15T09:30:00.000Z',
    updatedAt: '2023-01-15T09:30:00.000Z',
  },
  {
    id: 'prch-006',
    productName: 'UltraFine 27" 4K IPS Monitor',
    brand: 'LG',
    category: 'Electronics',
    price: 499.00,
    currency: 'USD',
    purchaseDate: '2023-02-14',
    hasWarranty: true,
    warrantyDuration: 1,
    warrantyUnit: 'years',
    warrantyEndDate: '2024-02-14',
    returnDeadline: '2023-03-14',
    storeName: 'Micro Center',
    storeLocation: 'Santa Clara',
    orderNumber: 'MC-2849182',
    serialNumber: 'LG-27UN880-994',
    notes: 'Ergo arm included. USB-C 60W power delivery. Standard 1-year panel warranty expired.',
    receiptImage: '/src/assets/images/sample_store_receipt_1794233964680.jpg',
    createdAt: '2023-02-14T13:45:00.000Z',
    updatedAt: '2023-02-14T13:45:00.000Z',
  },
  {
    id: 'prch-007',
    productName: 'Cable Matters USB-C to HDMI Adapter',
    brand: 'Cable Matters',
    category: 'Electronics',
    price: 18.99,
    currency: 'USD',
    purchaseDate: '2024-05-10',
    hasWarranty: false,
    warrantyDuration: 0,
    warrantyUnit: 'months',
    warrantyEndDate: null,
    returnDeadline: '2024-06-10',
    storeName: 'Amazon',
    orderNumber: 'AMZ-112-9840192',
    notes: 'Basic display adapter purchased without extended warranty.',
    createdAt: '2024-05-10T12:00:00.000Z',
    updatedAt: '2024-05-10T12:00:00.000Z',
  },
];

// Re-export for backward compatibility
export const calculateWarrantyStatus = (warrantyEndDate: string | null | undefined, hasWarranty = true) => {
  return getWarrantyStatus(warrantyEndDate, hasWarranty);
};

export { calculateReturnStatus };

export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  const config = CURRENCIES[currencyCode] || CURRENCIES.USD;
  return `${config.symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
