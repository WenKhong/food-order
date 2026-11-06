'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { cn } from 'cn';
import { z } from 'zod';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { subtotalCents, toOrderLines, type Cart } from '@/lib/cart';
import { clearCart, removeFromCart, useCart } from '@/lib/cart-store';
import { formatRM } from '@/lib/money';
import { CheckoutDetails, Fulfilment } from '@/lib/schemas/order';
import { useHydrated } from '@/lib/use-hydrated';

type Field = 'customer_name' | 'phone' | 'address';
type FieldErrors = Partial<Record<Field, string>>;
type Problem = { kind: 'sold_out' | 'unknown_item'; itemId: string } | { kind: 'failed' };

// What POST /api/orders sends back (see app/api/orders/route.ts).
const OrderCreated = z.object({ id: z.uuid() });
const ApiError = z.object({
  error: z.string(),
  itemId: z.string().optional(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
});

// zod returns a list of messages per field; the form shows the first one.
function firstErrors(fields: Partial<Record<string, string[]>>): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of ['customer_name', 'phone', 'address'] as const) {
    const message = fields[field]?.[0];
    if (message) errors[field] = message;
  }
  return errors;
}

// The only place an order is placed: the customer's own click on "Place order".
export function CheckoutForm() {
  const hydrated = useHydrated();
  const cart = useCart();
  const router = useRouter();
  const [fulfilment, setFulfilment] = useState<Fulfilment>('pickup');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);
  // A ref, not state: it changes immediately, so a fast double click can't send
  // the order twice before React re-renders the button as disabled.
  const inFlight = useRef(false);

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    const form = new FormData(event.currentTarget);
    const details = {
      customer_name: String(form.get('customer_name') ?? ''),
      phone: String(form.get('phone') ?? ''),
      fulfilment,
      address: fulfilment === 'delivery' ? String(form.get('address') ?? '') : undefined,
    };

    // Same rules as the server, checked here first for instant feedback.
    const checked = CheckoutDetails.safeParse(details);
    if (!checked.success) {
      setErrors(firstErrors(z.flattenError(checked.error).fieldErrors));
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setErrors({});
    setProblem(null);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // Only ids, quantities and notes: the server prices the order itself.
        body: JSON.stringify({ ...details, items: toOrderLines(cart) }),
      });
      const body: unknown = await response.json().catch(() => null);

      if (response.status === 201) {
        const { id } = OrderCreated.parse(body);
        setPlaced(true);
        clearCart();
        router.push(`/orders/${id}`);
        return; // stay locked: we're leaving the page
      }

      const failure = ApiError.safeParse(body);
      if (failure.success && failure.data.error === 'validation') {
        setErrors(firstErrors(failure.data.fields ?? {}));
      } else if (
        failure.success &&
        (failure.data.error === 'sold_out' || failure.data.error === 'unknown_item') &&
        failure.data.itemId
      ) {
        setProblem({ kind: failure.data.error, itemId: failure.data.itemId });
      } else {
        setProblem({ kind: 'failed' });
      }
    } catch {
      setProblem({ kind: 'failed' });
    }
    inFlight.current = false;
    setSubmitting(false);
  }

  // Ties an input to its label and error message for screen readers, and drops
  // the field's error as soon as the customer edits it (it's re-checked on submit).
  function fieldProps(field: Field) {
    return {
      id: field,
      name: field,
      'aria-invalid': errors[field] ? true : undefined,
      'aria-describedby': errors[field] ? `${field}-error` : undefined,
      onChange: () => setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current)),
    };
  }

  if (!hydrated) return <CheckoutSkeleton />;
  if (placed) {
    return (
      <p role="status" className="text-muted-foreground">
        Order placed! Taking you to your order…
      </p>
    );
  }
  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>
          Browse the menu
        </Link>
      </div>
    );
  }

  const problemItem =
    problem && problem.kind !== 'failed'
      ? (cart.find((line) => line.id === problem.itemId)?.name ?? 'An item')
      : null;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_18rem]">
      <OrderSummary cart={cart} className="md:order-last" />

      <form noValidate onSubmit={placeOrder} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="customer_name">Name</Label>
          <Input {...fieldProps('customer_name')} autoComplete="name" maxLength={80} />
          <FieldError id="customer_name-error" message={errors.customer_name} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Mobile number</Label>
          <Input
            {...fieldProps('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="012-345 6789"
          />
          <FieldError id="phone-error" message={errors.phone} />
        </div>

        <div className="flex flex-col gap-2">
          <p id="fulfilment-label" className="text-sm font-medium">
            Pickup or delivery?
          </p>
          <RadioGroup
            aria-labelledby="fulfilment-label"
            value={fulfilment}
            onValueChange={(value) => {
              const parsed = Fulfilment.safeParse(value);
              if (parsed.success) setFulfilment(parsed.data);
            }}
            className="grid-cols-2"
          >
            <FulfilmentOption value="pickup" title="Pickup" hint="Collect at the counter" />
            <FulfilmentOption value="delivery" title="Delivery" hint="To your address" />
          </RadioGroup>
        </div>

        {fulfilment === 'delivery' && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Delivery address</Label>
            <Textarea
              {...fieldProps('address')}
              autoComplete="street-address"
              maxLength={300}
              rows={3}
              placeholder="Unit, street, area, postcode"
            />
            <FieldError id="address-error" message={errors.address} />
          </div>
        )}

        {problem && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
          >
            {problem.kind === 'failed' ? (
              <p>We couldn&apos;t place your order. Please try again.</p>
            ) : (
              <>
                <p>
                  {problemItem} {problem.kind === 'sold_out' ? 'just sold out' : 'is no longer on the menu'}.
                  Remove it to continue.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="self-start"
                  onClick={() => {
                    removeFromCart(problem.itemId);
                    setProblem(null);
                  }}
                >
                  Remove it
                </Button>
              </>
            )}
          </div>
        )}

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Placing your order…' : 'Place order'}
        </Button>
        <p className="text-xs text-muted-foreground">You pay when you collect or receive your order.</p>
      </form>
    </div>
  );
}

function FulfilmentOption({ value, title, hint }: { value: Fulfilment; title: string; hint: string }) {
  const id = `fulfilment-${value}`;
  return (
    <Label htmlFor={id} className="items-start rounded-lg border p-3 has-data-checked:border-primary">
      <RadioGroupItem id={id} value={value} className="mt-0.5" />
      <span className="flex flex-col gap-1">
        {title}
        <span className="text-xs font-normal text-muted-foreground">{hint}</span>
      </span>
    </Label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

function OrderSummary({ cart, className }: { cart: Cart; className?: string }) {
  return (
    <section aria-labelledby="summary-heading" className={cn('flex h-fit flex-col gap-3 rounded-xl border p-4', className)}>
      <h2 id="summary-heading" className="font-medium">
        Your order
      </h2>
      <ul className="flex flex-col gap-2 text-sm">
        {cart.map((line) => (
          <li key={line.id} className="flex justify-between gap-3">
            <span>
              {line.qty} × {line.name}
              {line.notes?.trim() && (
                <span className="block text-xs text-muted-foreground">Note: {line.notes.trim()}</span>
              )}
            </span>
            <span className="tabular-nums">{formatRM(line.price_cents * line.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t pt-3 font-medium">
        <span>Estimated total</span>
        <span className="tabular-nums">{formatRM(subtotalCents(cart))}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        The final total is worked out from our menu prices when you place the order.
      </p>
    </section>
  );
}

function CheckoutSkeleton() {
  return (
    <div role="status" className="grid gap-8 md:grid-cols-[1fr_18rem]">
      <span className="sr-only">Loading your cart…</span>
      <Skeleton className="h-40 rounded-xl md:order-last" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-20" />
        <Skeleton className="h-10" />
      </div>
    </div>
  );
}
