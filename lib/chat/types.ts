import type { InferUITools, UIDataTypes, UIMessage } from 'ai';
import type { ChatTools } from '@/lib/ai/tools';

// A chat message whose tool parts are typed from our tools: for example, the
// output of a "tool-add_to_cart" part has exactly the shape add_to_cart returns.
// (Type-only imports: none of the server-side tool code reaches the browser.)
export type ChatMessage = UIMessage<unknown, UIDataTypes, InferUITools<ChatTools>>;
