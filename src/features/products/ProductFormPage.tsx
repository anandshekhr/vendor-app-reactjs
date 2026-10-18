import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Boxes, ImagePlus, Trash2 } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Checkbox, ConfirmDialog, Field, Input, Select, Skeleton, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useToast } from '@/hooks/useToast';
import { isApiError } from '@/services/api/errors';
import { formatCurrency, formatNumber } from '@/utils/format';
import type { BarcodeType, ProductDetail } from '@/types/api';
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useGetCategoriesQuery,
  useGetProductQuery,
  useGetProductV2Query,
  useGetUnitsQuery,
  useRegisterBarcodeMutation,
  useUpdateProductMutation,
} from './api';
import { BARCODE_TYPES, emptyProduct, productSchema, toFormData, toProductPayload, type ProductFormValues } from './productSchema';

function fromProduct(p: ProductDetail, barcode: string | null, barcodeType: string | null): ProductFormValues {
  return {
    name: p.name,
    category: p.category ? String(p.category) : '',
    unit: p.unit ? String(p.unit) : '',
    description: p.description ?? '',
    price: String(p.price),
    mrp: String(p.mrp),
    initialStock: String(p.stock),
    low_stock_threshold: String(p.low_stock_threshold ?? 5),
    is_active: p.is_active,
    discount_type: p.discount_type ?? '',
    discount_value: p.discount_value != null ? String(p.discount_value) : '',
    discount_start: p.discount_start ?? '',
    discount_end: p.discount_end ?? '',
    barcode: barcode ?? '',
    barcode_type: (BARCODE_TYPES as readonly string[]).includes(barcodeType ?? '') ? (barcodeType as BarcodeType) : 'EAN13',
  };
}

export function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const productId = Number(id);
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const categories = useGetCategoriesQuery();
  const units = useGetUnitsQuery();
  const product = useGetProductQuery(productId, { skip: !isEdit });
  const productV2 = useGetProductV2Query(productId, { skip: !isEdit || !product.data });
  const [create, createState] = useCreateProductMutation();
  const [update, updateState] = useUpdateProductMutation();
  const [remove, removeState] = useDeleteProductMutation();
  const [registerBarcode] = useRegisterBarcodeMutation();
  const [image, setImage] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { ...emptyProduct, barcode: search.get('barcode') ?? '' },
  });
  const { register, handleSubmit, formState, reset, watch, setError } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (product.data) reset(fromProduct(product.data, productV2.data?.barcode ?? null, productV2.data?.barcode_type ?? null));
  }, [product.data, productV2.data, reset]);

  const imagePreview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const discountType = watch('discount_type');
  const originalBarcode = productV2.data?.barcode ?? '';

  const onSubmit = handleSubmit(async (values) => {
    const payload = toProductPayload(values, !isEdit);
    const body = image ? toFormData(payload, image) : payload;
    try {
      const saved = isEdit ? await update({ id: productId, data: body }).unwrap() : await create(body).unwrap();
      const barcode = values.barcode?.trim() ?? '';
      if (barcode && barcode !== originalBarcode) {
        try {
          await registerBarcode({ product_id: saved.id, barcode, barcode_type: values.barcode_type }).unwrap();
        } catch (err) {
          toast.error('Product saved, but the barcode was rejected', err);
          navigate(`/products/${saved.id}`, { replace: true });
          return;
        }
      }
      toast.success(isEdit ? 'Product updated' : 'Product created', `SKU ${saved.sku}`);
      navigate('/products');
    } catch (err) {
      if (isApiError(err)) {
        const map: Record<string, keyof ProductFormValues> = { stock: 'initialStock' };
        for (const [field, msg] of Object.entries(err.fieldErrors)) {
          const key = (map[field] ?? field) as keyof ProductFormValues;
          if (key in emptyProduct) setError(key, { message: msg });
        }
      }
      toast.error('Could not save product', err);
    }
  });

  const onDelete = async () => {
    try {
      await remove(productId).unwrap();
      toast.success('Product deleted');
      navigate('/products');
    } catch (err) {
      toast.error('Could not delete product', err);
    }
  };

  if (isEdit && product.error) return <ErrorState error={product.error} onRetry={product.refetch} />;
  if (isEdit && product.isLoading) return <Skeleton className="h-96 w-full" />;

  const saving = createState.isLoading || updateState.isLoading;

  return (
    <>
      <PageHeader
        backTo="/products"
        title={isEdit ? product.data?.name ?? 'Edit product' : 'Add product'}
        description={isEdit ? `SKU ${product.data?.sku} · generated by the server` : 'SKU is generated by the server when you save.'}
        actions={
          isEdit ? (
            <Button variant="outline" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          ) : undefined
        }
      />
      <form onSubmit={onSubmit} noValidate className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader title="Basic details" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name" error={errors.name?.message} required className="sm:col-span-2">
                <Input {...register('name')} />
              </Field>
              <Field label="Category" error={errors.category?.message}>
                <Select {...register('category')} disabled={categories.isLoading}>
                  <option value="">Uncategorised</option>
                  {(categories.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent_category_name ? `${c.parent_category_name} › ${c.name}` : c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Unit of measurement" error={errors.unit?.message}>
                <Select {...register('unit')} disabled={units.isLoading}>
                  <option value="">Not specified</option>
                  {(units.data ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Description" error={errors.description?.message} className="sm:col-span-2">
                <Textarea rows={4} {...register('description')} />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pricing" description="Prices are validated and stored by the server; the POS uses the server's final price." />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Selling price (₹)" error={errors.price?.message} required>
                <Input inputMode="decimal" {...register('price')} />
              </Field>
              <Field label="MRP (₹)" error={errors.mrp?.message} required>
                <Input inputMode="decimal" {...register('mrp')} />
              </Field>
              <Field label="Discount type" error={errors.discount_type?.message}>
                <Select {...register('discount_type')}>
                  <option value="">No discount</option>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </Select>
              </Field>
              <Field label={discountType === 'percentage' ? 'Discount (%)' : 'Discount (₹)'} error={errors.discount_value?.message}>
                <Input inputMode="decimal" disabled={!discountType} {...register('discount_value')} />
              </Field>
              <Field label="Discount starts" error={errors.discount_start?.message}>
                <Input type="date" disabled={!discountType} {...register('discount_start')} />
              </Field>
              <Field label="Discount ends" error={errors.discount_end?.message}>
                <Input type="date" disabled={!discountType} {...register('discount_end')} />
              </Field>
              {isEdit && productV2.data && (
                <p className="text-sm text-ink-muted sm:col-span-2">
                  Current final price (server): <span className="font-semibold text-ink">{formatCurrency(productV2.data.final_price)}</span>
                </p>
              )}
              <BackendGap gap="G-7" title="Per-product tax rate is not supported" className="sm:col-span-2">
                The product model has no tax field; tax is not collected here.
              </BackendGap>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Inventory & barcode" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              {isEdit ? (
                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-md bg-ink/[0.03] p-3">
                  <div>
                    <p className="text-sm font-medium">Current stock: {formatNumber(product.data?.stock)}</p>
                    <p className="text-xs text-ink-muted">Editing details never changes stock. Use a stock operation so the change is validated by the server.</p>
                  </div>
                  <Link to={`/inventory?product=${productId}`}>
                    <Button type="button" variant="outline" size="sm" leftIcon={<Boxes className="h-4 w-4" />}>
                      Adjust stock
                    </Button>
                  </Link>
                </div>
              ) : (
                <Field label="Initial stock" error={errors.initialStock?.message} required>
                  <Input inputMode="numeric" {...register('initialStock')} />
                </Field>
              )}
              <Field label="Low-stock alert at" error={errors.low_stock_threshold?.message} hint="Flagged when stock is at or below this level.">
                <Input inputMode="numeric" {...register('low_stock_threshold')} />
              </Field>
              <Field label="Barcode" error={errors.barcode?.message} hint="Scan with a handheld scanner or type it. Must be unique in your shop.">
                <Input autoComplete="off" {...register('barcode')} />
              </Field>
              <Field label="Barcode type" error={errors.barcode_type?.message}>
                <Select {...register('barcode_type')}>
                  {BARCODE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <BackendGap gap="G-7" title="Variants, weight/dimensions, batch and expiry are not supported yet" className="sm:col-span-2" />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Image" />
            <CardBody>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line p-4 text-center hover:border-brand-300">
                {imagePreview || product.data?.image ? (
                  <img src={imagePreview ?? product.data!.image!} alt="Product" className="max-h-48 rounded object-contain" />
                ) : (
                  <ImagePlus className="h-8 w-8 text-ink-subtle" aria-hidden />
                )}
                <span className="text-sm text-ink-muted">{image ? image.name : 'Choose an image (JPG/PNG, max 5 MB)'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size > 5 * 1024 * 1024) {
                      toast.error('Image is larger than 5 MB');
                      return;
                    }
                    setImage(f ?? null);
                  }}
                />
              </label>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Availability" />
            <CardBody>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox {...register('is_active')} /> Active — visible to customers and in the POS
              </label>
            </CardBody>
          </Card>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" loading={saving}>
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/products')}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
        loading={removeState.isLoading}
        tone="danger"
        title="Delete this product?"
        description="It will be removed from your shop and POS. This cannot be undone."
        confirmLabel="Delete product"
      />
    </>
  );
}
