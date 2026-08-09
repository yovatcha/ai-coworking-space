import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { Project, Requirement } from '@prisma/client';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
});

const MODEL = 'anthropic/claude-haiku-4.5';

const SYSTEM_PROMPTS: Record<string, string> = {
  'google-bro': `You are Google Bro, an NPC in a 2D pixel co-working space who manages all Google Workspace employees.
Your employees: Sheet Bro (Google Sheets expert).
If the user asks anything about Google Sheets, spreadsheets, formulas, or sheet data — tell them to go talk to Sheet Bro who is standing nearby, and keep your answer very brief.
For all other Google products (Docs, Slides, Drive, Gmail, Meet) you handle it yourself.
Be concise, friendly. Keep responses short (2-3 sentences max).
You can speak Thai or English depending on the user.
IMPORTANT: Never use markdown formatting. No bold (**text**), no headers (#), no bullet points with *, no backticks. Plain text only.`,

  'sheet-bro': `You are Sheet Bro, an NPC in a 2D pixel co-working space and Google Bro's employee who specializes exclusively in Google Sheets.
You are an expert in formulas, pivot tables, data validation, conditional formatting, charts, IMPORTRANGE, Apps Script automation, and all things Sheets.
Be concise, practical, and friendly. Keep responses short (2-3 sentences max).
You can speak Thai or English depending on the user.
IMPORTANT: Never use markdown formatting. No bold (**text**), no headers (#), no bullet points with *, no backticks. Plain text only.`,
};

// ── Secretary team knowledge base ──────────────────────────────────────────

const MAX_CHARS = 12000;
const DOC_TRUNC_CHARS = 1500;
const REQ_CAP = 20;

function renderProject(
  p: Project,
  reqs: Requirement[],
  opts: { docChars: number; reqCap: number }
): string {
  const lines = [`[id:${p.id}] ${p.name} — ${p.description || 'no description'} (${p.status}, added by ${p.addedBy})`];
  const shown = opts.reqCap > 0 ? reqs.slice(-opts.reqCap) : reqs;
  if (reqs.length > shown.length) {
    lines.push(`  (showing last ${shown.length} of ${reqs.length} requirements)`);
  }
  shown.forEach((r, i) => lines.push(`  ${i + 1}. ${r.text} (by ${r.addedBy})`));
  if (p.docName) {
    if (opts.docChars === 0) {
      lines.push(`  Doc attached: "${p.docName}" (content omitted for space)`);
    } else {
      const doc = p.docText.length > opts.docChars
        ? p.docText.slice(0, opts.docChars) + '\n  ...(truncated)'
        : p.docText;
      lines.push(`  Doc "${p.docName}":\n${doc}`);
    }
  }
  return lines.join('\n');
}

function buildTeamContext(projects: Project[], requirements: Requirement[]): string {
  if (projects.length === 0) return 'No projects recorded yet.';

  const byProject = (p: Project) => requirements.filter((r) => r.projectId === p.id);

  // Tier down until the context fits the budget.
  const tiers = [
    { docChars: Infinity, reqCap: 0 },
    { docChars: DOC_TRUNC_CHARS, reqCap: 0 },
    { docChars: 0, reqCap: 0 },
    { docChars: 0, reqCap: REQ_CAP },
  ];
  for (const tier of tiers) {
    const out = projects.map((p) => renderProject(p, byProject(p), tier)).join('\n\n');
    if (out.length <= MAX_CHARS) return out;
  }
  // Last resort: hard truncate.
  return projects
    .map((p) => renderProject(p, byProject(p), { docChars: 0, reqCap: REQ_CAP }))
    .join('\n\n')
    .slice(0, MAX_CHARS);
}

const secretarySystem = (context: string, memberId: string) => `You are the Secretary NPC in a 2D pixel co-working space. You are the team's memory: you keep track of every product/project the team is building and its requirements.

TEAM KNOWLEDGE BASE (source of truth — answer ONLY from this):
${context}

The person talking to you is team member "${memberId}".

How you behave:
1. Questions like "what are we building" or "what are the requirements for X": answer directly from the knowledge base. If it is not in there, say you don't have that recorded and offer to note it down. Never invent projects or requirements.
2. When someone mentions a project not in the knowledge base, ask one short follow-up at a time (what is it? key requirements?), then call create_project.
3. When the user states a requirement for a project, call add_requirement immediately with the [id:N] from the knowledge base — do not ask permission. One call per distinct requirement. Skip anything already recorded.
4. After every save, ALWAYS end with a short plain-text confirmation of exactly what you saved.
Be concise and friendly (2-3 sentences outside of listing data). Speak Thai or English matching the user.
IMPORTANT: Never use markdown formatting. No bold (**text**), no headers (#), no bullet points with *, no backticks. Plain text only.`;

export async function POST(req: Request) {
  const { messages, npcId = 'secretary', memberId = 'guest' } = await req.json();

  if (npcId !== 'secretary') {
    const system = SYSTEM_PROMPTS[npcId] ?? SYSTEM_PROMPTS['google-bro'];
    const result = streamText({ model: openrouter.chat(MODEL), system, messages });
    return result.toTextStreamResponse();
  }

  // Fetch team knowledge base, failing soft (ADR 0003 / 0006).
  let context = 'DATABASE UNAVAILABLE — tell the user you cannot access project data right now.';
  try {
    const [projects, requirements] = await Promise.all([
      prisma.project.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.requirement.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);
    context = buildTeamContext(projects, requirements);
  } catch (err) {
    console.error('[secretary/chat] context fetch failed', err);
  }

  const tools = {
    create_project: tool({
      description:
        'Save a new team project/product. Use when the user names something the team is building that is not in the knowledge base.',
      inputSchema: z.object({
        name: z.string().describe('Short project name'),
        description: z.string().describe('One-sentence description of what it is. Empty string if unknown.'),
      }),
      execute: async ({ name, description }) => {
        const existing = (await prisma.project.findMany()).find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );
        if (existing) return { ok: false, error: 'already exists', projectId: existing.id };
        const p = await prisma.project.create({ data: { name, description, addedBy: memberId } });
        return { ok: true, projectId: p.id, name: p.name };
      },
    }),
    add_requirement: tool({
      description: 'Save one requirement to an existing project. Call once per distinct requirement the user states.',
      inputSchema: z.object({
        projectId: z
          .number()
          .describe('The [id:N] number from the knowledge base, or the projectId returned by create_project'),
        requirement: z.string().describe("The requirement, one sentence, in the user's language"),
      }),
      execute: async ({ projectId, requirement }) => {
        const p = await prisma.project.findUnique({ where: { id: projectId } });
        if (!p) {
          const valid = await prisma.project.findMany();
          return { ok: false, error: 'project not found', validIds: valid.map((x) => `${x.id}:${x.name}`) };
        }
        await prisma.requirement.create({ data: { projectId, text: requirement, addedBy: memberId } });
        return { ok: true, project: p.name };
      },
    }),
  };

  const result = streamText({
    model: openrouter.chat(MODEL),
    system: secretarySystem(context, memberId),
    messages,
    tools,
    stopWhen: stepCountIs(4),
  });

  return result.toTextStreamResponse();
}
