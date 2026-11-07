import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APICallError, generateText, simulateReadableStream, streamText } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { shouldFallBack, withFallback } from './models';

// Fake models: no network, no API key. Each one either answers or fails with an
// HTTP status, the way the Google provider reports errors.
const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

function answers(text: string) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop', raw: undefined },
      usage,
      warnings: [],
    }),
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'text-start', id: 't' },
          { type: 'text-delta', id: 't', delta: text },
          { type: 'text-end', id: 't' },
          { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
        ],
      }),
    }),
  });
}

function failsWith(statusCode: number) {
  const error = () =>
    new APICallError({ message: `HTTP ${statusCode}`, url: 'https://example.test', requestBodyValues: {}, statusCode });
  return new MockLanguageModelV4({
    doGenerate: async () => {
      throw error();
    },
    doStream: async () => {
      throw error();
    },
  });
}

test('when the first model works, the backup is never called', async () => {
  const backup = answers('backup');
  const { text } = await generateText({ model: withFallback([answers('first'), backup]), prompt: 'hi', maxRetries: 0 });
  assert.equal(text, 'first');
  assert.equal(backup.doGenerateCalls.length, 0);
});

test('503 overloaded: the backup answers', async () => {
  const { text } = await generateText({
    model: withFallback([failsWith(503), answers('from backup')]),
    prompt: 'hi',
    maxRetries: 0,
  });
  assert.equal(text, 'from backup');
});

test('429 rate limited: the backup answers', async () => {
  const { text } = await generateText({
    model: withFallback([failsWith(429), answers('from backup')]),
    prompt: 'hi',
    maxRetries: 0,
  });
  assert.equal(text, 'from backup');
});

test('streaming (what the chat uses) falls back too', async () => {
  const result = streamText({ model: withFallback([failsWith(503), answers('streamed by backup')]), prompt: 'hi', maxRetries: 0 });
  assert.equal(await result.text, 'streamed by backup');
});

test('400 bad request: no fallback, the backup is never called', async () => {
  const backup = answers('should not be used');
  await assert.rejects(generateText({ model: withFallback([failsWith(400), backup]), prompt: 'hi', maxRetries: 0 }));
  assert.equal(backup.doGenerateCalls.length, 0);
});

test('every model overloaded: the error is thrown (the route turns it into "busy")', async () => {
  await assert.rejects(
    generateText({ model: withFallback([failsWith(503), failsWith(503)]), prompt: 'hi', maxRetries: 0 }),
    (error) => APICallError.isInstance(error) && error.statusCode === 503,
  );
});

test('only temporary provider errors trigger a fallback', () => {
  const api = (statusCode: number) =>
    new APICallError({ message: 'x', url: 'https://example.test', requestBodyValues: {}, statusCode });
  assert.equal(shouldFallBack(api(503)), true);
  assert.equal(shouldFallBack(api(429)), true);
  assert.equal(shouldFallBack(api(500)), true);
  assert.equal(shouldFallBack(api(400)), false);
  assert.equal(shouldFallBack(api(403)), false);
  assert.equal(shouldFallBack(new Error('something else')), false);
});
