'use client';

import { useActionState } from 'react';
import { login, type LoginState } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: LoginState = {};

export function LoginForm() {
  // useActionState runs the Server Action and keeps its result (the error message)
  // and whether it is still running.
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-xl border p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Staff sign-in</h1>
        <p className="text-sm text-muted-foreground">Enter the admin password to see and update orders.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? 'password-error' : undefined}
        />
        {state.error && (
          <p id="password-error" role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
