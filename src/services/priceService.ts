/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db, DbProduct, DbPriceHistory } from '../database/db';

export interface UpdatePriceParams {
  userRole?: string;
  userName?: string;
  userId?: string;
  product: DbProduct;
  newPrice: number;
}

export interface UpdatePriceResult {
  success: boolean;
  product: DbProduct;
  auditRecord: DbPriceHistory;
  message: string;
}

export const priceService = {
  /**
   * Validates if a price value is a valid numeric value strictly greater than 0.
   */
  validatePrice(price: number | string): { isValid: boolean; error?: string; numericValue: number } {
    if (price === '' || price === null || price === undefined) {
      return { isValid: false, error: 'Price is required and cannot be empty.', numericValue: 0 };
    }

    const num = Number(price);

    if (isNaN(num)) {
      return { isValid: false, error: 'Price must be a valid numeric value.', numericValue: 0 };
    }

    if (num <= 0) {
      return { isValid: false, error: 'Price must be greater than zero (₹0.00). Negative or zero prices are invalid.', numericValue: num };
    }

    return { isValid: true, numericValue: num };
  },

  /**
   * Securely updates item price on both backend server and local Dexie DB,
   * enforcing OWNER/MANAGER role permissions and creating an audit log entry.
   */
  async updateItemPrice(params: UpdatePriceParams): Promise<UpdatePriceResult> {
    const { userRole, userName, userId, product, newPrice } = params;
    const role = (userRole || '').toUpperCase();

    // 1. Frontend Role Verification
    if (role !== 'OWNER' && role !== 'MANAGER') {
      throw new Error('Access denied: Only Owner and Manager roles are permitted to modify item prices.');
    }

    // 2. Price Validation
    const validation = this.validatePrice(newPrice);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid price value.');
    }

    const validNewPrice = validation.numericValue;
    const previousPrice = Number(product.sellingPrice) || 0;

    // 3. Backend Authorization and Audit Verification
    try {
      const response = await fetch('/api/price-management/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userRole: role,
          userName: userName || 'Authorized User',
          userId: userId || '',
          productId: product.id,
          productName: product.name,
          itemType: product.itemType || 'PRODUCT',
          previousPrice,
          newPrice: validNewPrice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server authorization failed (${response.status})`);
      }
    } catch (err: any) {
      // If network fails (e.g. offline POS), allow local offline role enforcement if authorized
      if (!window.navigator.onLine) {
        console.warn('Offline mode: Enforcing local price update authorization.');
      } else {
        throw err;
      }
    }

    // 4. Update product in local IndexedDB
    const nowIso = new Date().toISOString();
    const updatedProduct: DbProduct = {
      ...product,
      sellingPrice: validNewPrice,
      updatedAt: nowIso,
    };

    await db.products.put(updatedProduct);

    // 5. Create Audit Trail Entry
    const auditRecord: DbPriceHistory = {
      productId: product.id,
      productName: product.name,
      itemType: product.itemType || 'PRODUCT',
      previousPrice,
      newPrice: validNewPrice,
      changedBy: `${userName || 'Authorized User'} (${role})`,
      changedByUserId: userId || '',
      changedAt: nowIso,
      timestamp: Date.now(),
    };

    await db.priceHistory.add(auditRecord);

    // 6. Record to syncQueue
    await db.syncQueue.add({
      tableName: 'products',
      action: 'UPDATE',
      payload: JSON.stringify(updatedProduct),
      timestamp: nowIso,
    });

    return {
      success: true,
      product: updatedProduct,
      auditRecord,
      message: `Successfully updated ${product.name} price to ₹${validNewPrice.toFixed(2)}.`,
    };
  },

  /**
   * Retrieves full or item-specific price change history.
   */
  async getPriceHistory(productId?: string): Promise<DbPriceHistory[]> {
    if (productId) {
      return db.priceHistory
        .where('productId')
        .equals(productId)
        .reverse()
        .sortBy('timestamp');
    }
    return db.priceHistory.orderBy('timestamp').reverse().toArray();
  }
};
