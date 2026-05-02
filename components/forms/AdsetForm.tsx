'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdsetInputSchema, FUNNEL_STAGES, type AdsetInput } from '@/types/adset';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdsetNameBuilder } from './AdsetNameBuilder';

interface AdsetFormProps {
  productName: string;
  defaultValues?: Partial<AdsetInput>;
  onSubmit: (data: AdsetInput) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

const numberSetValueAs = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : Number(v);

const FUNNEL_LABELS: Record<(typeof FUNNEL_STAGES)[number], string> = {
  TOF: 'TOF — top of funnel (cold)',
  MOF: 'MOF — middle of funnel (warm)',
  BOF: 'BOF — bottom of funnel (retargeting)',
};

export function AdsetForm({
  productName,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save adset',
}: AdsetFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AdsetInput>({
    resolver: zodResolver(AdsetInputSchema),
    defaultValues: {
      funnelStage: 'TOF',
      ...defaultValues,
    },
  });

  const funnelStage = watch('funnelStage') ?? 'TOF';
  const audience = watch('audience');
  const budget = watch('budget');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="adsetName">Adset name</Label>
        <Input
          id="adsetName"
          placeholder="e.g. SA | TOF | Linen Tote | LAL3% | 30$"
          aria-invalid={Boolean(errors.name)}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-caption text-danger-text">{errors.name.message}</p>
        )}
        <AdsetNameBuilder
          productName={productName}
          funnelStage={funnelStage}
          audience={audience}
          budget={budget}
          onApply={(name) =>
            setValue('name', name, { shouldDirty: true, shouldValidate: true })
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="audience">Audience (optional)</Label>
        <Input
          id="audience"
          placeholder="e.g. LAL 3% purchasers"
          aria-invalid={Boolean(errors.audience)}
          {...register('audience', {
            setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
          })}
        />
        {errors.audience && (
          <p className="text-caption text-danger-text">{errors.audience.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Funnel stage</Label>
        <Controller
          control={control}
          name="funnelStage"
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a funnel stage" />
              </SelectTrigger>
              <SelectContent>
                {FUNNEL_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {FUNNEL_LABELS[stage]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.funnelStage && (
          <p className="text-caption text-danger-text">{errors.funnelStage.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="budget">Daily budget (USD, optional)</Label>
        <Input
          id="budget"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="Leave blank for CBO"
          aria-invalid={Boolean(errors.budget)}
          {...register('budget', { setValueAs: numberSetValueAs })}
        />
        {errors.budget && (
          <p className="text-caption text-danger-text">{errors.budget.message}</p>
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
