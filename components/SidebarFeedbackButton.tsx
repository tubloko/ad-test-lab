'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { cn } from '@/lib/utils';

const LABEL = 'Send feedback';

const ITEM_CLASS =
  'flex h-10 w-full items-center gap-3 rounded-md px-3 text-body text-text-muted transition-colors hover:bg-elevated hover:text-text';

interface SidebarFeedbackButtonProps {
  expanded: boolean;
  animate: boolean;
}

export function SidebarFeedbackButton({
  expanded,
  animate,
}: SidebarFeedbackButtonProps) {
  const [open, setOpen] = useState(false);

  const button = (
    <button
      type="button"
      aria-label={LABEL}
      onClick={() => setOpen(true)}
      className={ITEM_CLASS}
    >
      <MessageCircle className="size-5 shrink-0" />
      <span
        className={cn(
          'min-w-0 truncate text-body',
          animate && 'transition-opacity duration-150 ease-out delay-[50ms]',
          expanded ? 'opacity-100' : 'opacity-0',
        )}
      >
        {LABEL}
      </span>
    </button>
  );

  return (
    <>
      {expanded ? (
        button
      ) : (
        <Tooltip>
          <TooltipTrigger render={button} />
          <TooltipContent side="right">{LABEL}</TooltipContent>
        </Tooltip>
      )}
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
