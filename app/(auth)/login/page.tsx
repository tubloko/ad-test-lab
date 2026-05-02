'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signInWithGoogle } from '@/lib/firebase/auth';

export default function LoginPage() {
  const router = useRouter();

  const handleGoogle = async () => {
    await signInWithGoogle();
    router.push('/');
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-surface p-8">
        <div className="space-y-1 text-center">
          <h1 className="text-h2 font-semibold text-text">AdTestLab</h1>
          <p className="text-caption text-text-muted">
            Sign in to manage your ad tests
          </p>
        </div>
        <Button onClick={handleGoogle} className="w-full" size="lg">
          Sign in with Google
        </Button>
      </div>
    </main>
  );
}
