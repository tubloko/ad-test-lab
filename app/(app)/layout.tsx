'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { signOutUser } from '@/lib/firebase/auth';
import { useUser } from '@/hooks/useUser';
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  useAuthBootstrap();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-text-muted">
        Loading…
      </div>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => {
    await signOutUser();
    router.replace('/login');
  };

  const navLinks = (
    <nav className="flex flex-col gap-1">
      <Link
        href="/"
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-body transition-colors',
          pathname === '/'
            ? 'bg-elevated text-text'
            : 'text-text-muted hover:bg-elevated hover:text-text'
        )}
      >
        <LayoutDashboard className="size-4" />
        Products
      </Link>
    </nav>
  );

  const userMenu = (
    <div className="space-y-2">
      <div className="rounded-md bg-elevated px-3 py-2">
        <p className="truncate text-caption text-text">
          {user.displayName ?? user.email ?? 'You'}
        </p>
        {user.displayName && user.email && (
          <p className="truncate text-caption text-text-subtle">{user.email}</p>
        )}
      </div>
      <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start">
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-svh flex-col bg-bg md:flex-row">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Link href="/" className="text-subheading font-semibold text-text">
          AdTestLab
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-b border-border bg-surface p-4 md:hidden">
          <div className="space-y-4">
            {navLinks}
            {userMenu}
          </div>
        </div>
      )}

      {/* Desktop sidebar — sticky so the user menu and sign-out stay
          visible while the main column scrolls. */}
      <aside className="hidden md:flex md:sticky md:top-0 md:h-svh w-56 shrink-0 flex-col justify-between border-r border-border bg-surface p-4">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between px-2">
            <Link href="/" className="text-subheading font-semibold text-text">
              AdTestLab
            </Link>
            <ThemeToggle />
          </div>
          {navLinks}
        </div>
        {userMenu}
      </aside>

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto w-full max-w-6xl">
          <Breadcrumbs />
        </div>
        {children}
      </main>
    </div>
  );
}
