import { Purchase } from '../types';
import { formatCurrency } from '../data/samplePurchases';
import { getWarrantyStatus } from './dateUtils';

export type ReportType = 'ledger' | 'warranty_coverage' | 'spending_summary' | 'single_proof';

interface ReportOptions {
  type: ReportType;
  purchases: Purchase[];
  singlePurchase?: Purchase;
  currency: string;
  userName?: string;
  dateRangeLabel?: string;
}

export function generateReportHtml(options: ReportOptions): string {
  const { type, purchases, singlePurchase, currency, userName = 'ProofPocket Member', dateRangeLabel = 'All Time' } = options;
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalVaultValue = purchases.reduce((acc, p) => acc + (p.price || 0), 0);

  const baseStyle = `
    <style>
      @page {
        size: A4;
        margin: 1.5cm;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
        background: #ffffff;
        margin: 0;
        padding: 20px;
        font-size: 13px;
        line-height: 1.5;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 20px;
        border-bottom: 2px solid #e2e8f0;
        margin-bottom: 24px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 20px;
        font-weight: 800;
        color: #059669;
        letter-spacing: -0.5px;
      }
      .report-title {
        font-size: 16px;
        font-weight: 700;
        color: #1e293b;
        margin-top: 4px;
      }
      .meta {
        text-align: right;
        font-size: 11px;
        color: #64748b;
      }
      .summary-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 24px;
      }
      .card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px 16px;
      }
      .card-label {
        font-size: 11px;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
      }
      .card-value {
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
        font-family: monospace;
        margin-top: 4px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 24px;
      }
      th {
        background: #f1f5f9;
        color: #475569;
        text-align: left;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 8px 12px;
        border-bottom: 1px solid #cbd5e1;
      }
      td {
        padding: 10px 12px;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: top;
      }
      .badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 10px;
        font-weight: 700;
        font-family: monospace;
      }
      .badge-active { background: #dcfce7; color: #166534; }
      .badge-expiring { background: #fef3c7; color: #92400e; }
      .badge-expired { background: #f1f5f9; color: #475569; }
      .badge-critical { background: #ffe4e6; color: #9f1239; }
      .footer {
        margin-top: 40px;
        padding-top: 16px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #94a3b8;
      }
      .receipt-container {
        margin-top: 20px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
        max-width: 450px;
      }
      .receipt-img {
        width: 100%;
        height: auto;
        display: block;
      }
      @media print {
        body { padding: 0; }
        .no-print { display: none; }
      }
    </style>
  `;

  if (type === 'single_proof' && singlePurchase) {
    const status = getWarrantyStatus(singlePurchase.warrantyEndDate, singlePurchase.hasWarranty);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ProofPocket - Purchase Proof Sheet - ${singlePurchase.productName}</title>
        ${baseStyle}
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">ProofPocket</div>
            <div class="report-title">Official Purchase & Warranty Proof Sheet</div>
          </div>
          <div class="meta">
            <div>Document ID: ${singlePurchase.id}</div>
            <div>Generated: ${now}</div>
            <div>Owner: ${userName}</div>
          </div>
        </div>

        <div class="summary-cards">
          <div class="card">
            <div class="card-label">Purchase Price</div>
            <div class="card-value">${formatCurrency(singlePurchase.price, currency)}</div>
          </div>
          <div class="card">
            <div class="card-label">Purchase Date</div>
            <div class="card-value" style="font-size: 15px;">${singlePurchase.purchaseDate}</div>
          </div>
          <div class="card">
            <div class="card-label">Warranty Status</div>
            <div class="card-value" style="font-size: 15px;">${status.label}</div>
          </div>
        </div>

        <table>
          <tr>
            <th style="width: 25%;">Property</th>
            <th>Recorded Details</th>
          </tr>
          <tr>
            <td><strong>Product Name</strong></td>
            <td><strong>${singlePurchase.productName}</strong></td>
          </tr>
          <tr>
            <td><strong>Brand / Manufacturer</strong></td>
            <td>${singlePurchase.brand}</td>
          </tr>
          <tr>
            <td><strong>Category</strong></td>
            <td>${singlePurchase.category}</td>
          </tr>
          <tr>
            <td><strong>Store / Retailer</strong></td>
            <td>${singlePurchase.storeName} ${singlePurchase.storeLocation ? `(${singlePurchase.storeLocation})` : ''}</td>
          </tr>
          <tr>
            <td><strong>Order / Invoice #</strong></td>
            <td>${singlePurchase.orderNumber || 'Not specified'}</td>
          </tr>
          <tr>
            <td><strong>Serial Number</strong></td>
            <td><code style="font-family: monospace; font-size: 12px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${singlePurchase.serialNumber || 'N/A'}</code></td>
          </tr>
          <tr>
            <td><strong>Warranty Coverage</strong></td>
            <td>${singlePurchase.hasWarranty ? `${singlePurchase.warrantyDuration} ${singlePurchase.warrantyUnit} (Valid until ${singlePurchase.warrantyEndDate})` : 'No Warranty'}</td>
          </tr>
          <tr>
            <td><strong>Return Window</strong></td>
            <td>${singlePurchase.returnDeadline || 'None recorded'}</td>
          </tr>
          ${singlePurchase.notes ? `
          <tr>
            <td><strong>Notes & Policy</strong></td>
            <td>${singlePurchase.notes}</td>
          </tr>
          ` : ''}
        </table>

        ${singlePurchase.receiptImage ? `
          <div style="margin-top: 24px;">
            <div style="font-weight: 700; font-size: 13px; color: #334155; margin-bottom: 8px;">Attached Proof of Purchase Document</div>
            <div class="receipt-container">
              <img src="${singlePurchase.receiptImage}" class="receipt-img" alt="Receipt Proof" />
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <div>Verified through ProofPocket Vault System</div>
          <div>Page 1 of 1</div>
        </div>
      </body>
      </html>
    `;
  }

  // Ledger / General List Report
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ProofPocket - ${type === 'warranty_coverage' ? 'Warranty Coverage Report' : 'Purchase Ledger Report'}</title>
      ${baseStyle}
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">ProofPocket</div>
          <div class="report-title">
            ${type === 'warranty_coverage' ? 'Active Warranty & Expiration Schedule' : 'Comprehensive Purchase Ledger'}
          </div>
        </div>
        <div class="meta">
          <div>Report Range: ${dateRangeLabel}</div>
          <div>Generated on: ${now}</div>
          <div>User: ${userName}</div>
        </div>
      </div>

      <div class="summary-cards">
        <div class="card">
          <div class="card-label">Total Documented Value</div>
          <div class="card-value">${formatCurrency(totalVaultValue, currency)}</div>
        </div>
        <div class="card">
          <div class="card-label">Total Purchases</div>
          <div class="card-value">${purchases.length} Items</div>
        </div>
        <div class="card">
          <div class="card-label">Under Active Warranty</div>
          <div class="card-value">
            ${purchases.filter(p => getWarrantyStatus(p.warrantyEndDate, p.hasWarranty).status === 'active' || getWarrantyStatus(p.warrantyEndDate, p.hasWarranty).status === 'expiring_soon').length} Items
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Product & Brand</th>
            <th>Category</th>
            <th>Store</th>
            <th>Purchase Date</th>
            <th>Warranty Expiration</th>
            <th style="text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${purchases.map((p) => {
            const status = getWarrantyStatus(p.warrantyEndDate, p.hasWarranty);
            let badgeClass = 'badge-expired';
            if (status.urgencyCategory === 'critical_7d') badgeClass = 'badge-critical';
            else if (status.urgencyCategory === 'urgent_30d') badgeClass = 'badge-expiring';
            else if (status.urgencyCategory === 'active' || status.urgencyCategory === 'upcoming_90d') badgeClass = 'badge-active';

            return `
              <tr>
                <td>
                  <strong>${p.productName}</strong><br>
                  <span style="font-size: 11px; color: #64748b;">${p.brand} ${p.serialNumber ? `· SN: ${p.serialNumber}` : ''}</span>
                </td>
                <td>${p.category}</td>
                <td>${p.storeName}</td>
                <td style="font-family: monospace;">${p.purchaseDate}</td>
                <td>
                  ${p.hasWarranty && p.warrantyEndDate ? `
                    <span style="font-family: monospace;">${p.warrantyEndDate}</span><br>
                    <span class="badge ${badgeClass}">${status.label}</span>
                  ` : '<span style="color: #94a3b8;">No warranty</span>'}
                </td>
                <td style="text-align: right; font-family: monospace; font-weight: 700;">
                  ${formatCurrency(p.price, currency)}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="footer">
        <div>ProofPocket Personal Asset Management · Certified Export</div>
        <div>Total ${purchases.length} records verified</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Triggers standard browser print dialog for the generated HTML
 */
export function printReport(options: ReportOptions): void {
  const html = generateReportHtml(options);
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) {
    // If popups are blocked in iframe, print using hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 3000);
    }
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
