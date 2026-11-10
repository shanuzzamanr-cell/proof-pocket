import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Purchase } from '../types';

/**
 * Attaches a real-time onSnapshot listener for the authenticated user's purchases.
 */
export function subscribeToUserPurchases(
  userId: string,
  onPurchases: (purchases: Purchase[]) => void,
  onError: (err: any) => void
): () => void {
  const collectionPath = `users/${userId}/purchases`;
  const purchasesRef = collection(db, 'users', userId, 'purchases');
  const q = query(purchasesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Purchase[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const purchase: Purchase = {
          id: docSnap.id,
          productName: data.productName || '',
          brand: data.brand || '',
          category: data.category || 'Other',
          price: data.purchasePrice !== undefined ? data.purchasePrice : (data.price || 0),
          currency: data.currency || 'USD',
          purchaseDate: data.purchaseDate || new Date().toISOString().split('T')[0],
          hasWarranty: data.hasWarranty !== false && (data.warrantyDuration || 0) > 0,
          warrantyDuration: data.warrantyDuration || 0,
          warrantyUnit: data.warrantyUnit || 'years',
          warrantyEndDate: data.warrantyExpiryDate !== undefined ? data.warrantyExpiryDate : (data.warrantyEndDate || null),
          returnDeadline: data.returnDeadline || null,
          storeName: data.storeName || '',
          storeLocation: data.storeLocation || undefined,
          orderNumber: data.orderNumber || undefined,
          serialNumber: data.serialNumber || undefined,
          notes: data.notes || undefined,
          productImage: data.productImage || undefined,
          receiptImage: data.receiptUrl || data.receiptImage || undefined,
          createdAt: typeof data.createdAt === 'string' ? data.createdAt : (data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()),
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : (data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString()),
        };
        list.push(purchase);
      });
      onPurchases(list);
    },
    (error) => {
      onError(error);
      handleFirestoreError(error, OperationType.GET, collectionPath);
    }
  );
}

/**
 * Creates a new purchase document under users/{userId}/purchases/{purchaseId}
 */
export async function createCloudPurchase(userId: string, purchase: Purchase): Promise<void> {
  const docPath = `users/${userId}/purchases/${purchase.id}`;
  const docRef = doc(db, 'users', userId, 'purchases', purchase.id);

  const payload: Record<string, any> = {
    id: purchase.id,
    userId,
    productName: purchase.productName,
    brand: purchase.brand,
    purchasePrice: purchase.price,
    price: purchase.price,
    currency: purchase.currency,
    purchaseDate: purchase.purchaseDate,
    hasWarranty: purchase.hasWarranty,
    warrantyDuration: purchase.warrantyDuration,
    warrantyUnit: purchase.warrantyUnit,
    warrantyExpiryDate: purchase.warrantyEndDate,
    warrantyEndDate: purchase.warrantyEndDate,
    returnDeadline: purchase.returnDeadline || null,
    storeName: purchase.storeName,
    storeLocation: purchase.storeLocation || null,
    category: purchase.category,
    receiptUrl: purchase.receiptImage || null,
    productImage: purchase.productImage || null,
    orderNumber: purchase.orderNumber || null,
    serialNumber: purchase.serialNumber || null,
    notes: purchase.notes || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

/**
 * Updates a purchase document in Cloud Firestore
 */
export async function updateCloudPurchase(
  userId: string, 
  purchaseId: string, 
  updates: Partial<Purchase>
): Promise<void> {
  const docPath = `users/${userId}/purchases/${purchaseId}`;
  const docRef = doc(db, 'users', userId, 'purchases', purchaseId);

  const payload: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (updates.productName !== undefined) payload.productName = updates.productName;
  if (updates.brand !== undefined) payload.brand = updates.brand;
  if (updates.price !== undefined) {
    payload.purchasePrice = updates.price;
    payload.price = updates.price;
  }
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.currency !== undefined) payload.currency = updates.currency;
  if (updates.purchaseDate !== undefined) payload.purchaseDate = updates.purchaseDate;
  if (updates.hasWarranty !== undefined) payload.hasWarranty = updates.hasWarranty;
  if (updates.warrantyDuration !== undefined) payload.warrantyDuration = updates.warrantyDuration;
  if (updates.warrantyUnit !== undefined) payload.warrantyUnit = updates.warrantyUnit;
  if (updates.warrantyEndDate !== undefined) {
    payload.warrantyExpiryDate = updates.warrantyEndDate;
    payload.warrantyEndDate = updates.warrantyEndDate;
  }
  if (updates.returnDeadline !== undefined) payload.returnDeadline = updates.returnDeadline;
  if (updates.storeName !== undefined) payload.storeName = updates.storeName;
  if (updates.storeLocation !== undefined) payload.storeLocation = updates.storeLocation;
  if (updates.receiptImage !== undefined) payload.receiptUrl = updates.receiptImage;
  if (updates.orderNumber !== undefined) payload.orderNumber = updates.orderNumber;
  if (updates.serialNumber !== undefined) payload.serialNumber = updates.serialNumber;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  try {
    await updateDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

/**
 * Deletes a purchase document from Cloud Firestore
 */
export async function deleteCloudPurchase(userId: string, purchaseId: string): Promise<void> {
  const docPath = `users/${userId}/purchases/${purchaseId}`;
  const docRef = doc(db, 'users', userId, 'purchases', purchaseId);

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Safe local-to-cloud data migration:
 * Migrates existing Phase 02 local purchases into the user's Firestore subcollection.
 * Prevents duplicates by checking existing document IDs.
 */
export async function migrateLocalPurchasesToCloud(
  userId: string,
  localPurchases: Purchase[]
): Promise<{ successCount: number; errors: string[] }> {
  let successCount = 0;
  const errors: string[] = [];

  // Fetch existing IDs to prevent duplicates
  const existingDocIds = new Set<string>();
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'purchases'));
    snap.forEach(d => existingDocIds.add(d.id));
  } catch {
    // ignore
  }

  for (const item of localPurchases) {
    if (existingDocIds.has(item.id)) {
      continue; // Skip already migrated
    }

    try {
      await createCloudPurchase(userId, item);
      successCount++;
    } catch (err: any) {
      console.error(`[Migration] Failed to migrate item ${item.productName}:`, err);
      errors.push(`${item.productName}: ${err?.message || 'Upload error'}`);
    }
  }

  return { successCount, errors };
}
