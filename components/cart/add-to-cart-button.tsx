'use client';

import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MAX_QTY, type CartItem } from '@/lib/cart';
import { addToCart, useCart } from '@/lib/cart-store';

// The only interactive part of a menu card, so the only part that ships JavaScript.
export function AddToCartButton({ item, available }: { item: CartItem; available: boolean }) {
  const cart = useCart();
  const inCart = cart.find((line) => line.id === item.id)?.qty ?? 0;
  const atLimit = inCart >= MAX_QTY;

  return (
    <div className="flex w-full items-center justify-between gap-2">
      {/* Always rendered, so screen readers announce the change when it fills in */}
      <span aria-live="polite" className="text-xs text-muted-foreground">
        {inCart > 0 && `${inCart} in cart`}
      </span>
      <Button
        size="sm"
        disabled={!available || atLimit}
        onClick={() => addToCart(item)}
        aria-label={available ? `Add ${item.name} to cart` : `${item.name} is sold out`}
      >
        <PlusIcon data-icon="inline-start" />
        {atLimit ? `Max ${MAX_QTY}` : 'Add'}
      </Button>
    </div>
  );
}
