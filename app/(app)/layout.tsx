'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signOutUser } from '@/lib/firebase/auth';
import { useUser } from '@/hooks/useUser';
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user, loading } = useUser();
  const router = useRouter();
  useAuthBootstrap();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

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

  return (
    <div className="flex min-h-svh bg-bg">
      <aside className="flex w-56 flex-col justify-between border-r border-border bg-surface p-4">
        <div className="space-y-2">
          <div className="px-2 py-3 text-h3 font-semibold text-text">AdTestLab</div>
          <nav className="flex flex-col gap-1">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-2 text-body text-text-muted transition-colors hover:bg-elevated hover:text-text"
            >
              Products
            </Link>
          </nav>
        </div>
        <Button variant="ghost" onClick={handleSignOut} className="justify-start">
          Sign out
        </Button>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
