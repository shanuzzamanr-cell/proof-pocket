import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Category, OCRScanResult, WarrantyUnit } from '../../types';
import { validateReceiptFile, readFileAsDataUrl, optimizeReceiptImage } from '../../utils/receiptUtils';
import { calculateWarrantyEndDate } from '../../utils/dateUtils';
import { 
  X, 
  Upload, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Store, 
  Calendar, 
  Coins, 
  FileText, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sliders,
  List
} from 'lucide-react';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddModalWithData?: (data: any) => void;
}

const CATEGORIES: Category[] = [
  'Electronics',
  'Audio',
  'Home Appliances',
  'Wearables',
  'Furniture',
  'Tools & Gadgets',
  'Computers',
  'Other',
];

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onOpenAddModalWithData,
}) => {
  const { addPurchase, currency, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload & Scan state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [fileName, setFileName] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<OCRScanResult | null>(null);

  // Editable Review Fields
  const [storeName, setStoreName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState(currency);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<Category>('Electronics');
  const [orderNumber, setOrderNumber] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [showRawText, setShowRawText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setScanError(null);
    const validation = validateReceiptFile(file);
    if (!validation.valid) {
      setScanError(validation.error || 'Invalid receipt image file.');
      return;
    }

    try {
      const dataUrl = await optimizeReceiptImage(file);
      setImagePreview(dataUrl);
      setImageMime('image/jpeg');
      setFileName(file.name);
      setScanResult(null);
      // Auto-trigger scan for smooth UX
      scanReceipt(dataUrl, 'image/jpeg');
    } catch (err: any) {
      setScanError(err?.message || 'Failed to read image.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const loadSampleReceipt = () => {
    const sampleUrl = '/src/assets/images/sample_store_receipt_1794233964680.jpg';
    setImagePreview(sampleUrl);
    setImageMime('image/jpeg');
    setFileName('sample_store_receipt.jpg');
    setScanResult(null);
    setScanError(null);
    scanReceipt(sampleUrl, 'image/jpeg');
  };

  const scanReceipt = async (base64Url: string, mime: string) => {
    setIsScanning(true);
    setScanError(null);

    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Url,
          mimeType: mime,
        }),
      });

      const resJson = await response.json();

      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'Failed to extract text from receipt.');
      }

      const data: OCRScanResult = resJson.data;
      setScanResult(data);

      // Populate editable fields with extracted data
      setStoreName(data.storeName || '');
      setPurchaseDate(data.purchaseDate || new Date().toISOString().split('T')[0]);
      setTotalAmount(data.totalAmount ? data.totalAmount.toString() : '');
      setCurrencySymbol((data.currency as any) || currency);
      setProductName(data.productName || (data.detectedItems?.[0]?.name ?? ''));
      if (data.suggestedCategory && CATEGORIES.includes(data.suggestedCategory)) {
        setCategory(data.suggestedCategory);
      }
      setOrderNumber(data.orderNumber || '');
      showToast('Receipt details extracted successfully! Please verify below.', 'success');
    } catch (err: any) {
      console.error('[Receipt Scanner Error]:', err);
      setScanError(err?.message || 'Could not analyze receipt. You can still enter details manually.');
    } finally {
      setIsScanning(false);
    }
  };

  const selectDetectedItem = (item: { name: string; price: number }) => {
    setProductName(item.name);
    if (item.price && !totalAmount) {
      setTotalAmount(item.price.toString());
    }
  };

  const handleSaveToVault = async () => {
    if (!productName.trim()) {
      setScanError('Please specify a product name before saving.');
      return;
    }
    const priceNum = parseFloat(totalAmount);
    if (isNaN(priceNum) || priceNum <= 0) {
      setScanError('Please enter a valid price amount.');
      return;
    }
    if (!storeName.trim()) {
      setScanError('Please enter the store name.');
      return;
    }

    setIsSaving(true);
    try {
      const duration = parseInt(warrantyMonths, 10) || 12;
      const validDate = purchaseDate || new Date().toISOString().split('T')[0];
      const endDate = calculateWarrantyEndDate(validDate, duration, 'months');

      await addPurchase({
        productName: productName.trim(),
        brand: storeName.trim(), // Default brand or retailer
        category,
        price: priceNum,
        currency: currencySymbol || currency,
        purchaseDate: validDate,
        hasWarranty: duration > 0,
        warrantyDuration: duration,
        warrantyUnit: 'months',
        warrantyEndDate: endDate,
        storeName: storeName.trim(),
        orderNumber: orderNumber.trim() || undefined,
        receiptImage: imagePreview || undefined,
        notes: scanResult?.rawText ? `Extracted via OCR from ${fileName || 'receipt'}` : undefined,
      });

      showToast(`Added "${productName.trim()}" to your vault`, 'success');
      handleClose();
    } catch (err: any) {
      setScanError(err?.message || 'Failed to save purchase.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenInFullForm = () => {
    if (onOpenAddModalWithData) {
      const duration = parseInt(warrantyMonths, 10) || 12;
      const validDate = purchaseDate || new Date().toISOString().split('T')[0];
      onOpenAddModalWithData({
        productName: productName.trim(),
        brand: storeName.trim(),
        category,
        price: totalAmount,
        currency: currencySymbol || currency,
        purchaseDate: validDate,
        hasWarranty: duration > 0,
        warrantyDuration: duration.toString(),
        warrantyUnit: 'months' as WarrantyUnit,
        storeName: storeName.trim(),
        orderNumber: orderNumber.trim(),
        receiptImage: imagePreview,
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setImagePreview(null);
    setScanResult(null);
    setScanError(null);
    setIsScanning(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Smart Receipt Scanner
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI-powered OCR extracts store, date, price, and item names
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Step 1: Upload or Preview Area */}
          {!imagePreview ? (
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/60 dark:bg-slate-800/40 cursor-pointer transition-colors group">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 transition-colors mb-2" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Select or drag receipt photo to scan
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Supports JPG, PNG, WEBP receipts & invoices (up to 20MB)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </label>

              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Don't have a receipt on hand?</span>
                <button
                  type="button"
                  onClick={loadSampleReceipt}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Try with Sample Store Receipt &rarr;
                </button>
              </div>
            </div>
          ) : (
            /* Uploaded Preview & Scan Action */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <img
                  src={imagePreview}
                  alt="Receipt Preview"
                  className="w-24 h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-600 shrink-0 shadow-xs"
                />
                <div className="min-w-0 flex-1 space-y-1 text-center sm:text-left">
                  <p className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
                    {fileName || 'Receipt Photo Attached'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    High-resolution receipt image ready for OCR
                  </p>
                  {scanResult && (
                    <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> OCR Complete
                      </span>
                      {scanResult.confidence && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Confidence: {scanResult.confidence}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col gap-2 shrink-0">
                  <label className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors cursor-pointer text-center">
                    Replace
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => scanReceipt(imagePreview, imageMime)}
                    disabled={isScanning}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>Rescan</span>
                  </button>
                </div>
              </div>

              {/* Scanning Active Animation */}
              {isScanning && (
                <div className="p-6 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                  <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Scanning receipt with Gemini 3.8 Flash...
                  </p>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                    Identifying store name, purchase timestamp, line items, and prices
                  </p>
                </div>
              )}

              {/* Error Message */}
              {scanError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{scanError}</p>
                    <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                      You can manually fill or correct the form fields below to proceed.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Extracted Data Review & Confirmation Form */}
              {(scanResult || !isScanning) && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                      Review Extracted Data
                    </span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      * Verify all fields before saving
                    </span>
                  </div>

                  {/* Detected Items Selector (if OCR detected multiple line items) */}
                  {scanResult?.detectedItems && scanResult.detectedItems.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <List className="w-3.5 h-3.5 text-emerald-600" />
                          Detected Line Items (Click to assign product):
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {scanResult.detectedItems.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectDetectedItem(item)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                              productName === item.name
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500'
                            }`}
                          >
                            <span>{item.name}</span>
                            {item.price > 0 && <span className="ml-1 opacity-80 font-mono">${item.price}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Primary Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Product Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="e.g. Sony Headphones"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Store Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Store / Retailer *
                      </label>
                      <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="e.g. Best Buy"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Total Amount & Currency */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Total Amount Paid *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={totalAmount}
                          onChange={(e) => setTotalAmount(e.target.value)}
                          placeholder="299.99"
                          className="w-full pl-7 pr-3 py-2 text-xs font-mono tabular-nums rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Purchase Date */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Purchase Date *
                      </label>
                      <input
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Suggested Category */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as Category)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Default Warranty Duration */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Warranty Protection
                      </label>
                      <select
                        value={warrantyMonths}
                        onChange={(e) => setWarrantyMonths(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="12">1 Year (12 months - Standard)</option>
                        <option value="24">2 Years (24 months)</option>
                        <option value="36">3 Years (36 months)</option>
                        <option value="6">6 Months</option>
                        <option value="0">No Warranty</option>
                      </select>
                    </div>
                  </div>

                  {/* Order Number & Accordion for Raw Text */}
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Invoice / Order Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="e.g. REC-98214"
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {scanResult?.rawText && (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowRawText(!showRawText)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/40 text-left text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between cursor-pointer"
                        >
                          <span>View Full OCR Raw Text</span>
                          {showRawText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        {showRawText && (
                          <div className="p-3 bg-white dark:bg-slate-900 text-[11px] font-mono text-slate-600 dark:text-slate-400 max-h-36 overflow-y-auto whitespace-pre-wrap border-t border-slate-200 dark:border-slate-800">
                            {scanResult.rawText}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {imagePreview && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {onOpenAddModalWithData && (
                <button
                  type="button"
                  onClick={handleOpenInFullForm}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Edit in Full Form
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveToVault}
                disabled={isSaving || isScanning || !productName.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Confirm & Save to Vault'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
