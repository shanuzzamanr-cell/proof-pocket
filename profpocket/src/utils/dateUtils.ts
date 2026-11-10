import { WarrantyStatus, WarrantyUnit, WarrantyUrgencyCategory } from '../types';

/**
 * Parses a YYYY-MM-DD string into a local Date at midnight.
 * Avoids UTC timezone day-shift bugs.
 */
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  const d = new Date(year, month, day);
  // Verify valid calendar date (e.g. not Feb 31)
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
    return null;
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Formats a Date object to YYYY-MM-DD string
 */
export function formatToISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Accurately calculates warranty end date adding months or years.
 * Handles month-end boundaries (e.g., Jan 31 + 1 month = Feb 28 or Feb 29 in leap year).
 */
export function calculateWarrantyEndDate(
  purchaseDateStr: string,
  duration: number,
  unit: WarrantyUnit
): string | null {
  if (duration <= 0) return null;
  const startDate = parseLocalDate(purchaseDateStr);
  if (!startDate) return null;

  const originalDay = startDate.getDate();
  const result = new Date(startDate);

  if (unit === 'years') {
    result.setFullYear(result.getFullYear() + duration);
    // Handle Feb 29 leap-year edge cases
    if (result.getDate() !== originalDay) {
      result.setDate(0); // last day of previous month (Feb 28)
    }
  } else {
    // months
    const targetMonth = result.getMonth() + duration;
    result.setMonth(targetMonth);
    // If the month rolled over because target month has fewer days (e.g. Jan 31 -> Mar 3)
    if (result.getDate() !== originalDay) {
      result.setDate(0); // Set to last day of target month
    }
  }

  return formatToISODate(result);
}

/**
 * Evaluates warranty status and exact urgency tiers:
 * - Critical: 0 <= daysLeft <= 7 days
 * - Urgent: 8 <= daysLeft <= 30 days
 * - Upcoming: 31 <= daysLeft <= 90 days
 * - Active: daysLeft > 90 days
 * - Expired: daysLeft < 0
 * - No Warranty: null or duration 0
 */
export function getWarrantyStatus(
  warrantyEndDate: string | null | undefined,
  hasWarranty: boolean = true
): {
  status: WarrantyStatus;
  urgencyCategory: WarrantyUrgencyCategory;
  daysLeft: number;
  label: string;
} {
  if (!hasWarranty || !warrantyEndDate) {
    return {
      status: 'no_warranty',
      urgencyCategory: 'no_warranty',
      daysLeft: 0,
      label: 'No Warranty',
    };
  }

  const end = parseLocalDate(warrantyEndDate);
  if (!end) {
    return {
      status: 'no_warranty',
      urgencyCategory: 'no_warranty',
      daysLeft: 0,
      label: 'No Warranty',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - today.getTime();
  const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      status: 'expired',
      urgencyCategory: 'expired',
      daysLeft,
      label: `Expired ${Math.abs(daysLeft)}d ago`,
    };
  }

  if (daysLeft <= 7) {
    return {
      status: 'expiring_soon',
      urgencyCategory: 'critical_7d',
      daysLeft,
      label: daysLeft === 0 ? 'Expires today' : `${daysLeft} days left (Critical)`,
    };
  }

  if (daysLeft <= 30) {
    return {
      status: 'expiring_soon',
      urgencyCategory: 'urgent_30d',
      daysLeft,
      label: `${daysLeft} days left`,
    };
  }

  if (daysLeft <= 90) {
    return {
      status: 'active',
      urgencyCategory: 'upcoming_90d',
      daysLeft,
      label: `${daysLeft} days left`,
    };
  }

  return {
    status: 'active',
    urgencyCategory: 'active',
    daysLeft,
    label: `${daysLeft} days left`,
  };
}

/**
 * Calculates store return window eligibility
 */
export function calculateReturnStatus(returnDeadline?: string | null): {
  isEligible: boolean;
  daysLeft: number;
  label: string;
} | null {
  if (!returnDeadline) return null;
  const deadline = parseLocalDate(returnDeadline);
  if (!deadline) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = deadline.getTime() - today.getTime();
  const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      isEligible: false,
      daysLeft,
      label: 'Return window closed',
    };
  }

  return {
    isEligible: true,
    daysLeft,
    label: daysLeft === 0 ? 'Returns close today' : `${daysLeft} days left to return`,
  };
}
