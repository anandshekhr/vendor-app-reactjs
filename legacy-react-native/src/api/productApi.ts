import { apiClient } from './client';
import {
  Product,
  ProductFormData,
  MasterProduct,
  ProductFilter,
} from '../models/types';

interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

interface MasterProductSearchResponse {
  products: MasterProduct[];
}

export const productApi = {
  getProducts: (params?: { page?: number; limit?: number; filter?: ProductFilter }): Promise<ProductListResponse> =>
    apiClient.get('/vendor/products', { params }),

  getProductById: (id: string): Promise<Product> =>
    apiClient.get(`/vendor/products/${encodeURIComponent(id)}`),

  addProduct: (data: Partial<ProductFormData>): Promise<Product> =>
    apiClient.post('/vendor/products', data),

  updateProduct: (id: string, data: Partial<ProductFormData>): Promise<Product> =>
    apiClient.put(`/vendor/products/${encodeURIComponent(id)}`, data),

  deleteProduct: (id: string): Promise<void> =>
    apiClient.delete(`/vendor/products/${encodeURIComponent(id)}`),

  toggleProductStatus: (id: string, isActive: boolean): Promise<Product> =>
    apiClient.patch(`/vendor/products/${encodeURIComponent(id)}/status`, { isActive }),

  bulkUpdateStock: (updates: Array<{ productId: string; quantity: number }>): Promise<void> =>
    apiClient.post('/vendor/products/bulk-stock', { updates }),

  uploadProductImages: (formData: FormData): Promise<{ urls: string[] }> =>
    apiClient.upload('/vendor/products/upload-images', formData),

  searchMasterProducts: (query: string): Promise<MasterProductSearchResponse> =>
    apiClient.get('/master-products/search', { params: { q: query } }),

  getMasterProductByBarcode: (barcode: string): Promise<MasterProduct | null> =>
    apiClient.get(`/master-products/barcode/${encodeURIComponent(barcode)}`),
};
