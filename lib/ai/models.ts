import { google } from '@ai-sdk/google';
import { APICallError, wrapLanguageModel } from 'ai';

// Gemini models the assistant may use, in order of preference.
// The chat route tries the first one; if Google reports it is overloaded (503)
// or rate limited (429), it falls back to the next one.
// gemini-3.5-flash is the backup because a different model has its own quota and
// capacity, and the non-"lite" version keeps tool calling reliable.
export const MODEL_IDS = ['gemini-3.8-flash', 'gemini-3.5-flash'] as const;

export type ModelId = (typeof MODEL_IDS)[number];

// The AI SDK's language model type, taken from wrapLanguageModel's return type
// so we don't import it from a package that isn't one of our dependencies.
type Model = ReturnType<typeof wrapLanguageModel>;

// Worth trying another model: timeouts, rate limits (429) and overload or other
// server errors (5xx). The SDK marks those `isRetryable`. Not worth it: a bad
// request or a bad API key, which every model would reject the same way.
export function shouldFallBack(error: unknown): boolean {
  return APICallError.isInstance(error) && error.isRetryable;
}

// A short description for logs. Never log the whole error: an APICallError
// carries the request body, i.e. the customer's chat messages.
export function describeAIError(error: unknown): string {
  if (APICallError.isInstance(error)) return `HTTP ${error.statusCode ?? '?'}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}

// Combines several models into one that tries them in order. It only switches
// when a model refuses the request before producing any output, so a reply is
// never half from one model and half from another. If every model fails, the
// last error is thrown and the chat route shows "Assistant is busy".
export function withFallback(models: Model[]): Model {
  const [first, ...backups] = models;

  async function tryBackups<T>(firstError: unknown, call: (model: Model) => PromiseLike<T>): Promise<T> {
    let lastError = firstError;
    for (const model of backups) {
      if (!shouldFallBack(lastError)) break;
      console.warn(`AI model failed (${describeAIError(lastError)}); falling back to ${model.modelId}`);
      try {
        return await call(model);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  return wrapLanguageModel({
    model: first,
    middleware: {
      wrapGenerate: async ({ doGenerate, params }) => {
        try {
          return await doGenerate();
        } catch (error) {
          return tryBackups(error, (model) => model.doGenerate(params));
        }
      },
      wrapStream: async ({ doStream, params }) => {
        try {
          return await doStream();
        } catch (error) {
          return tryBackups(error, (model) => model.doStream(params));
        }
      },
    },
  });
}

// The model the chat uses: gemini-3.8-flash, falling back to gemini-3.5-flash.
export const chatModel = withFallback(MODEL_IDS.map((id) => google(id)));
