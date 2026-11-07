import type { AddToCartAction } from '@/lib/ai/tools';
import type { ChatMessage } from './types';

export type ChatAction =
  | ({ toolCallId: string } & AddToCartAction)
  | { toolCallId: string; type: 'go_to_checkout' };

// The cart lives in the browser, so the server's tools can't change it. Instead
// add_to_cart and go_to_checkout return an action and the chat widget applies it.
// Only finished, successful results count: the server has already checked that
// the item exists, isn't sold out and is under the limit. Each action keeps its
// toolCallId so the widget applies it exactly once.
export function chatActions(message: ChatMessage): ChatAction[] {
  const actions: ChatAction[] = [];
  for (const part of message.parts) {
    if (part.type === 'tool-add_to_cart' && part.state === 'output-available' && part.output.ok) {
      actions.push({ toolCallId: part.toolCallId, ...part.output.action });
    } else if (part.type === 'tool-go_to_checkout' && part.state === 'output-available' && part.output.ok) {
      actions.push({ toolCallId: part.toolCallId, type: 'go_to_checkout' });
    }
  }
  return actions;
}
