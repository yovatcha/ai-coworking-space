# 0006 — Secretary team memory: Project rows + tool calling over a plain text stream

**Status:** Accepted

## Context

Every agent so far only *reads* data — sheet-bro injects spreadsheet context
into its prompt ([0003](0003-npc-agent-pattern.md)). The Secretary needs to
also *write*: capture the team's projects and requirements from conversation,
so anyone can walk up and ask "what are we building" and get the same answer.

The client speaks plain text streams — `ChatPanel` and every copy of it read
`res.body.getReader()` and append raw bytes. Nothing in the codebase used AI
SDK tool calling before this.

## Decision

**Team memory is two tables, team-wide.** `Project` (name, description,
status, `docName`/`docText` for an uploaded .md/.txt, `addedBy` member id) and
`Requirement` (projectId, text, addedBy). Reads are unfiltered — everyone sees
everything (the `SheetEntry` precedent). Requirements are rows, not a JSON
column, so chat-tool appends and UI edits cannot clobber each other.

**Docs are pasted text, never blobs.** The panel reads the file client-side
with `File.text()` and POSTs the string as JSON. 200KB cap client-side, 100k
chars server-side. No multipart, no blob storage.

**The shared chat route branches on `npcId`.** `npcId !== 'secretary'` takes
the old stateless path — google-bro is untouched. The secretary path fetches
all projects + requirements inside `POST` (fail-soft: on DB error the context
degrades to "DATABASE UNAVAILABLE"), budgets them with `MAX_CHARS = 12000`
(tiers: full docs → 1500-char docs → filenames only → last 20 requirements),
and renders each project with a `[id:N]` tag.

**Tools write; the text stream never shows them.** Exactly two tools —
`create_project` and `add_requirement` — defined *inside* `POST` so their
`execute` closures capture `memberId` from the request body, with
`stopWhen: stepCountIs(4)`. Verified in ai@6.0.158: `toTextStreamResponse()`
ignores non-text-delta parts across multi-step runs, so the plain-text client
reader keeps working unchanged. Tools address projects by numeric id (the
`[id:N]` in context) — more reliable for a small model than name matching.
Failed calls return data the model can self-correct from (`validIds`, the
existing `projectId` on a duplicate).

## Consequences

- Tool writes are invisible mid-stream — the client cannot render "saving…".
  A run that ends on a tool-only step produces an empty bubble; held off by a
  prompt rule ("after every save, ALWAYS end with a confirmation") plus a
  client fallback that substitutes a canned confirmation for empty replies.
- `SecretaryPanel` duplicates the chat reader loop (accepted cost, same as
  `SheetBroPanel`).
- Any member, including `guest`, can write and delete team data. No audit
  trail beyond `addedBy`.
- The transcript is not the source of truth — the knowledge base is re-fetched
  from Postgres every request, so replayed history with no tool memory is
  harmless.

## Recipe — give an agent write access via tools

1. **Models** — add tables to `prisma/schema.prisma` (Int autoincrement ids,
   no relations, `addedBy String`). Migrate **manually**:
   `npx prisma migrate dev --name <name>` — never in the Vercel build.
2. **CRUD route** — `app/api/<thing>/route.ts` modeled on `app/api/projects/route.ts`:
   GET unfiltered, POST/PATCH validate + cap sizes, DELETE cascades children
   with `deleteMany` first.
3. **Chat route** — inside `POST`, after the fail-soft context fetch:
   ```ts
   import { streamText, tool, stepCountIs } from 'ai';
   import { z } from 'zod';

   const tools = {
     my_tool: tool({
       description: 'One sentence on when to use it.',
       inputSchema: z.object({
         field: z.string().describe('what goes here'),
       }),
       execute: async ({ field }) => {
         // return {ok:false, error, ...hints} instead of throwing —
         // the model reads the result and self-corrects next step
         return { ok: true };
       },
     }),
   };
   const result = streamText({ model, system, messages, tools, stopWhen: stepCountIs(4) });
   return result.toTextStreamResponse();   // client reader loop unchanged
   ```
   Define tools inside `POST` when `execute` needs request data (memberId).
4. **Prompt** — show writable records with stable numeric tags (`[id:N]`),
   make tools take the id, and end with "after every save, ALWAYS end with a
   short plain-text confirmation" plus the house no-markdown line.
5. **Client** — send `memberId: getMemberId()` in the body; wrap the reader
   loop in try/catch; substitute a canned confirmation if the streamed text is
   empty; skip persisting empty assistant messages.
6. **Upload** — `<input type="file" accept=".md,.txt">`, reject >200KB,
   `await file.text()`, send as a JSON string field.
