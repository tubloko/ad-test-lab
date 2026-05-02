import { z } from 'zod';

export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const ProductEntryInputSchema = z.object({
  spend: z.number().min(0),
  revenue: z.number().min(0),
  orders: z.number().int().min(0),
  cogs: z.number().min(0),
  notes: z.string().max(1000).optional(),
});

export const ProductEntrySchema = ProductEntryInputSchema.extend({
  date: DateStringSchema,
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
});

export const AdsetEntrySchema = AdsetEntryInputSchema.extend({
  date: DateStringSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProductEntryInput = z.infer<typeof ProductEntryInputSchema>;
export type ProductEntry = z.infer<typeof ProductEntrySchema>;
export type AdsetEntryInput = z.infer<typeof AdsetEntryInputSchema>;
export type AdsetEntry = z.infer<typeof AdsetEntrySchema>;
export type DateString = z.infer<typeof DateStringSchema>;
