// Smoke test: can each model in the fallback list answer right now?
// Run: npx tsx --env-file=.env.local scripts/test-ai.ts
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { MODEL_IDS } from '../lib/ai/models';

async function main() {
  let working = 0;

  for (const id of MODEL_IDS) {
    const started = Date.now();
    try {
      const { text } = await generateText({
        model: google(id),
        prompt: 'Reply in Bahasa Melayu, in one short sentence: what is a margherita pizza?',
        maxRetries: 0, // report each model's own result, not a retried one
      });
      working++;
      console.log(`OK   ${id} (${Date.now() - started} ms): ${text.trim()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`FAIL ${id} (${Date.now() - started} ms): ${message}`);
    }
  }

  if (working === 0) {
    console.error('No model in MODEL_IDS answered.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
