'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown } from 'lucide-react';
import { ProductInputSchema, type ProductInput } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ProductFormProps {
  defaultValues?: Partial<ProductInput>;
  onSubmit: (data: ProductInput) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

const numberSetValueAs = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : Number(v);

const hasAnyFee = (values?: Partial<ProductInput>) =>
  Boolean(
    values?.transactionFeePercent ||
      values?.transactionFeeFixed ||
      values?.shippingCost ||
      values?.refundRate,
  );

export function ProductForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save product',
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput>({
    resolver: zodResolver(ProductInputSchema),
    defaultValues,
  });

  const feesOpenByDefault = hasAnyFee(defaultValues);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">Product name</Label>
        <Input
          id="name"
          placeholder="e.g. Linen Tote"
          aria-invalid={Boolean(errors.name)}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-caption text-danger-text">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="targetCPA">Target CPA (USD)</Label>
        <Input
          id="targetCPA"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="e.g. 25"
          aria-invalid={Boolean(errors.targetCPA)}
          {...register('targetCPA', { setValueAs: numberSetValueAs })}
        />
        {errors.targetCPA && (
          <p className="text-caption text-danger-text">{errors.targetCPA.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="defaultCOGS">Default COGS per order (USD, optional)</Label>
        <Input
          id="defaultCOGS"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="e.g. 12"
          aria-invalid={Boolean(errors.defaultCOGS)}
          {...register('defaultCOGS', { setValueAs: numberSetValueAs })}
        />
        {errors.defaultCOGS && (
          <p className="text-caption text-danger-text">{errors.defaultCOGS.message}</p>
        )}
      </div>

      <details
        className="group rounded-lg border border-border bg-surface"
        open={feesOpenByDefault}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <ChevronDown className="size-4 text-text-muted transition-transform -rotate-90 group-open:rotate-0" />
          <span className="text-body text-text">Fees &amp; costs (optional)</span>
          <span className="text-caption text-text-muted">
            — sharpens profit
          </span>
        </summary>
        <div className="grid gap-4 border-t border-border-subtle p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="transactionFeePercent">Transaction fee %</Label>
            <Input
              id="transactionFeePercent"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="100"
              placeholder="2.9"
              aria-invalid={Boolean(errors.transactionFeePercent)}
              {...register('transactionFeePercent', { setValueAs: numberSetValueAs })}
            />
            <p className="text-caption text-text-muted">
              % of revenue paid to the payment processor. Shopify Payments default is 2.9%.
            </p>
            {errors.transactionFeePercent && (
              <p className="text-caption text-danger-text">
                {errors.transactionFeePercent.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="transactionFeeFixed">Transaction fee fixed ($)</Label>
            <Input
              id="transactionFeeFixed"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.30"
              aria-invalid={Boolean(errors.transactionFeeFixed)}
              {...register('transactionFeeFixed', { setValueAs: numberSetValueAs })}
            />
            <p className="text-caption text-text-muted">
              Flat fee per transaction. Shopify default is $0.30.
            </p>
            {errors.transactionFeeFixed && (
              <p className="text-caption text-danger-text">
                {errors.transactionFeeFixed.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shippingCost">Shipping cost per order ($)</Label>
            <Input
              id="shippingCost"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0"
              aria-invalid={Boolean(errors.shippingCost)}
              {...register('shippingCost', { setValueAs: numberSetValueAs })}
            />
            <p className="text-caption text-text-muted">
              Average shipping you pay per order. Leave 0 if customers cover it.
            </p>
            {errors.shippingCost && (
              <p className="text-caption text-danger-text">
                {errors.shippingCost.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refundRate">Expected refund rate %</Label>
            <Input
              id="refundRate"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="100"
              placeholder="0"
              aria-invalid={Boolean(errors.refundRate)}
              {...register('refundRate', { setValueAs: numberSetValueAs })}
            />
            <p className="text-caption text-text-muted">
              Share of revenue you expect to refund. Subtracted from net revenue.
            </p>
            {errors.refundRate && (
              <p className="text-caption text-danger-text">{errors.refundRate.message}</p>
            )}
          </div>
        </div>
      </details>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Anything you want to remember about this product test"
          aria-invalid={Boolean(errors.notes)}
          {...register('notes')}
        />
        {errors.notes && (
          <p className="text-caption text-danger-text">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
