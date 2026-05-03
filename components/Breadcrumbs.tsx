'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useProduct } from '@/hooks/useProduct';
import { useCampaign } from '@/hooks/useCampaign';

interface Crumb {
  label: string;
  href?: string;
}

/**
 * Path-driven breadcrumbs. The only nested routes in the app are
 * /products/[id] and /products/[id]/campaigns/[campaignId]; everything
 * else is dialog-based. Hidden on the dashboard and auth routes.
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const productId =
    segments[0] === 'products' && segments[1] ? segments[1] : undefined;
  const campaignId =
    segments[2] === 'campaigns' && segments[3] ? segments[3] : undefined;

  const { data: product } = useProduct(productId);
  const { data: campaign } = useCampaign(productId, campaignId);

  if (!productId) return null;

  const crumbs: Crumb[] = [
    { label: 'Products', href: '/' },
    { label: product?.name ?? '…', href: `/products/${productId}` },
  ];
  if (campaignId) {
    crumbs.push({ label: campaign?.name ?? '…' });
  }

  return (
    <nav aria-label="Breadcrumb" className="text-caption text-text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {c.href && !last ? (
                <Link href={c.href} className="hover:text-text">
                  {c.label}
                </Link>
              ) : (
                <span className={last ? 'text-text' : ''}>{c.label}</span>
              )}
              {!last && <ChevronRight className="size-3 text-text-subtle" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
