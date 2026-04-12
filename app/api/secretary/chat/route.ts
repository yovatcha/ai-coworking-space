import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
});

const SECRETARY_PROMPT = `You are a Secretary NPC in a 2D pixel co-working space.
Your job is to help users track tasks, summarize work progress, and give reminders.
Be concise, helpful, and friendly. Keep responses short (2-3 sentences max).
You can speak Thai or English depending on the user.`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openrouter.chat('anthropic/claude-haiku-4.5'),
    system: SECRETARY_PROMPT,
    messages,
  });

  return result.toTextStreamResponse();
}
