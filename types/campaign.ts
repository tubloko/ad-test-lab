import { z } from 'zod';

export const CAMPAIGN_STATUSES = ['testing', 'scaled', 'killed', 'paused'] as const;
export const CampaignStatusSchema = z.enum(CAMPAIGN_STATUSES);

export const CampaignInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  status: CampaignStatusSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const CampaignSchema = CampaignInputSchema.extend({
  id: z.string().min(1),
  productId: z.string().min(1),
  status: CampaignStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CampaignInput = z.infer<typeof CampaignInputSchema>;
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
export type Campaign = z.infer<typeof CampaignSchema>;
