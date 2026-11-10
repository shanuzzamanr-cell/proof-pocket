import { Purchase, Category, WarrantyUnit } from '../types';

/**
 * Escapes a single CSV value according to RFC 4180:
 * Encloses values containing quotes, commas, or newlines in double quotes,
 * and escapes double quotes by doubling them ("").
 */
export function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a list of purchases into a standardized CSV string
 */
export function exportPurchasesToCSV(purchases: Purchase[]): string {
  const headers = [
    'ID',
    'Product Name',
    'Brand',
    'Category',
    'Price',
    'Currency',
    'Purchase Date',
    'Has Warranty',
    'Warranty Duration',
    'Warranty Unit',
    'Warranty End Date',
    'Return Deadline',
    'Store Name',
    'Store Location',
    'Order Number',
    'Serial Number',
    'Notes',
    'Created At',
  ];

  const rows = purchases.map((p) => [
    escapeCSV(p.id),
    escapeCSV(p.productName),
    escapeCSV(p.brand),
    escapeCSV(p.category),
    escapeCSV(p.price),
    escapeCSV(p.currency),
    escapeCSV(p.purchaseDate),
    escapeCSV(p.hasWarranty ? 'true' : 'false'),
    escapeCSV(p.warrantyDuration),
    escapeCSV(p.warrantyUnit),
    escapeCSV(p.warrantyEndDate || ''),
    escapeCSV(p.returnDeadline || ''),
    escapeCSV(p.storeName),
    escapeCSV(p.storeLocation || ''),
    escapeCSV(p.orderNumber || ''),
    escapeCSV(p.serialNumber || ''),
    escapeCSV(p.notes || ''),
    escapeCSV(p.createdAt),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
}

/**
 * Robust CSV parser that handles quotes, commas, and multiline values
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows.filter((r) => r.length > 0 && r.some((cell) => cell.length > 0));
}

/**
 * Maps parsed CSV rows to Purchase objects
 */
export function mapCSVToPurchases(csvText: string, defaultCurrency: string = 'USD'): {
  validPurchases: Partial<Purchase>[];
  errors: string[];
} {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return { validPurchases: [], errors: ['CSV file has no data rows'] };
  }

  const headerRow = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const dataRows = rows.slice(1);

  // Map header indexes
  const getIndex = (keys: string[]) => {
    for (const key of keys) {
      const idx = headerRow.findIndex((h) => h.includes(key));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idIdx = getIndex(['id']);
  const nameIdx = getIndex(['productname', 'product', 'name', 'item']);
  const brandIdx = getIndex(['brand', 'manufacturer']);
  const categoryIdx = getIndex(['category']);
  const priceIdx = getIndex(['price', 'amount', 'cost', 'total']);
  const currencyIdx = getIndex(['currency']);
  const dateIdx = getIndex(['purchasedate', 'date', 'purchase']);
  const hasWarrantyIdx = getIndex(['haswarranty', 'warranty']);
  const durationIdx = getIndex(['warrantyduration', 'duration']);
  const unitIdx = getIndex(['warrantyunit', 'unit']);
  const endDateIdx = getIndex(['warrantyenddate', 'enddate', 'expiry']);
  const returnDeadlineIdx = getIndex(['returndeadline', 'return']);
  const storeIdx = getIndex(['storename', 'store', 'retailer', 'vendor']);
  const serialIdx = getIndex(['serialnumber', 'serial']);
  const orderIdx = getIndex(['ordernumber', 'order', 'invoice']);
  const notesIdx = getIndex(['notes', 'note', 'description']);

  const validPurchases: Partial<Purchase>[] = [];
  const errors: string[] = [];

  dataRows.forEach((row, rowIndex) => {
    const rowNum = rowIndex + 2;
    const productName = nameIdx !== -1 ? row[nameIdx] : '';
    const brand = brandIdx !== -1 ? row[brandIdx] : '';
    const priceStr = priceIdx !== -1 ? row[priceIdx].replace(/[^0-9.]/g, '') : '';
    const price = parseFloat(priceStr);
    const storeName = storeIdx !== -1 ? row[storeIdx] : '';
    const purchaseDate = dateIdx !== -1 ? row[dateIdx] : '';

    if (!productName) {
      errors.push(`Row ${rowNum}: Missing product name`);
      return;
    }
    if (isNaN(price) || price < 0) {
      errors.push(`Row ${rowNum}: Invalid price (${row[priceIdx] || 'empty'})`);
      return;
    }

    const category: Category = (categoryIdx !== -1 && row[categoryIdx]) ? (row[categoryIdx] as Category) : 'Other';
    const currency = (currencyIdx !== -1 && row[currencyIdx]) ? row[currencyIdx] : defaultCurrency;
    const hasWarranty = hasWarrantyIdx !== -1 ? row[hasWarrantyIdx].toLowerCase() === 'true' || row[hasWarrantyIdx] === '1' : true;
    const duration = durationIdx !== -1 ? parseInt(row[durationIdx], 10) || 1 : 1;
    const unit: WarrantyUnit = unitIdx !== -1 && row[unitIdx]?.toLowerCase().includes('month') ? 'months' : 'years';

    validPurchases.push({
      id: idIdx !== -1 && row[idIdx] ? row[idIdx] : `prch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productName: productName.trim(),
      brand: brand ? brand.trim() : 'Unknown Brand',
      category,
      price,
      currency,
      purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
      hasWarranty,
      warrantyDuration: hasWarranty ? duration : 0,
      warrantyUnit: unit,
      warrantyEndDate: endDateIdx !== -1 ? row[endDateIdx] || null : null,
      returnDeadline: returnDeadlineIdx !== -1 ? row[returnDeadlineIdx] || null : null,
      storeName: storeName ? storeName.trim() : 'Store',
      serialNumber: serialIdx !== -1 ? row[serialIdx] : undefined,
      orderNumber: orderIdx !== -1 ? row[orderIdx] : undefined,
      notes: notesIdx !== -1 ? row[notesIdx] : undefined,
    });
  });

  return { validPurchases, errors };
}
