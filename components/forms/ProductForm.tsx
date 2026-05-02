'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
