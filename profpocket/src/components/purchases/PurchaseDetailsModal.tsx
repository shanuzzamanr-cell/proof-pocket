import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateReturnStatus, formatCurrency } from '../../data/samplePurchases';
import { getWarrantyStatus } from '../../utils/dateUtils';
import { 
  X, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  ShieldOff,
  Store, 
  FileText, 
  Download, 
  RotateCcw,
  Maximize2,
  Clock,
  Printer,
  ShieldAlert
} from 'lucide-react';
import { ReportExportModal } from '../export/ReportExportModal';

export const PurchaseDetailsModal: React.FC = () => {
  const { 
    selectedPurchase, 
    setSelectedPurchase, 
    setIsAddModalOpen, 
    setEditingPurchase, 
    deletePurchase,
    currency,
    showToast 
  } = useApp();

  const [showReceiptZoom, setShowReceiptZoom] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  if (!selectedPurchase) return null;

  const warranty = getWarrantyStatus(selectedPurchase.warrantyEndDate, selectedPurchase.hasWarranty);
  const returnInfo = calculateReturnStatus(selectedPurchase.returnDeadline);

  // Calculate warranty progress percentage if active or expired
  let progressPercent = 0;
  if (selectedPurchase.hasWarranty && selectedPurchase.warrantyEndDate) {
    const startDate = new Date(selectedPurchase.purchaseDate).getTime();
    const endDate = new Date(selectedPurchase.warrantyEndDate).getTime();
    const now = new Date().getTime();
    const totalDuration = Math.max(1, endDate - startDate);
    const elapsed = Math.max(0, now - startDate);
    progressPercent = Math.min(100, Math.round((elapsed / totalDuration) * 100));
  }

  const handleEdit = () => {
    setEditingPurchase(selectedPurchase);
    setSelectedPurchase(null);
    setIsAddModalOpen(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePurchase(selectedPurchase.id);
      setShowDeleteConfirm(false);
    } catch {
      // error handled in context
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadProof = () => {
    const summary = `PROOFPOCKET PURCHASE RECORD
----------------------------------------
Product: ${selectedPurchase.productName}
Brand: ${selectedPurchase.brand}
Category: ${selectedPurchase.category}
Price: ${formatCurrency(selectedPurchase.price, currency)}
Purchased On: ${selectedPurchase.purchaseDate}
Store: ${selectedPurchase.storeName} ${selectedPurchase.storeLocation ? `(${selectedPurchase.storeLocation})` : ''}
Order #: ${selectedPurchase.orderNumber || 'N/A'}
Serial #: ${selectedPurchase.serialNumber || 'N/A'}
Warranty: ${selectedPurchase.hasWarranty ? `${selectedPurchase.warrantyDuration} ${selectedPurchase.warrantyUnit} (Expires: ${selectedPurchase.warrantyEndDate})` : 'No Warranty'}
Return Deadline: ${selectedPurchase.returnDeadline || 'None specified'}
Notes: ${selectedPurchase.notes || 'None'}
Created Timestamp: ${selectedPurchase.createdAt}
Last Updated: ${selectedPurchase.updatedAt || selectedPurchase.createdAt}
----------------------------------------
Generated via ProofPocket on ${new Date().toLocaleDateString()}`;

    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPurchase.brand.toLowerCase()}-${selectedPurchase.productName.toLowerCase().replace(/\s+/g, '-')}-proof.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Purchase record exported', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in transition-opacity">
      <div 
        className="w-full sm:max-w-2xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header Bar */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {selectedPurchase.category}
            </span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {selectedPurchase.brand}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Print certified proof sheet"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleEdit}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Edit purchase"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Delete purchase"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedPurchase(null)}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-rose-800 dark:text-rose-300 font-medium">
              Are you sure you want to permanently delete this purchase record?
            </span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-2.5 py-1 text-slate-600 dark:text-slate-300 font-medium hover:underline cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Hero Banner / Product Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {selectedPurchase.productName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <span>Purchased on <strong className="text-slate-700 dark:text-slate-300 font-medium">{selectedPurchase.purchaseDate}</strong></span>
                <span>·</span>
                <span>at <strong className="text-slate-700 dark:text-slate-300 font-medium">{selectedPurchase.storeName}</strong></span>
              </p>
            </div>

            <div className="sm:text-right shrink-0">
              <span className="text-xs text-slate-400 block font-medium">Price Paid</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(selectedPurchase.price, currency)}
              </span>
            </div>
          </div>

          {/* Product Image / Visual if present */}
          {selectedPurchase.productImage && (
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-16/9 sm:aspect-21/9 border border-slate-200/60 dark:border-slate-800">
              <img
                src={selectedPurchase.productImage}
                alt={selectedPurchase.productName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* Warranty Progress Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {warranty.urgencyCategory === 'critical_7d' ? (
                  <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
                ) : warranty.urgencyCategory === 'urgent_30d' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                ) : warranty.urgencyCategory === 'upcoming_90d' ? (
                  <Clock className="w-5 h-5 text-blue-500" />
                ) : warranty.urgencyCategory === 'active' ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : warranty.urgencyCategory === 'expired' ? (
                  <XCircle className="w-5 h-5 text-slate-400" />
                ) : (
                  <ShieldOff className="w-5 h-5 text-slate-400" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {selectedPurchase.hasWarranty
                      ? `Warranty Coverage (${selectedPurchase.warrantyDuration} ${selectedPurchase.warrantyUnit})`
                      : 'No Warranty Coverage'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {!selectedPurchase.hasWarranty
                      ? 'Standard retail sale with no warranty protection'
                      : warranty.urgencyCategory === 'expired'
                      ? 'Warranty coverage has concluded'
                      : `Expires on ${selectedPurchase.warrantyEndDate} (${warranty.label})`}
                  </p>
                </div>
              </div>

              <span
                className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg ${
                  warranty.urgencyCategory === 'critical_7d'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 ring-1 ring-rose-500/30'
                    : warranty.urgencyCategory === 'urgent_30d'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : warranty.urgencyCategory === 'upcoming_90d'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                    : warranty.urgencyCategory === 'active'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {warranty.label}
              </span>
            </div>

            {/* Progress bar */}
            {selectedPurchase.hasWarranty && selectedPurchase.warrantyEndDate && (
              <div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      warranty.urgencyCategory === 'expired'
                        ? 'bg-slate-400'
                        : warranty.urgencyCategory === 'critical_7d'
                        ? 'bg-rose-500'
                        : warranty.urgencyCategory === 'urgent_30d'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1.5">
                  <span>Start: {selectedPurchase.purchaseDate}</span>
                  <span>{progressPercent}% elapsed</span>
                  <span>End: {selectedPurchase.warrantyEndDate}</span>
                </div>
              </div>
            )}
          </div>

          {/* Return Window Status Card */}
          {returnInfo && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <RotateCcw className={`w-4 h-4 ${returnInfo.isEligible ? 'text-emerald-500' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Store Return Window</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Deadline: {selectedPurchase.returnDeadline}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-medium ${returnInfo.isEligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                {returnInfo.label}
              </span>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Store</span>
              <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block truncate">
                {selectedPurchase.storeName}
              </span>
              {selectedPurchase.storeLocation && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                  {selectedPurchase.storeLocation}
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Serial Number</span>
              <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                {selectedPurchase.serialNumber || 'Not recorded'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Order / Invoice</span>
              <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                {selectedPurchase.orderNumber || 'Not recorded'}
              </span>
            </div>
          </div>

          {/* Notes */}
          {selectedPurchase.notes && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 text-xs">
              <h5 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes & Terms</h5>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {selectedPurchase.notes}
              </p>
            </div>
          )}

          {/* Receipt Preview Section */}
          {selectedPurchase.receiptImage && (
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Digital Purchase Receipt
                  </span>
                </div>
                <button
                  onClick={() => setShowReceiptZoom(true)}
                  className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Enlarge Receipt</span>
                </button>
              </div>

              <div 
                onClick={() => setShowReceiptZoom(true)}
                className="cursor-zoom-in group relative max-h-56 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center"
              >
                <img
                  src={selectedPurchase.receiptImage}
                  alt="Receipt Preview"
                  className="w-full object-contain max-h-56 transition-transform duration-200 group-hover:scale-102"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="px-3 py-1.5 rounded-lg bg-black/75 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg">
                    <Maximize2 className="w-3.5 h-3.5" />
                    Click to view full receipt
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Timestamps info */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Added: {new Date(selectedPurchase.createdAt).toLocaleDateString()}
            </span>
            <span>
              Updated: {new Date(selectedPurchase.updatedAt || selectedPurchase.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Proof</span>
            </button>
            <button
              onClick={handleDownloadProof}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Text Record</span>
            </button>
          </div>

          <button
            onClick={() => setSelectedPurchase(null)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Fullscreen Receipt Lightbox */}
      {showReceiptZoom && selectedPurchase.receiptImage && (
        <div 
          onClick={() => setShowReceiptZoom(false)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              onClick={() => setShowReceiptZoom(false)}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <img
            src={selectedPurchase.receiptImage}
            alt="Receipt Full View"
            className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <p className="text-xs text-white/70 mt-3 font-mono">
            Click anywhere or press Esc to close
          </p>
        </div>
      )}

      {/* Certified Proof Print Modal */}
      <ReportExportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        singlePurchase={selectedPurchase}
      />
    </div>
  );
};
