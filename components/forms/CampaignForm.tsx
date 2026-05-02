'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CampaignInputSchema, type CampaignInput } from '@/types/campaign';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CampaignFormProps {
  defaultValues?: Partial<CampaignInput>;
  onSubmit: (data: CampaignInput) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function CampaignForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save campaign',
}: CampaignFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CampaignInput>({
    resolver: zodResolver(CampaignInputSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="campaignName">Campaign name</Label>
        <Input
          id="campaignName"
          placeholder="e.g. Broad — May test"
          aria-invalid={Boolean(errors.name)}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-caption text-danger-text">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="campaignNotes">Notes (optional)</Label>
        <Textarea
          id="campaignNotes"
          rows={3}
          placeholder="Hypothesis, audience strategy, anything you want to remember…"
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
