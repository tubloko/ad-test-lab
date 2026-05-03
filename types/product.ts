import { z } from 'zod';

export const PRODUCT_STATUSES = ['testing', 'scaled', 'killed', 'paused'] as const;
export const ProductStatusSchema = z.enum(PRODUCT_STATUSES);

export const ProductInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetCPA: z.number().positive(),
  defaultCOGS: z.number().min(0).optional(),
  status: ProductStatusSchema.optional(),
  notes: z.string().max(2000).optional(),
  transactionFeePercent: z.number().min(0).max(100).optional(),
  transactionFeeFixed: z.number().min(0).optional(),
  shippingCost: z.number().min(0).optional(),
  refundRate: z.number().min(0).max(100).optional(),
});

export const ProductSchema = ProductInputSchema.extend({
  id: z.string().min(1),
  status: ProductStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProductInput = z.infer<typeof ProductInputSchema>;
export type ProductStatus = z.infer<typeof ProductStatusSchema>;
export type Product = z.infer<typeof ProductSchema>;

export interface ProductFees {
  transactionFeePercent?: number;
  transactionFeeFixed?: number;
  shippingCost?: number;
  refundRate?: number;
}
