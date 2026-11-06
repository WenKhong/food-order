// Gemini models the assistant may use, in order of preference.
// The chat route tries the first one; if Google reports it is overloaded (503)
// or rate limited (429), it falls back to the next one.
// gemini-3.5-flash is the backup because a different model has its own quota and
// capacity, and the non-"lite" version keeps tool calling reliable.
export const MODEL_IDS = ['gemini-3.8-flash', 'gemini-3.5-flash'] as const;

export type ModelId = (typeof MODEL_IDS)[number];
