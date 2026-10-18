import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ProductState, Product, ProductFilter, MasterProduct } from '../../models/types';
import { productApi } from '../../api';

const initialState: ProductState = {
  products: [],
  masterProducts: [],
  selectedProduct: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  filter: {},
};

export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async (params: { page?: number; filter?: ProductFilter } | undefined, { rejectWithValue }) => {
    try {
      return await productApi.getProducts(params);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await productApi.getProductById(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch product');
    }
  }
);

export const addProduct = createAsyncThunk(
  'products/add',
  async (data: any, { rejectWithValue }) => {
    try {
      return await productApi.addProduct(data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add product');
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/update',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      return await productApi.updateProduct(id, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update product');
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await productApi.deleteProduct(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete product');
    }
  }
);

export const toggleProductStatus = createAsyncThunk(
  'products/toggleStatus',
  async ({ id, isActive }: { id: string; isActive: boolean }, { rejectWithValue }) => {
    try {
      return await productApi.toggleProductStatus(id, isActive);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update status');
    }
  }
);

export const searchMasterProducts = createAsyncThunk(
  'products/searchMaster',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await productApi.searchMasterProducts(query);
      return response.products;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Search failed');
    }
  }
);

export const getMasterProductByBarcode = createAsyncThunk(
  'products/masterByBarcode',
  async (barcode: string, { rejectWithValue }) => {
    try {
      return await productApi.getMasterProductByBarcode(barcode);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Product not found');
    }
  }
);

export const bulkUpdateStock = createAsyncThunk(
  'products/bulkStock',
  async (updates: Array<{ productId: string; quantity: number }>, { rejectWithValue }) => {
    try {
      await productApi.bulkUpdateStock(updates);
      return updates;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Bulk update failed');
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearProductError: (state) => {
      state.error = null;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },
    clearMasterProducts: (state) => {
      state.masterProducts = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload.products;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.selectedProduct = action.payload;
      })
      .addCase(addProduct.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products.unshift(action.payload);
      })
      .addCase(addProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.products.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) state.products[index] = action.payload;
        state.selectedProduct = action.payload;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.products = state.products.filter((p) => p.id !== action.payload);
      })
      .addCase(toggleProductStatus.fulfilled, (state, action) => {
        const index = state.products.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) state.products[index] = action.payload;
      })
      .addCase(searchMasterProducts.fulfilled, (state, action) => {
        state.masterProducts = action.payload;
      })
      .addCase(getMasterProductByBarcode.fulfilled, (state, action) => {
        if (action.payload) {
          state.masterProducts = [action.payload];
        }
      });
  },
});

export const { clearProductError, setSearchQuery, setFilter, clearSelectedProduct, clearMasterProducts } = productSlice.actions;
export default productSlice.reducer;
