import { z } from 'zod';

export const UserPlanSchema = z.enum(['free', 'pro']);

export const UserSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(120),
  timezone: z.string().min(1).max(80),
  plan: UserPlanSchema,
  diagnosesUsedToday: z.number().int().min(0),
  diagnosesResetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;
export type UserPlan = z.infer<typeof UserPlanSchema>;
