import { Timestamp, type DocumentData } from 'firebase/firestore';
import type { Product } from '@/types/product';
import type { Campaign } from '@/types/campaign';
import type { Adset } from '@/types/adset';
import type { CampaignEntry, AdsetEntry } from '@/types/entry';
import type { Diagnosis } from '@/types/diagnosis';
import type { User } from '@/types/user';

type Raw = DocumentData & { id?: string };

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(0);
}

export function toUser(raw: Raw & { id?: string }): User {
  return {
    uid: raw.uid ?? raw.id ?? '',
    email: raw.email,
    displayName: raw.displayName,
    timezone: raw.timezone,
    plan: raw.plan,
    diagnosesUsedToday: raw.diagnosesUsedToday ?? 0,
    diagnosesResetDate: raw.diagnosesResetDate ?? '',
    createdAt: toDate(raw.createdAt),
  };
}

export function toProduct(raw: Raw & { id: string }): Product {
  return {
    id: raw.id,
    name: raw.name,
    targetCPA: raw.targetCPA,
    defaultCOGS: raw.defaultCOGS,
    status: raw.status,
    notes: raw.notes,
    transactionFeePercent: raw.transactionFeePercent,
    transactionFeeFixed: raw.transactionFeeFixed,
    shippingCost: raw.shippingCost,
    refundRate: raw.refundRate,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

export function toCampaign(raw: Raw & { id: string }): Campaign {
  return {
    id: raw.id,
    productId: raw.productId,
    name: raw.name,
    status: raw.status,
    notes: raw.notes,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

export function toAdset(raw: Raw & { id: string }): Adset {
  return {
    id: raw.id,
    productId: raw.productId,
    campaignId: raw.campaignId,
    name: raw.name,
    audience: raw.audience,
    funnelStage: raw.funnelStage,
    budget: raw.budget,
    status: raw.status,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

export function toCampaignEntry(raw: Raw): CampaignEntry {
  return {
    date: raw.date ?? raw.id ?? '',
    spend: raw.spend ?? 0,
    revenue: raw.revenue ?? 0,
    orders: raw.orders ?? 0,
    cogs: raw.cogs ?? 0,
    spendOverride: raw.spendOverride ?? false,
    notes: raw.notes,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

export function toAdsetEntry(raw: Raw): AdsetEntry {
  return {
    date: raw.date ?? raw.id ?? '',
    spend: raw.spend ?? 0,
    clicks: raw.clicks ?? 0,
    lpv: raw.lpv ?? 0,
    atc: raw.atc ?? 0,
    ic: raw.ic ?? 0,
    purchases: raw.purchases,
    ctr: raw.ctr,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

export function toDiagnosis(raw: Raw & { id: string }): Diagnosis {
  return {
    id: raw.id,
    productId: raw.productId,
    campaignId: raw.campaignId,
    inputHash: raw.inputHash,
    dateRange: raw.dateRange,
    ruleVerdict: raw.ruleVerdict,
    aiSummary: raw.aiSummary,
    primaryIssue: raw.primaryIssue,
    recommendedAction: raw.recommendedAction,
    confidence: raw.confidence,
    createdAt: toDate(raw.createdAt),
    expiresAt: toDate(raw.expiresAt),
  };
}
