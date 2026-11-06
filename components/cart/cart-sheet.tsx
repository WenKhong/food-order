'use client';

import { MinusIcon, PlusIcon, ShoppingBagIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { itemCount, MAX_QTY, subtotalCents, type CartLine } from '@/lib/cart';
import { removeFromCart, updateNotes, updateQty, useCart } from '@/lib/cart-store';
import { formatRM } from '@/lib/money';

export function CartSheet() {
  const cart = useCart();
  const count = itemCount(cart);
  // Controlled, so following the Checkout link can also close the sheet.
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`} />}
      >
        <ShoppingBagIcon data-icon="inline-start" />
        Cart
        {count > 0 && <Badge className="tabular-nums">{count}</Badge>}
      </SheetTrigger>

      {/* Full width on phones, a side panel on bigger screens */}
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>
            {count === 0 ? 'Nothing here yet.' : `${count} ${count === 1 ? 'item' : 'items'}`}
          </SheetDescription>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm text-muted-foreground">Add something from the menu to get started.</p>
            <SheetClose render={<Button variant="outline" />}>Browse the menu</SheetClose>
          </div>
        ) : (
          <>
            <ul aria-label="Items in your cart" className="flex-1 divide-y overflow-y-auto px-4">
              {cart.map((line) => (
                <CartLineRow key={line.id} line={line} />
              ))}
            </ul>
            <SheetFooter className="border-t">
              <div className="flex items-baseline justify-between font-medium">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatRM(subtotalCents(cart))}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                This is an estimate. The final price comes from our menu when you place the order.
              </p>
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ size: 'lg' }))}
              >
                Checkout
              </Link>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CartLineRow({ line }: { line: CartLine }) {
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{line.name}</p>
          <p className="text-xs text-muted-foreground">{formatRM(line.price_cents)} each</p>
        </div>
        <p className="font-medium tabular-nums">{formatRM(line.price_cents * line.qty)}</p>
      </div>

      <div className="flex items-center gap-2">
        <div role="group" aria-label={`Quantity of ${line.name}`} className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={`One less ${line.name}`}
            disabled={line.qty <= 1}
            onClick={() => updateQty(line.id, line.qty - 1)}
          >
            <MinusIcon />
          </Button>
          <span aria-live="polite" className="w-7 text-center tabular-nums">
            {line.qty}
          </span>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={`One more ${line.name}`}
            disabled={line.qty >= MAX_QTY}
            onClick={() => updateQty(line.id, line.qty + 1)}
          >
            <PlusIcon />
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          aria-label={`Remove ${line.name}`}
          onClick={() => removeFromCart(line.id)}
        >
          <Trash2Icon data-icon="inline-start" />
          Remove
        </Button>
      </div>

      <Input
        value={line.notes ?? ''}
        onChange={(event) => updateNotes(line.id, event.target.value)}
        maxLength={200}
        placeholder="Notes, e.g. no onions"
        aria-label={`Notes for ${line.name}`}
      />
    </li>
  );
}
