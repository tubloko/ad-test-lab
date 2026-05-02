'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { useLogin } from '@/hooks/useLogin';

const LoginFormSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof LoginFormSchema>;

export default function LoginPage() {
  const { loading, error, signInWithGoogle, signInWithEmail } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = ({ email, password }: LoginFormValues) =>
    signInWithEmail(email, password);

  return (
    <main className="flex min-h-svh items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-surface p-8">
        <div className="space-y-1 text-center">
          <h1 className="text-h2 font-semibold text-text">AdTestLab</h1>
          <p className="text-caption text-text-muted">
            Sign in to manage your ad tests
          </p>
        </div>

        <Button
          onClick={signInWithGoogle}
          variant="secondary"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          <GoogleIcon className="size-5" />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-caption text-text-muted">
          <span className="h-px flex-1 bg-border" />
          <span>or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-caption text-danger-text">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-caption text-danger-text">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {error && (
          <p className="text-center text-caption text-danger-text" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
