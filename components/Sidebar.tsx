'use client';

import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  LogOut,
  Moon,
  Pin,
  PinOff,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from 'firebase/auth';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSidebarPin } from '@/hooks/useSidebarPin';
import { usePointerCoarse } from '@/hooks/usePointerCoarse';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const HOVER_LEAVE_DELAY_MS = 300;

interface SidebarProps {
  user: User;
  onSignOut: () => void;
}

export function Sidebar({ user, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const { pinned, togglePin, mounted } = useSidebarPin();
  const coarse = usePointerCoarse();
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [animate, setAnimate] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mounted) return;
    const id = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(id);
  }, [mounted]);

  useEffect(
    () => () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    },
    []
  );

  const interactive = !pinned && !coarse;
  const expanded = pinned || (interactive && (hovering || focused));
  const floating = interactive && (hovering || focused);

  const handleEnter = () => {
    if (!interactive) return;
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    setHovering(true);
  };

  const handleLeave = () => {
    if (!interactive) return;
    leaveTimer.current = setTimeout(() => setHovering(false), HOVER_LEAVE_DELAY_MS);
  };

  const handleFocusCapture = () => {
    if (!interactive) return;
    setFocused(true);
  };

  const handleBlurCapture = (e: React.FocusEvent<HTMLElement>) => {
    if (!interactive) return;
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setFocused(false);
  };

  const handleTogglePin = () => {
    // When unpinning via a click inside the sidebar, the cursor is still over
    // the panel — treat that as hovering so labels stay visible until the user
    // moves the mouse out and the leave timer fires.
    if (pinned) setHovering(true);
    togglePin();
  };

  return (
    <TooltipProvider delay={500}>
      <div
        className={cn(
          'relative hidden shrink-0 md:block',
          animate && 'transition-[width] duration-200 ease-out'
        )}
        style={{
          width: pinned
            ? 'var(--sidebar-expanded-width)'
            : 'var(--sidebar-rail-width)',
        }}
      >
        <aside
          className={cn(
            'top-0 flex h-svh flex-col justify-between border-r border-border-subtle bg-surface',
            animate && 'transition-[width] duration-200 ease-out',
            floating ? 'absolute left-0 z-30 shadow-md' : 'sticky',
            expanded
              ? 'w-[var(--sidebar-expanded-width)]'
              : 'w-[var(--sidebar-rail-width)]'
          )}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          onFocusCapture={handleFocusCapture}
          onBlurCapture={handleBlurCapture}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <SidebarHeader expanded={expanded} animate={animate} />
            <SidebarNav pathname={pathname} expanded={expanded} animate={animate} />
          </div>
          <div className="flex flex-col gap-1 border-t border-border-subtle p-2">
            <ThemeRow expanded={expanded} animate={animate} />
            <PinButton
              pinned={pinned}
              expanded={expanded}
              animate={animate}
              onTogglePin={handleTogglePin}
            />
            <UserRow user={user} expanded={expanded} animate={animate} />
            <SignOutButton
              expanded={expanded}
              animate={animate}
              onSignOut={onSignOut}
            />
          </div>
        </aside>
      </div>
    </TooltipProvider>
  );
}

function SidebarHeader({ expanded, animate }: { expanded: boolean; animate: boolean }) {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-border-subtle px-3">
      <Link
        href="/"
        aria-label="AdTestLab home"
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-primary"
      >
        <LayoutDashboard className="size-5" />
      </Link>
      <span
        aria-hidden={!expanded}
        className={cn(
          'min-w-0 flex-1 truncate text-subheading font-semibold text-text',
          animate && 'transition-opacity duration-150 ease-out delay-[50ms]',
          expanded ? 'opacity-100' : 'opacity-0'
        )}
      >
        AdTestLab
      </span>
    </div>
  );
}

interface SidebarNavProps {
  pathname: string;
  expanded: boolean;
  animate: boolean;
}

function SidebarNav({ pathname, expanded, animate }: SidebarNavProps) {
  return (
    <nav className="flex flex-col gap-1 p-2">
      <NavItem
        href="/"
        label="Products"
        icon={LayoutDashboard}
        active={pathname === '/'}
        expanded={expanded}
        animate={animate}
      />
    </nav>
  );
}

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  expanded: boolean;
  animate: boolean;
}

function NavItem({ href, label, icon: Icon, active, expanded, animate }: NavItemProps) {
  const link = (
    <Link
      href={href}
      aria-label={expanded ? undefined : label}
      className={cn(SIDEBAR_ITEM_BASE, ITEM_INTERACTIVE, active && ITEM_ACTIVE)}
    >
      <Icon className="size-5 shrink-0" />
      <ItemLabel expanded={expanded} animate={animate}>
        {label}
      </ItemLabel>
    </Link>
  );

  if (expanded) return link;
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function ThemeRow({ expanded, animate }: { expanded: boolean; animate: boolean }) {
  const { theme, toggle, mounted } = useTheme();

  if (!mounted) {
    return <div className="h-10" aria-hidden />;
  }

  const Icon = theme === 'dark' ? Sun : Moon;
  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
  const button = (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className={cn(SIDEBAR_ITEM_BASE, ITEM_INTERACTIVE)}
    >
      <Icon className="size-5 shrink-0" />
      <ItemLabel expanded={expanded} animate={animate}>
        {label}
      </ItemLabel>
    </button>
  );

  if (expanded) return button;
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

interface PinButtonProps {
  pinned: boolean;
  expanded: boolean;
  animate: boolean;
  onTogglePin: () => void;
}

function PinButton({ pinned, expanded, animate, onTogglePin }: PinButtonProps) {
  const Icon = pinned ? PinOff : Pin;
  const label = pinned ? 'Unpin sidebar' : 'Pin sidebar';
  const button = (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pinned}
      onClick={onTogglePin}
      className={cn(SIDEBAR_ITEM_BASE, ITEM_INTERACTIVE)}
    >
      <Icon className="size-5 shrink-0" />
      <ItemLabel expanded={expanded} animate={animate}>
        {label}
      </ItemLabel>
    </button>
  );

  if (expanded) return button;
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

interface UserRowProps {
  user: User;
  expanded: boolean;
  animate: boolean;
}

function UserRow({ user, expanded, animate }: UserRowProps) {
  const display = user.displayName ?? user.email ?? 'You';
  const initial = getInitial(user.displayName, user.email);

  return (
    <div className={cn(SIDEBAR_ITEM_BASE, 'cursor-default')}>
      <div
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-elevated text-caption font-medium leading-none text-text"
      >
        {initial ?? <UserIcon className="size-3" />}
      </div>
      <div
        aria-hidden={!expanded}
        className={cn(
          'min-w-0 flex-1',
          animate && 'transition-opacity duration-150 ease-out delay-[50ms]',
          expanded ? 'opacity-100' : 'opacity-0'
        )}
      >
        <p className="truncate text-caption text-text">{display}</p>
        {user.displayName && user.email && (
          <p className="truncate text-caption text-text-subtle">{user.email}</p>
        )}
      </div>
    </div>
  );
}

interface SignOutButtonProps {
  expanded: boolean;
  animate: boolean;
  onSignOut: () => void;
}

function SignOutButton({ expanded, animate, onSignOut }: SignOutButtonProps) {
  const button = (
    <button
      type="button"
      onClick={onSignOut}
      aria-label="Sign out"
      className={cn(SIDEBAR_ITEM_BASE, ITEM_INTERACTIVE)}
    >
      <LogOut className="size-5 shrink-0" />
      <ItemLabel expanded={expanded} animate={animate}>
        Sign out
      </ItemLabel>
    </button>
  );

  if (expanded) return button;
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right">Sign out</TooltipContent>
    </Tooltip>
  );
}

function ItemLabel({
  expanded,
  animate,
  children,
}: {
  expanded: boolean;
  animate: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'min-w-0 truncate text-body',
        animate && 'transition-opacity duration-150 ease-out delay-[50ms]',
        expanded ? 'opacity-100' : 'opacity-0'
      )}
    >
      {children}
    </span>
  );
}

const SIDEBAR_ITEM_BASE =
  'flex h-10 w-full items-center gap-3 rounded-md px-3 text-body';
const ITEM_INTERACTIVE =
  'text-text-muted transition-colors hover:bg-elevated hover:text-text';
const ITEM_ACTIVE = 'bg-elevated text-text';

function getInitial(displayName: string | null, email: string | null): string | null {
  const source = displayName ?? email;
  if (!source) return null;
  const ch = source.trim().charAt(0).toUpperCase();
  return ch || null;
}
