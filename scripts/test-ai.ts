import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

async function main() {
  const { text } = await generateText({
    model: google('gemini-3.8-flash'),
    prompt: 'Reply in Bahasa Melayu: what is nasi lemak?',
  });
  console.log(text);
}
main();