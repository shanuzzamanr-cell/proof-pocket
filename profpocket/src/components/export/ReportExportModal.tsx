import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Purchase, Category } from '../../types';
import { printReport, generateReportHtml, ReportType } from '../../utils/pdfExportUtils';
import { formatCurrency } from '../../data/samplePurchases';
import { 
  X, 
  Printer, 
  FileText, 
  ShieldCheck, 
  Download, 
  Calendar, 
  DollarSign,
  Check,
  Filter
} from 'lucide-react';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPurchases?: Purchase[];
  singlePurchase?: Purchase;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  initialPurchases,
  singlePurchase,
}) => {
  const { purchases, currency, userProfile, showToast } = useApp();

  const [reportType, setReportType] = useState<ReportType>(
    singlePurchase ? 'single_proof' : 'ledger'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyActiveWarranties, setOnlyActiveWarranties] = useState(false);

  if (!isOpen) return null;

  const dataPool = initialPurchases || purchases;

  // Filter items
  const exportablePurchases = dataPool.filter((p) => {
    if (selectedCategory !== 'All' && p.category !== selectedCategory) {
      return false;
    }
    if (onlyActiveWarranties && (!p.hasWarranty || !p.warrantyEndDate)) {
      return false;
    }
    return true;
  });

  const totalValue = exportablePurchases.reduce((acc, p) => acc + (p.price || 0), 0);

  const handlePrint = () => {
    printReport({
      type: reportType,
      purchases: exportablePurchases,
      singlePurchase,
      currency,
      userName: userProfile.name,
      dateRangeLabel: selectedCategory === 'All' ? 'Complete Vault' : `${selectedCategory} Only`,
    });
    showToast('Print dialog initiated', 'info');
  };

  const handleDownloadHtml = () => {
    const htmlContent = generateReportHtml({
      type: reportType,
      purchases: exportablePurchases,
      singlePurchase,
      currency,
      userName: userProfile.name,
      dateRangeLabel: selectedCategory === 'All' ? 'Complete Vault' : `${selectedCategory} Only`,
    });

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proofpocket-report-${reportType}-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report HTML downloaded', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Export & Print PDF Reports
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate clean, print-ready sheets for insurance, claims, or bookkeeping
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Report Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Report Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {singlePurchase && (
                <button
                  type="button"
                  onClick={() => setReportType('single_proof')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    reportType === 'single_proof'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <FileText className="w-4 h-4 text-emerald-600 mb-1" />
                  <p className="text-xs font-bold">Item Proof Sheet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {singlePurchase.productName}
                  </p>
                </button>
              )}

              <button
                type="button"
                onClick={() => setReportType('ledger')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  reportType === 'ledger'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600 mb-1" />
                <p className="text-xs font-bold">Comprehensive Ledger</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Complete tabular list of purchases
                </p>
              </button>

              <button
                type="button"
                onClick={() => setReportType('warranty_coverage')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  reportType === 'warranty_coverage'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
                <p className="text-xs font-bold">Warranty Schedule</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Protection expiry & claim deadlines
                </p>
              </button>
            </div>
          </div>

          {/* Options / Filters (for multiple items) */}
          {reportType !== 'single_proof' && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Report Scope & Filters
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Category Filter
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Audio">Audio</option>
                    <option value="Home Appliances">Home Appliances</option>
                    <option value="Wearables">Wearables</option>
                    <option value="Computers">Computers</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={onlyActiveWarranties}
                      onChange={(e) => setOnlyActiveWarranties(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span>Active warranties only</span>
                  </label>
                </div>
              </div>

              {/* Summary Stats in preview */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">
                  Included: <strong>{exportablePurchases.length}</strong> items
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  Total Value: {formatCurrency(totalValue, currency)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>HTML</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
