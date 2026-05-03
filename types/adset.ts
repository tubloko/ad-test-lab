import { z } from 'zod';

export const FUNNEL_STAGES = ['TOF', 'MOF', 'BOF'] as const;
export const ADSET_STATUSES = ['active', 'paused', 'killed'] as const;

export const FunnelStageSchema = z.enum(FUNNEL_STAGES);
export const AdsetStatusSchema = z.enum(ADSET_STATUSES);

export const AdsetInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  audience: z.string().trim().max(60).optional(),
  funnelStage: FunnelStageSchema,
  budget: z.number().positive().optional(),
  status: AdsetStatusSchema.optional(),
});

export const AdsetSchema = AdsetInputSchema.extend({
  id: z.string().min(1),
  productId: z.string().min(1),
  campaignId: z.string().min(1),
  status: AdsetStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AdsetInput = z.infer<typeof AdsetInputSchema>;
export type AdsetStatus = z.infer<typeof AdsetStatusSchema>;
export type FunnelStage = z.infer<typeof FunnelStageSchema>;
export type Adset = z.infer<typeof AdsetSchema>;

/** Forward transitions for the inline status menu — current status excluded. */
export const ADSET_TRANSITIONS: Record<AdsetStatus, AdsetStatus[]> = {
  active: ['paused', 'killed'],
  paused: ['active', 'killed'],
  killed: ['active'],
};
