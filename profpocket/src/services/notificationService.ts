import { Purchase, AppNotificationSettings, AppNotificationItem } from '../types';
import { getWarrantyStatus, calculateReturnStatus } from '../utils/dateUtils';

const STORAGE_KEY_DISMISSED = 'proofpocket_dismissed_notifications_v1';

export function getDismissedNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISMISSED);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markNotificationAsDismissed(id: string): void {
  try {
    const ids = getDismissedNotificationIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(ids));
    }
  } catch {
    // ignore
  }
}

export function clearDismissedNotifications(): void {
  localStorage.removeItem(STORAGE_KEY_DISMISSED);
}

/**
 * Evaluates active purchases and generates reminders based on user settings
 */
export function generateNotifications(
  purchases: Purchase[],
  settings: AppNotificationSettings
): AppNotificationItem[] {
  const dismissed = getDismissedNotificationIds();
  const notifications: AppNotificationItem[] = [];

  for (const purchase of purchases) {
    // 1. Warranty Checks
    if (purchase.hasWarranty && purchase.warrantyEndDate) {
      const warrantyInfo = getWarrantyStatus(purchase.warrantyEndDate, true);

      // 7-day critical warning
      if (
        settings.warrantySevenDays &&
        warrantyInfo.daysLeft >= 0 &&
        warrantyInfo.daysLeft <= 7
      ) {
        const id = `notif-7d-${purchase.id}-${purchase.warrantyEndDate}`;
        if (!dismissed.includes(id)) {
          notifications.push({
            id,
            type: 'warranty_7d',
            title: warrantyInfo.daysLeft === 0 ? 'Warranty expires TODAY' : `Warranty expires in ${warrantyInfo.daysLeft} days`,
            message: `${purchase.brand} ${purchase.productName} warranty protection concludes on ${purchase.warrantyEndDate}.`,
            date: new Date().toISOString().split('T')[0],
            purchaseId: purchase.id,
            read: false,
          });
        }
      }
      // 30-day urgent warning
      else if (
        settings.warrantyThirtyDays &&
        warrantyInfo.daysLeft > 7 &&
        warrantyInfo.daysLeft <= 30
      ) {
        const id = `notif-30d-${purchase.id}-${purchase.warrantyEndDate}`;
        if (!dismissed.includes(id)) {
          notifications.push({
            id,
            type: 'warranty_30d',
            title: `Warranty expiring soon (${warrantyInfo.daysLeft} days left)`,
            message: `Check your ${purchase.brand} ${purchase.productName} before coverage expires on ${purchase.warrantyEndDate}.`,
            date: new Date().toISOString().split('T')[0],
            purchaseId: purchase.id,
            read: false,
          });
        }
      }
    }

    // 2. Return Window Checks
    if (settings.returnWindowReminder && purchase.returnDeadline) {
      const returnInfo = calculateReturnStatus(purchase.returnDeadline);
      if (returnInfo && returnInfo.isEligible && returnInfo.daysLeft <= 3 && returnInfo.daysLeft >= 0) {
        const id = `notif-return-${purchase.id}-${purchase.returnDeadline}`;
        if (!dismissed.includes(id)) {
          notifications.push({
            id,
            type: 'return_deadline',
            title: returnInfo.daysLeft === 0 ? 'Return window closes today!' : `Return deadline: ${returnInfo.daysLeft} days remaining`,
            message: `Last chance to return ${purchase.productName} to ${purchase.storeName} before ${purchase.returnDeadline}.`,
            date: new Date().toISOString().split('T')[0],
            purchaseId: purchase.id,
            read: false,
          });
        }
      }
    }
  }

  return notifications;
}

/**
 * Requests browser Web Notification permission
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return 'denied';
  }
}

/**
 * Triggers a real browser system notification if granted
 */
export function sendBrowserNotification(title: string, body: string, icon?: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  try {
    new Notification(title, {
      body,
      icon: icon || '/src/assets/images/sample_store_receipt_1794233964680.jpg',
      badge: '/src/assets/images/sample_store_receipt_1794233964680.jpg',
    });
  } catch (err) {
    console.warn('Could not spawn browser notification:', err);
  }
}
