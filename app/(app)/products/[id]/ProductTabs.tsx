'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductEntriesTable } from '@/components/tables/ProductEntriesTable';
import { AdsetsTab } from './AdsetsTab';
import type { Product } from '@/types/product';
import type { Adset } from '@/types/adset';
// FIXME(refactor-1b): Product*Entry* types removed — use Campaign*Entry*. This component will likely move to a campaign route.
import type { ProductEntry, ProductEntryInput } from '@/types/entry';

interface ProductTabsProps {
  product: Product;
  entries: ProductEntry[];
  adsets: Adset[];
  adsetsLoading: boolean;
  timezone: string;
  onSaveEntry: (date: string, values: ProductEntryInput) => Promise<void>;
  onDeleteEntry: (date: string) => Promise<void>;
  onDeleteAdset: (adsetId: string) => Promise<void>;
}

export function ProductTabs({
  product,
  entries,
  adsets,
  adsetsLoading,
  timezone,
  onSaveEntry,
  onDeleteEntry,
  onDeleteAdset,
}: ProductTabsProps) {
  return (
    <Tabs defaultValue="entries" className="w-full">
      <TabsList>
        <TabsTrigger value="entries">Daily entries</TabsTrigger>
        <TabsTrigger value="adsets">Adsets</TabsTrigger>
        <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
      </TabsList>

      <TabsContent value="entries" className="pt-4">
        <ProductEntriesTable
          entries={entries}
          targetCPA={product.targetCPA}
          defaultCOGS={product.defaultCOGS}
          timezone={timezone}
          onSaveEntry={onSaveEntry}
          onDeleteEntry={onDeleteEntry}
        />
      </TabsContent>

      <TabsContent value="adsets" className="pt-4">
        <AdsetsTab
          productId={product.id}
          adsets={adsets}
          loading={adsetsLoading}
          onDelete={onDeleteAdset}
        />
      </TabsContent>

      <TabsContent value="diagnoses" className="pt-4">
        <p className="text-caption text-text-muted">
          AI diagnosis history lands in the next milestone.
        </p>
      </TabsContent>
    </Tabs>
  );
}
