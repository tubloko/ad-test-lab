import { z } from 'zod';

export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

/**
 * Campaign daily entry. Lives under a campaign (not a product).
 *
 * `spend` semantics:
 *   - When `spendOverride` is false (default), the stored `spend` is a
 *     cache and the displayed value is the sum of adset entries for the
 *     same date.
 *   - When `spendOverride` is true, the user has manually edited the
 *     campaign-level spend and the stored value takes precedence over
 *     the adset sum. Use clearSpendOverride() to revert to auto-fill.
 */
export const CampaignEntryInputSchema = z.object({
  spend: z.number().min(0),
  revenue: z.number().min(0),
  orders: z.number().int().min(0),
  cogs: z.number().min(0),
  spendOverride: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

export const CampaignEntrySchema = CampaignEntryInputSchema.extend({
  date: DateStringSchema,
  spendOverride: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AdsetEntryInputSchema = z.object({
  spend: z.number().min(0),
  clicks: z.number().int().min(0),
  lpv: z.number().int().min(0),
  atc: z.number().int().min(0),
  ic: z.number().int().min(0),
  purchases: z.number().int().min(0).optional(),
  /** CTR % entered by the user (clicks / impressions × 100). We don't
   *  track impressions, so this is stored as input rather than derived. */
  ctr: z.number().min(0).max(100).optional(),
});

export const AdsetEntrySchema = AdsetEntryInputSchema.extend({
  date: DateStringSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CampaignEntryInput = z.infer<typeof CampaignEntryInputSchema>;
export type CampaignEntry = z.infer<typeof CampaignEntrySchema>;
export type AdsetEntryInput = z.infer<typeof AdsetEntryInputSchema>;
export type AdsetEntry = z.infer<typeof AdsetEntrySchema>;
export type DateString = z.infer<typeof DateStringSchema>;
