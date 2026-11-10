import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Category, WarrantyUnit } from '../../types';
import { calculateWarrantyEndDate } from '../../utils/dateUtils';
import { validateReceiptFile, readFileAsDataUrl, optimizeReceiptImage } from '../../utils/receiptUtils';
import { 
  X, 
  Upload, 
  Calendar, 
  Store, 
  FileText, 
  ShieldCheck, 
  ShieldAlert, 
  Check, 
  AlertCircle,
  RefreshCw,
  Trash2,
  AlertTriangle
} from 'lucide-react';

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

export const AddPurchaseModal: React.FC = () => {
  const { 
    isAddModalOpen, 
    setIsAddModalOpen, 
    editingPurchase, 
    setEditingPurchase, 
    addPurchase, 
    updatePurchase,
    currency 
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<Category>('Electronics');
  const [price, setPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [hasWarranty, setHasWarranty] = useState(true);
  const [warrantyDuration, setWarrantyDuration] = useState('2');
  const [warrantyUnit, setWarrantyUnit] = useState<WarrantyUnit>('years');
  const [returnDeadline, setReturnDeadline] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeLocation, setStoreLocation] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [productImage, setProductImage] = useState<string>('');

  // Validation & Error states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [receiptUploadError, setReceiptUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Sync state when editing or opening
  useEffect(() => {
    if (editingPurchase) {
      setProductName(editingPurchase.productName || '');
      setBrand(editingPurchase.brand || '');
      setCategory(editingPurchase.category || 'Electronics');
      setPrice(editingPurchase.price ? editingPurchase.price.toString() : '');
      setPurchaseDate(editingPurchase.purchaseDate || new Date().toISOString().split('T')[0]);
      setHasWarranty(editingPurchase.hasWarranty !== false && (editingPurchase.warrantyDuration || 0) > 0);
      setWarrantyDuration((editingPurchase.warrantyDuration || 1).toString());
      setWarrantyUnit(editingPurchase.warrantyUnit || 'years');
      setReturnDeadline(editingPurchase.returnDeadline || '');
      setStoreName(editingPurchase.storeName || '');
      setStoreLocation(editingPurchase.storeLocation || '');
      setOrderNumber(editingPurchase.orderNumber || '');
      setSerialNumber(editingPurchase.serialNumber || '');
      setNotes(editingPurchase.notes || '');
      setReceiptImage(editingPurchase.receiptImage || '');
      setReceiptFileName(editingPurchase.receiptImage ? 'Attached Receipt' : '');
      setProductImage(editingPurchase.productImage || '');
      setIsDirty(false);
    } else {
      resetForm();
    }
  }, [editingPurchase, isAddModalOpen]);

  const resetForm = () => {
    setProductName('');
    setBrand('');
    setCategory('Electronics');
    setPrice('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setHasWarranty(true);
    setWarrantyDuration('2');
    setWarrantyUnit('years');
    setReturnDeadline('');
    setStoreName('');
    setStoreLocation('');
    setOrderNumber('');
    setSerialNumber('');
    setNotes('');
    setReceiptImage('');
    setReceiptFileName('');
    setProductImage('');
    setErrors({});
    setReceiptUploadError(null);
    setIsDirty(false);
    setShowDiscardConfirm(false);
  };

  const handleFieldChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setIsDirty(true);
  };

  // Safe Close with Unsaved Changes Protection
  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      forceClose();
    }
  };

  const forceClose = () => {
    setIsAddModalOpen(false);
    setEditingPurchase(null);
    resetForm();
  };

  // Quick preset return deadline
  const setReturnPreset = (days: number) => {
    if (!purchaseDate) return;
    const base = new Date(purchaseDate);
    if (isNaN(base.getTime())) return;
    base.setDate(base.getDate() + days);
    handleFieldChange(setReturnDeadline, base.toISOString().split('T')[0]);
  };

  // Receipt File Change with strict validation
  const handleReceiptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setReceiptUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format & size
    const validation = validateReceiptFile(file);
    if (!validation.valid) {
      setReceiptUploadError(validation.error || 'Invalid image file.');
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const dataUrl = await optimizeReceiptImage(file);
      setReceiptImage(dataUrl);
      setReceiptFileName(file.name);
      setIsDirty(true);
    } catch (err: any) {
      setReceiptUploadError(err?.message || 'Failed to read receipt file.');
    }
  };

  // Quick pick sample receipt
  const useSampleReceipt = () => {
    setReceiptUploadError(null);
    setReceiptImage('/src/assets/images/sample_store_receipt_1794233964680.jpg');
    setReceiptFileName('sample_store_receipt.jpg');
    setIsDirty(true);
  };

  const removeReceipt = () => {
    setReceiptImage('');
    setReceiptFileName('');
    setReceiptUploadError(null);
    setIsDirty(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Calculate live preview of warranty expiration date
  const calculatedExpiryDate = hasWarranty && purchaseDate && warrantyDuration
    ? calculateWarrantyEndDate(purchaseDate, parseInt(warrantyDuration, 10) || 0, warrantyUnit)
    : null;

  // Form submission with validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!productName.trim()) {
      newErrors.productName = 'Product name is required';
    }
    if (!brand.trim()) {
      newErrors.brand = 'Brand name is required';
    }
    
    const parsedPrice = parseFloat(price);
    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
      newErrors.price = 'Please enter a valid price greater than 0';
    }

    if (!storeName.trim()) {
      newErrors.storeName = 'Store name is required';
    }

    if (!purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required';
    }

    const durationNum = parseInt(warrantyDuration, 10);
    if (hasWarranty && (isNaN(durationNum) || durationNum <= 0)) {
      newErrors.warrantyDuration = 'Warranty duration must be at least 1';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const finalDuration = hasWarranty ? durationNum : 0;
      const finalExpiry = hasWarranty
        ? calculateWarrantyEndDate(purchaseDate, finalDuration, warrantyUnit)
        : null;

      const payload = {
        productName: productName.trim(),
        brand: brand.trim(),
        category,
        price: parsedPrice,
        currency,
        purchaseDate,
        hasWarranty,
        warrantyDuration: finalDuration,
        warrantyUnit,
        warrantyEndDate: finalExpiry,
        returnDeadline: returnDeadline || null,
        storeName: storeName.trim(),
        storeLocation: storeLocation.trim() || undefined,
        orderNumber: orderNumber.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        receiptImage: receiptImage || undefined,
        productImage: productImage || undefined,
      };

      if (editingPurchase) {
        await updatePurchase(editingPurchase.id, payload);
      } else {
        await addPurchase(payload);
      }

      forceClose();
    } catch (err: any) {
      setErrors({ form: err?.message || 'Failed to save purchase. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAddModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in">
      <div 
        className="w-full sm:max-w-xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Unsaved Changes Confirmation Dialog */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Discard Unsaved Changes?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              You have unsaved changes in this form. If you discard now, your input will be lost.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={forceClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingPurchase ? 'Edit Purchase Record' : 'Add New Purchase'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Store digital receipts, track warranty terms, and manage return deadlines.
            </p>
          </div>
          <button
            onClick={handleAttemptClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Error Banner */}
        {errors.form && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Product & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => handleFieldChange(setProductName, e.target.value)}
                placeholder="e.g. WH-1000XM5 Headphones"
                className={`w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border ${
                  errors.productName ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                } text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500`}
              />
              {errors.productName && <p className="text-[11px] text-rose-500 mt-1">{errors.productName}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Brand Name *
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => handleFieldChange(setBrand, e.target.value)}
                placeholder="e.g. Sony, Apple, Breville"
                className={`w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border ${
                  errors.brand ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                } text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500`}
              />
              {errors.brand && <p className="text-[11px] text-rose-500 mt-1">{errors.brand}</p>}
            </div>
          </div>

          {/* Category & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => handleFieldChange(setCategory, e.target.value as Category)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Price ({currency}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => handleFieldChange(setPrice, e.target.value)}
                  placeholder="399.99"
                  className={`w-full pl-7 pr-3 py-2 text-xs font-mono tabular-nums rounded-xl bg-slate-50 dark:bg-slate-800 border ${
                    errors.price ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                  } text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                />
              </div>
              {errors.price && <p className="text-[11px] text-rose-500 mt-1">{errors.price}</p>}
            </div>
          </div>

          {/* Store Name & Purchase Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Store Name *
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => handleFieldChange(setStoreName, e.target.value)}
                placeholder="e.g. Best Buy, Amazon, Apple Store"
                className={`w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border ${
                  errors.storeName ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                } text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500`}
              />
              {errors.storeName && <p className="text-[11px] text-rose-500 mt-1">{errors.storeName}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => handleFieldChange(setPurchaseDate, e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border ${
                  errors.purchaseDate ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                } text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500`}
              />
              {errors.purchaseDate && <p className="text-[11px] text-rose-500 mt-1">{errors.purchaseDate}</p>}
            </div>
          </div>

          {/* Warranty Configuration Section */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Warranty Coverage
                </span>
              </div>

              {/* Has Warranty Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>{hasWarranty ? 'Protected' : 'No Warranty'}</span>
                <input
                  type="checkbox"
                  checked={hasWarranty}
                  onChange={(e) => handleFieldChange(setHasWarranty, e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
              </label>
            </div>

            {hasWarranty ? (
              <>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Duration Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={warrantyDuration}
                      onChange={(e) => handleFieldChange(setWarrantyDuration, e.target.value)}
                      className={`w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border ${
                        errors.warrantyDuration ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                      } text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                    />
                    {errors.warrantyDuration && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.warrantyDuration}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Unit
                    </label>
                    <div className="flex bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleFieldChange<WarrantyUnit>(setWarrantyUnit, 'months')}
                        className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${
                          warrantyUnit === 'months'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Months
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFieldChange<WarrantyUnit>(setWarrantyUnit, 'years')}
                        className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${
                          warrantyUnit === 'years'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Years
                      </button>
                    </div>
                  </div>
                </div>

                {calculatedExpiryDate && (
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/50 dark:border-emerald-800/50 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Calculated Expiry Date:</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {calculatedExpiryDate}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                This item is marked as having no manufacturer or extended warranty.
              </p>
            )}
          </div>

          {/* Return Deadline Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Return Deadline (Optional)
              </label>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span>Presets:</span>
                <button
                  type="button"
                  onClick={() => setReturnPreset(14)}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                >
                  14d
                </button>
                <button
                  type="button"
                  onClick={() => setReturnPreset(30)}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                >
                  30d
                </button>
                <button
                  type="button"
                  onClick={() => setReturnPreset(60)}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                >
                  60d
                </button>
              </div>
            </div>
            <input
              type="date"
              value={returnDeadline}
              onChange={(e) => handleFieldChange(setReturnDeadline, e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Receipt Management Section (Upload, Preview, Replace, Remove) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Receipt Document / Photo
              </label>
              {!receiptImage && (
                <button
                  type="button"
                  onClick={useSampleReceipt}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  Use sample receipt
                </button>
              )}
            </div>

            {/* Error Message for upload */}
            {receiptUploadError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{receiptUploadError}</span>
              </div>
            )}

            {receiptImage ? (
              /* Receipt Attached / Preview Card with Replace and Remove actions */
              <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={receiptImage}
                    alt="Receipt thumbnail"
                    className="w-14 h-16 object-cover rounded-xl border border-slate-200 dark:border-slate-600 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {receiptFileName || 'Receipt Image Attached'}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Check className="w-3.5 h-3.5" /> Ready for IndexedDB vault
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Replace Button */}
                  <label
                    className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Replace receipt image"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={handleReceiptFile}
                      className="hidden"
                    />
                  </label>
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={removeReceipt}
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Remove receipt image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Upload Area */
              <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer transition-colors group">
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 transition-colors mb-1.5" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Click or drag receipt photo to upload
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Supported formats: JPG, JPEG, PNG, WEBP (Max 10MB)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleReceiptFile}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Additional details (Serial, Order Number, Store Location, Notes) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Serial Number (Optional)
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => handleFieldChange(setSerialNumber, e.target.value)}
                  placeholder="e.g. SN-8492049"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Order / Invoice # (Optional)
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => handleFieldChange(setOrderNumber, e.target.value)}
                  placeholder="e.g. INV-98715"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Store Location / Branch (Optional)
              </label>
              <input
                type="text"
                value={storeLocation}
                onChange={(e) => handleFieldChange(setStoreLocation, e.target.value)}
                placeholder="e.g. Downtown Mall Store #042 or Online Order"
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Additional Notes & Coverage Terms
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => handleFieldChange(setNotes, e.target.value)}
                placeholder="Details on accessories, store warranty policy, contact numbers..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleAttemptClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingPurchase ? 'Save Changes' : 'Add to Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
