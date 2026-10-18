import { apiClient } from './client';
import { InventoryItem, StockUpdate } from '../models/types';

interface InventoryResponse {
  items: InventoryItem[];
  total: number;
}

export const inventoryApi = {
  getInventory: (params?: { lowStockOnly?: boolean; page?: number }): Promise<InventoryResponse> =>
    apiClient.get('/vendor/inventory', { params }),

  updateStock: (update: StockUpdate): Promise<InventoryItem> =>
    apiClient.patch(`/vendor/inventory/${encodeURIComponent(update.productId)}`, {
      quantity: update.quantity,
      type: update.type,
    }),

  bulkUpdateInventory: (updates: StockUpdate[]): Promise<void> =>
    apiClient.post('/vendor/inventory/bulk-update', { updates }),

  getLowStockItems: (): Promise<InventoryResponse> =>
    apiClient.get('/vendor/inventory/low-stock'),
};
