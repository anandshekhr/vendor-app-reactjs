import { z } from 'zod';

const money = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 120 or 99.50');

const wholeNumber = z
  .string()
  .trim()
  .refine((v) => /^\d+$/.test(v), 'Enter a whole number (0 or more)');

export const BARCODE_TYPES = ['EAN13', 'EAN8', 'UPC', 'CODE128', 'CODE39', 'QR', 'OTHER'] as const;

export const productSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is too short').max(255),
    category: z.string().optional(),
    unit: z.string().optional(),
    description: z.string().max(5000).optional(),
    price: money,
    mrp: money,
    /** Only sent on create — stock changes after that go through stock operations. */
    initialStock: wholeNumber,
    low_stock_threshold: wholeNumber,
    is_active: z.boolean(),
    discount_type: z.enum(['', 'percentage', 'fixed']),
    discount_value: z.string().trim().optional(),
    discount_start: z.string().optional(),
    discount_end: z.string().optional(),
    barcode: z
      .string()
      .trim()
      .max(100)
      .refine((v) => v === '' || /^[A-Za-z0-9\-_.:/]{3,100}$/.test(v), 'Barcode may contain letters, digits and - _ . : /')
      .optional(),
    barcode_type: z.enum(BARCODE_TYPES),
  })
  .superRefine((v, ctx) => {
    const price = Number(v.price);
    const mrp = Number(v.mrp);
    if (Number.isFinite(price) && Number.isFinite(mrp) && mrp < price) {
      ctx.addIssue({ code: 'custom', path: ['mrp'], message: 'MRP cannot be lower than the selling price' });
    }
    if (v.discount_type) {
      const d = Number(v.discount_value);
      if (!v.discount_value || !Number.isFinite(d) || d <= 0) {
        ctx.addIssue({ code: 'custom', path: ['discount_value'], message: 'Enter a discount greater than 0' });
      } else if (v.discount_type === 'percentage' && d > 100) {
        ctx.addIssue({ code: 'custom', path: ['discount_value'], message: 'Percentage cannot exceed 100' });
      } else if (v.discount_type === 'fixed' && d >= price) {
        ctx.addIssue({ code: 'custom', path: ['discount_value'], message: 'Fixed discount must be less than the price' });
      }
    }
    if (v.discount_start && v.discount_end && v.discount_end < v.discount_start) {
      ctx.addIssue({ code: 'custom', path: ['discount_end'], message: 'End date must be after the start date' });
    }
  });

export type ProductFormValues = z.infer<typeof productSchema>;

export const emptyProduct: ProductFormValues = {
  name: '',
  category: '',
  unit: '',
  description: '',
  price: '',
  mrp: '',
  initialStock: '0',
  low_stock_threshold: '5',
  is_active: true,
  discount_type: '',
  discount_value: '',
  discount_start: '',
  discount_end: '',
  barcode: '',
  barcode_type: 'EAN13',
};

/** Builds the write payload. `includeStock` is true only on create so editing never overwrites live stock. */
export function toProductPayload(v: ProductFormValues, includeStock: boolean): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: v.name.trim(),
    category: v.category ? Number(v.category) : null,
    unit: v.unit ? Number(v.unit) : null,
    description: v.description ?? '',
    price: v.price,
    mrp: v.mrp,
    low_stock_threshold: Number(v.low_stock_threshold),
    is_active: v.is_active,
    product_type: 'PRODUCT',
    discount_type: v.discount_type || null,
    discount_value: v.discount_type ? v.discount_value : null,
    discount_start: v.discount_type && v.discount_start ? v.discount_start : null,
    discount_end: v.discount_type && v.discount_end ? v.discount_end : null,
  };
  if (includeStock) payload.stock = Number(v.initialStock);
  return payload;
}

export function toFormData(payload: Record<string, unknown>, image: File): FormData {
  const fd = new FormData();
  for (const [k, value] of Object.entries(payload)) {
    if (value === null || value === undefined) continue;
    fd.append(k, typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value));
  }
  fd.append('image', image);
  return fd;
}
