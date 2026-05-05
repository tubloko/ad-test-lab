'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BmcIcon } from '@/components/icons/BmcIcon';
import { cn } from '@/lib/utils';

const BMC_USERNAME = process.env.NEXT_PUBLIC_BMC_USERNAME;
const LABEL = 'Buy me a coffee';

const ITEM_CLASS =
  'flex h-10 w-full items-center gap-3 rounded-md px-3 text-body text-text-muted transition-colors hover:bg-elevated hover:text-text';

interface SidebarBmcLinkProps {
  expanded: boolean;
  animate: boolean;
}

export function SidebarBmcLink({ expanded, animate }: SidebarBmcLinkProps) {
  if (!BMC_USERNAME) return null;

  const link = (
    <a
      href={`https://buymeacoffee.com/${BMC_USERNAME}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={expanded ? undefined : LABEL}
      className={ITEM_CLASS}
    >
      <BmcIcon className="size-5 shrink-0" />
      <span
        className={cn(
          'min-w-0 truncate text-body',
          animate && 'transition-opacity duration-150 ease-out delay-[50ms]',
          expanded ? 'opacity-100' : 'opacity-0',
        )}
      >
        {LABEL}
      </span>
    </a>
  );

  if (expanded) return link;
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{LABEL}</TooltipContent>
    </Tooltip>
  );
}
