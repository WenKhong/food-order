'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

// A submit button for one status change. It disables itself while its form's
// Server Action runs (so a change can't be sent twice), and can ask for
// confirmation first (used for cancelling, which can't be undone).
export function StatusButton({
  children,
  variant = 'default',
  confirmMessage,
}: {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'destructive';
  confirmMessage?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant={variant}
      disabled={pending}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {pending ? 'Saving…' : children}
    </Button>
  );
}
