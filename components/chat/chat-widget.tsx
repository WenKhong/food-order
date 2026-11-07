'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageCircleIcon, SendIcon, SquareIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toOrderLines } from '@/lib/cart';
import { addToCart, useCart } from '@/lib/cart-store';
import { chatActions } from '@/lib/chat/actions';
import type { ChatMessage } from '@/lib/chat/types';
import { Markdown } from './markdown';
import { ToolStatus } from './tool-status';

const transport = new DefaultChatTransport<ChatMessage>({ api: '/api/chat' });
const MAX_CHARS = 1000; // the API rejects longer messages
const STARTERS = ["What's not spicy?", 'Any vegetarian pizzas?', 'Something under RM5', 'Ada pizza halal?', '有什么推荐的吗？'];

// The assistant, on every customer page (it lives in the (shop) layout, so the
// conversation survives navigation). It can add to the cart and open checkout,
// but placing the order is always the customer's own click there.
export function ChatWidget() {
  const router = useRouter();
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const applied = useRef(new Set<string>());
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, regenerate, stop, status, error, setMessages, clearError } = useChat<ChatMessage>({
    transport,
    // When a reply finishes, apply what the server approved, once per tool call:
    // add to the cart in this browser, or go to checkout to confirm the order.
    onFinish: ({ message }) => {
      for (const action of chatActions(message)) {
        if (applied.current.has(action.toolCallId)) continue;
        applied.current.add(action.toolCallId);
        if (action.type === 'add_to_cart') {
          addToCart(action.item, action.qty, action.notes);
        } else {
          setOpen(false);
          router.push('/checkout');
        }
      }
    },
  });

  const busy = status === 'submitted' || status === 'streaming';

  // Keep the newest message in view while replies stream in.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, status]);

  // The cart is read when each request is sent (a hook-level body would be stale).
  const withCart = () => ({ body: { cart: toOrderLines(cart) } });

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    void sendMessage({ text: trimmed }, withCart());
    setInput('');
  }

  function startOver() {
    stop();
    clearError();
    setMessages([]);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size="lg" className="fixed right-4 bottom-4 z-30 rounded-full shadow-lg" />}>
        <MessageCircleIcon data-icon="inline-start" />
        Ask our assistant
      </SheetTrigger>

      <SheetContent initialFocus={inputRef} className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Ask our assistant</SheetTitle>
          <SheetDescription>
            Menu questions, recommendations and help with your cart. It can&apos;t place orders: you confirm
            those at checkout.
          </SheetDescription>
          {messages.length > 0 && (
            <Button variant="link" size="sm" className="self-start px-0" onClick={startOver}>
              New chat
            </Button>
          )}
        </SheetHeader>

        <div role="log" aria-label="Conversation" aria-busy={busy} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {messages.length === 0 && <Welcome onPick={send} />}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {waitingForText(messages, busy) && <p className="text-sm text-muted-foreground">Thinking…</p>}
          {error && (
            <div role="alert" className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p>Assistant is busy, please try again.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void regenerate(withCart())}>
                  Try again
                </Button>
                <Button size="sm" variant="outline" onClick={startOver}>
                  New chat
                </Button>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
          className="flex gap-2 border-t p-3"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={MAX_CHARS}
            placeholder="Ask about the menu…"
            aria-label="Message"
          />
          {busy ? (
            <Button type="button" variant="outline" size="icon" aria-label="Stop" onClick={() => stop()}>
              <SquareIcon />
            </Button>
          ) : (
            <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim()}>
              <SendIcon />
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Welcome({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Hi! Ask me about the menu, or let me add things to your cart. I can reply in English, Bahasa Melayu
        and 中文.
      </p>
      <div className="flex flex-wrap gap-2">
        {STARTERS.map((text) => (
          <Button key={text} variant="outline" size="sm" onClick={() => onPick(text)}>
            {text}
          </Button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const fromCustomer = message.role === 'user';
  return (
    <div className={cn('flex flex-col gap-1.5', fromCustomer ? 'items-end' : 'items-start')}>
      {message.parts.map((part, index) => {
        if (part.type !== 'text') return <ToolStatus key={index} part={part} />;
        if (!part.text.trim()) return null;
        return fromCustomer ? (
          <p key={index} className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
            {part.text}
          </p>
        ) : (
          <div key={index} className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
            <Markdown text={part.text} />
          </div>
        );
      })}
    </div>
  );
}

// True while a reply is on its way but nothing new is showing yet: before the
// first word, or between a finished tool call and the next step.
function waitingForText(messages: ChatMessage[], busy: boolean) {
  if (!busy) return false;
  const last = messages.at(-1);
  if (!last || last.role === 'user') return true;
  const part = last.parts.at(-1);
  if (!part) return true;
  if (part.type === 'text') return part.text.length === 0;
  if ('state' in part) return part.state === 'output-available' || part.state === 'output-error';
  return true;
}
