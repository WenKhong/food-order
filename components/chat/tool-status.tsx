import { CheckIcon, LoaderCircleIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from 'cn';
import type { ChatMessage } from '@/lib/chat/types';

type Part = ChatMessage['parts'][number];
type AddToCartPart = Extract<Part, { type: 'tool-add_to_cart' }>;
type AddToCartRefusal = Extract<NonNullable<AddToCartPart['output']>, { ok: false }>;

// Shows what the assistant is doing ("Checking the menu…") and what its cart
// tools did ("Added 2 × Margherita to your cart"), so nothing happens unseen.
export function ToolStatus({ part }: { part: Part }) {
  switch (part.type) {
    case 'tool-search_menu':
    case 'tool-get_item':
      return isDone(part.state) ? null : <Chip busy>Checking the menu…</Chip>;
    case 'tool-view_cart':
      return isDone(part.state) ? null : <Chip busy>Checking your cart…</Chip>;
    case 'tool-add_to_cart':
      if (part.state === 'output-available') {
        return part.output.ok ? (
          <Chip tone="success">Added {part.output.added} to your cart</Chip>
        ) : (
          <Chip tone="warning">{refusalText(part.output)}</Chip>
        );
      }
      if (part.state === 'output-error') return <Chip tone="warning">Couldn&apos;t add that item</Chip>;
      return <Chip busy>Adding to your cart…</Chip>;
    case 'tool-go_to_checkout':
      if (part.state !== 'output-available') return null;
      return part.output.ok ? (
        <Chip tone="success">Taking you to checkout…</Chip>
      ) : (
        <Chip tone="warning">Your cart is empty</Chip>
      );
    default:
      return null; // text is rendered elsewhere; step markers aren't shown
  }
}

function isDone(state: string) {
  return state === 'output-available' || state === 'output-error';
}

function refusalText(output: AddToCartRefusal) {
  switch (output.reason) {
    case 'sold_out':
      return `${output.name} is sold out`;
    case 'quantity_limit':
      return `You can have at most ${output.max} ${output.name} per order`;
    case 'not_on_menu':
      return "That isn't on our menu";
  }
}

function Chip({ children, busy, tone }: { children: ReactNode; busy?: boolean; tone?: 'success' | 'warning' }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
        tone === 'success' && 'border-green-600/30 bg-green-50 text-green-800',
        tone === 'warning' && 'border-amber-600/30 bg-amber-50 text-amber-900',
        !tone && 'text-muted-foreground',
      )}
    >
      {busy && <LoaderCircleIcon aria-hidden="true" className="size-3 animate-spin" />}
      {tone === 'success' && <CheckIcon aria-hidden="true" className="size-3" />}
      {children}
    </span>
  );
}
