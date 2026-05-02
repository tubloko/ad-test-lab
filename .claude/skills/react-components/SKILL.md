---
name: adtestlab-react-components
description: React and Next.js component patterns for AdTestLab — how to write components, hooks, forms, and tables. Use this skill when creating any .tsx file, building forms with react-hook-form, working with shadcn/ui, designing component props, splitting components, or when the user asks about component structure, props, or state. Read alongside the code-quality skill.
---

# AdTestLab React Component Patterns

Patterns we follow consistently. Deviation creates inconsistency, which compounds.

## Component Anatomy

```tsx
'use client'; // ONLY if the component needs interactivity (state, effects, handlers)

import { useState } from 'react';
import type { Product } from '@/types/product';
import { computeCPA } from '@/lib/metrics';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  product: Product;
  onDelete?: (id: string) => void;
}

export function ProductCard({ product, onDelete }: ProductCardProps) {
  const cpa = computeCPA(product);

  return (
    <div className="rounded-lg border p-4">
      <h3>{product.name}</h3>
      <p>CPA: ${cpa.toFixed(2)}</p>
      {onDelete && (
        <Button onClick={() => onDelete(product.id)} variant="destructive">
          Delete
        </Button>
      )}
    </div>
  );
}
```

**Always:**
- Named export, never default export (better refactoring, better grep)
- Props interface above the component
- Props interface name = `ComponentNameProps`
- `'use client'` only when needed
- Destructure props in the function signature

**Never:**
- `export default function`
- Inline anonymous function components
- Logic in the JSX return — extract to variables above
- Mixed concerns (see code-quality skill)

## Server Components vs Client Components

**Default to Server Components.** Add `'use client'` only when:
- You use hooks (`useState`, `useEffect`, custom hooks)
- You attach event handlers (`onClick`, `onChange`)
- You use browser APIs (window, localStorage)
- You use Firebase client SDK directly (most data-fetching components)

**Pattern: Server page wraps Client island**

```tsx
// app/(app)/products/[id]/page.tsx — Server Component
import { ProductDetailClient } from '@/components/ProductDetailClient';

export default function ProductPage({ params }: { params: { id: string } }) {
  return <ProductDetailClient productId={params.id} />;
}
```

```tsx
// components/ProductDetailClient.tsx — Client Component
'use client';
import { useProduct } from '@/hooks/useProduct';

export function ProductDetailClient({ productId }: { productId: string }) {
  const product = useProduct(productId);
  if (!product) return <Skeleton />;
  return <div>{product.name}</div>;
}
```

This keeps the server bundle small and isolates client interactivity.

## Hooks Pattern

Custom hooks live in `hooks/`. Each hook does ONE thing.

```ts
// hooks/useProduct.ts
import { doc } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase/config';
import { useUser } from './useUser';
import type { Product } from '@/types/product';

export function useProduct(productId: string) {
  const user = useUser();
  const ref = user ? doc(db, 'users', user.uid, 'products', productId) : null;
  const [data, loading, error] = useDocumentData(ref);
  return {
    product: data as Product | undefined,
    loading,
    error,
  };
}
```

**Rules:**
- One hook = one responsibility
- Return an object, not a tuple, when there are 3+ values
- Always handle the unauthenticated case (`user ? ... : null`)
- Don't combine fetching and mutation in one hook — split into `useProduct` and `useUpdateProduct`

## Forms with react-hook-form + zod

**Single pattern across the entire app.** Never use raw `useState` for form fields.

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductSchema, type ProductInput } from '@/types/product';

interface ProductFormProps {
  defaultValues?: Partial<ProductInput>;
  onSubmit: (data: ProductInput) => Promise<void>;
}

export function ProductForm({ defaultValues, onSubmit }: ProductFormProps) {
  const form = useForm<ProductInput>({
    resolver: zodResolver(ProductSchema),
    defaultValues,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Input {...form.register('name')} />
      {form.formState.errors.name && (
        <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
      )}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Save
      </Button>
    </form>
  );
}
```

**Validation schemas live in `types/`,** not in components. The schema is the single source of truth — types are inferred from it.

```ts
// types/product.ts
import { z } from 'zod';

export const ProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  targetCPA: z.number().positive('Must be positive'),
  defaultCOGS: z.number().nonnegative().optional(),
});

export type ProductInput = z.infer<typeof ProductSchema>;

// Full Product (with system fields)
export interface Product extends ProductInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'testing' | 'scaled' | 'killed' | 'paused';
}
```

## Tables

Use `@tanstack/react-table` for any table with sorting, filtering, or >5 rows.

**Pattern:** the column definition is data, kept beside the table component but never inside the JSX.

```tsx
// components/tables/EntriesTable.tsx
'use client';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import type { ProductEntry } from '@/types/entry';
import { computeCPA } from '@/lib/metrics';

const columns: ColumnDef<ProductEntry>[] = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'spend', header: 'Spend' },
  { accessorKey: 'orders', header: 'Orders' },
  {
    id: 'cpa',
    header: 'CPA',
    cell: ({ row }) => computeCPA(row.original).toFixed(2),
  },
];

interface EntriesTableProps {
  entries: ProductEntry[];
}

export function EntriesTable({ entries }: EntriesTableProps) {
  const table = useReactTable({
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // ... render
}
```

## Loading and Error States

Every data-fetching component handles three states explicitly:

```tsx
const { product, loading, error } = useProduct(id);

if (loading) return <Skeleton className="h-32" />;
if (error) return <ErrorMessage error={error} />;
if (!product) return <EmptyState />;

return <ProductCard product={product} />;
```

Don't be tempted to skip states. The blank-screen-while-loading bug is the most common.

## Component Composition

**Prefer composition over props proliferation.** When a component has 7+ props, you probably need composition.

❌ Bad:
```tsx
<ProductCard
  product={product}
  showHeader
  showFooter
  showDeleteButton
  showEditButton
  variant="compact"
  className="..."
/>
```

✅ Good:
```tsx
<ProductCard product={product}>
  <ProductCard.Header />
  <ProductCard.Body />
  <ProductCard.Actions>
    <DeleteButton onClick={...} />
  </ProductCard.Actions>
</ProductCard>
```

Or just split into `ProductCardCompact` and `ProductCardFull`. KISS wins.

## shadcn/ui Usage

- Components in `components/ui/` are GENERATED by shadcn CLI
- Don't edit them directly — extend by composition
- If you need a variant, create a new component in `components/` that wraps the ui primitive

```tsx
// ✅ components/ui/button.tsx (shadcn-generated, don't edit)
// ✅ components/DangerButton.tsx (your wrapper)
import { Button } from '@/components/ui/button';
export function DangerButton(props) {
  return <Button variant="destructive" {...props} />;
}
```

## File Layout in a Component File

```
1. 'use client' directive (if needed)
2. External imports
3. Internal imports (@/ alias)
4. Relative imports
5. Type definitions (Props interface, local types)
6. Constants (if any)
7. Helper functions (small, only if used in this file)
8. The main component
9. Sub-components (if not exported separately)
```

If section 7 grows beyond a couple of trivial helpers, extract to `lib/`.

## What Goes Where (Component Edition)

| You're building... | Goes in... |
|---|---|
| A page (URL route) | `app/(app)/.../page.tsx` |
| A page-specific UI block, used once | Inline in the page, OR same folder as the page |
| A reusable UI piece | `components/` |
| A form | `components/forms/` |
| A table | `components/tables/` |
| A chart | `components/charts/` |
| Data fetching | `hooks/` (then used in component) |
| A primitive (button, input) | `components/ui/` (via shadcn) |
