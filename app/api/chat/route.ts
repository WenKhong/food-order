import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from 'ai';
import { z } from 'zod';
import { chatModel, describeAIError } from '@/lib/ai/models';
import { SYSTEM_PROMPT } from '@/lib/ai/prompt';
import { createTools } from '@/lib/ai/tools';
import { getMenu } from '@/lib/menu/queries';
import { OrderLine } from '@/lib/schemas/order';

const BUSY_MESSAGE = 'Assistant is busy, please try again.';
const MAX_MESSAGE_CHARS = 1000;

// What the chat widget sends: the conversation so far (the AI SDK's message
// format) and the current cart as ids, quantities and notes. The limits keep
// a single request small; a very long conversation should start a new chat.
const ChatRequest = z.object({
  messages: z.array(z.unknown()).min(1).max(40),
  cart: z.array(OrderLine).max(30).default([]),
});

function badRequest(message: string) {
  return Response.json({ error: 'bad_request', message }, { status: 400 });
}

// POST /api/chat streams the assistant's reply, including its tool calls.
export async function POST(request: Request) {
  const body = ChatRequest.safeParse(await request.json().catch(() => null));
  if (!body.success) return badRequest('Invalid chat request.');

  const tools = createTools({ cart: body.data.cart, loadMenu: getMenu });

  let messages;
  try {
    // Checks every message, including earlier tool calls, against the tool schemas.
    messages = await validateUIMessages({ messages: body.data.messages, tools });
  } catch {
    return badRequest('Invalid chat messages.');
  }

  const latest = messages.at(-1);
  const latestText = latest?.parts.map((part) => (part.type === 'text' ? part.text : '')).join('') ?? '';
  if (latest?.role !== 'user' || latestText.length > MAX_MESSAGE_CHARS) {
    return badRequest(`Messages must come from the customer and be at most ${MAX_MESSAGE_CHARS} characters.`);
  }

  const result = streamText({
    model: chatModel, // gemini-3.8-flash, falling back to gemini-3.5-flash
    instructions: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages, { tools, ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: isStepCount(5), // e.g. search the menu, add to cart, then reply
    maxRetries: 0, // the fallback model already handles overload; retries would add seconds of waiting
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      sendReasoning: false, // the model's internal reasoning isn't for customers
      onError: (error) => {
        // The customer only ever sees the friendly message; details stay in the server log.
        console.error('Chat failed:', describeAIError(error));
        return BUSY_MESSAGE;
      },
    }),
  });
}
