'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useProduct } from '@/hooks/useProduct';
import { useCampaign } from '@/hooks/useCampaign';
import { useAdset } from '@/hooks/useAdset';

interface Crumb {
  label: string;
  href?: string;
}

/**
 * Path-driven breadcrumbs for the campaign-layer routes. We parse the
 * pathname into product/campaign/adset IDs, fetch live names, and render
 * a flex strip. Hidden on the dashboard root and on auth routes.
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const productId =
    segments[0] === 'products' && segments[1] ? segments[1] : undefined;
  const campaignId =
    segments[2] === 'campaigns' && segments[3] && segments[3] !== 'new'
      ? segments[3]
      : undefined;
  const adsetId =
    segments[4] === 'adsets' && segments[5] && segments[5] !== 'new'
      ? segments[5]
      : undefined;
  const editing = segments.at(-1) === 'edit';
  const newing =
    segments.at(-1) === 'new' &&
    (segments.at(-2) === 'campaigns' ||
      segments.at(-2) === 'adsets' ||
      segments.at(-2) === 'products');

  const { data: product } = useProduct(productId);
  const { data: campaign } = useCampaign(productId, campaignId);
  const { data: adset } = useAdset(productId, campaignId, adsetId);

  if (!productId) return null;

  const crumbs: Crumb[] = [{ label: 'Products', href: '/' }];

  if (productId) {
    crumbs.push({
      label: product?.name ?? '…',
      href: campaignId || editing || newing ? `/products/${productId}` : undefined,
    });
  }

  if (segments[2] === 'campaigns' && segments[3] === 'new') {
    crumbs.push({ label: 'New campaign' });
  } else if (campaignId) {
    crumbs.push({
      label: campaign?.name ?? '…',
      href:
        adsetId || editing || newing
          ? `/products/${productId}/campaigns/${campaignId}`
          : undefined,
    });
  }

  if (segments[4] === 'adsets' && segments[5] === 'new') {
    crumbs.push({ label: 'New adset' });
  } else if (adsetId) {
    crumbs.push({
      label: adset?.name ?? '…',
      href: editing
        ? `/products/${productId}/campaigns/${campaignId}/adsets/${adsetId}/edit`
        : undefined,
    });
  }

  if (editing && segments.at(-2) !== 'adsets' && segments.at(-2) !== 'campaigns') {
    crumbs.push({ label: 'Edit' });
  } else if (editing) {
    crumbs.push({ label: 'Edit' });
  }

  if (crumbs.length <= 1) return null;

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
