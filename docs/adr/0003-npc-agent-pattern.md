# 0003 — An AI agent is an entity + a window event + a panel + a system prompt

**Status:** Accepted

## Context

Phaser owns a canvas; React owns the DOM. The chat UI needs React (inputs,
streaming text, scroll), the proximity detection needs Phaser (positions, the
game loop). They cannot call into each other directly without one importing the
other's tree.

There are three agents today — Secretary, Google Bro, Sheet Bro — plus one
non-AI interactive entity, the Rat. They all follow the same shape.

## Decision

**`window` CustomEvents are the seam between Phaser and React.** The entity's
`interact()` dispatches `<npc-id>-chat`; `GameCanvas` listens and flips a
`useState`. Nothing crosses the boundary except an event name.

**An NPC id is one string used in four places** — the event name, the
`ChatPanel` `npcId` prop, the `SYSTEM_PROMPTS` key, and the `npcId` column on
`ChatMessage`. Because chat history is keyed on `(userId, npcId)`, using the
same id everywhere gets per-agent persistent history with no extra work and
no migration.

**Agents share one route by default.** `app/api/secretary/chat/route.ts` holds
a `SYSTEM_PROMPTS` record and picks by `npcId` from the request body. An agent
gets its **own route only when it needs data the prompt cannot carry** —
`sheet-bro` has one because it fetches live spreadsheet rows and budgets them
into context (`MAX_CHARS`, stats-plus-sample when the sheet is large).

**Proximity is a distance check, not physics.** Each entity owns
`updateProximity(px, py)` returning whether the player is within
`INTERACT_DIST = 120`, toggling its own `[E] Talk` hint. `MainScene.update()`
calls it once per entity per frame.

**Typing locks movement.** Opening any panel dispatches `chat-opened`;
`MainScene` sets `chatOpen` and skips `player.update()`. Without this the
player walks across the room while you type "hello".

All agents run `anthropic/claude-haiku-4.5` through OpenRouter via the AI SDK's
`createOpenAI({ baseURL })`, streamed with `toTextStreamResponse()`.

## Consequences

- Adding an agent touches five files and none of them deeply. It is additive —
  no existing agent changes.
- Event names are strings with no compile-time check. A typo between
  `dispatchEvent` and `addEventListener` fails silently: pressing E does
  nothing, no error.
- `GameCanvas` tracks one `useState` per agent and references it in **four**
  places. Missing one is the most common bug in this pattern — see Gotchas.
- Every agent shares one model and one provider. Changing either is a one-line
  edit per route, not a per-agent config.
- System prompts all end with the same "no markdown" instruction because the
  panel renders plain text. New prompts must repeat it.

## Recipe — add a new AI agent

Example: an agent with id `docs-bro`.

1. **Art** — [0001](0001-asset-pipeline-texture-atlas.md).
   `assets-src/docs-bro/front1.png`, `front2.png`; add to `ATLAS_DIRS` at
   `width: 266` (matches the other bros); `npm run assets`.

2. **Entity** — `game/entities/DocsBro.ts`. Copy `SheetBro.ts` verbatim and
   change four things: the class name, the atlas frames, the animation key, and
   the event name. It is ~45 lines and deliberately not abstracted.
   ```ts
   interact() {
     window.dispatchEvent(new CustomEvent('docs-bro-chat'));
   }
   ```

3. **Scene** — `game/scenes/MainScene.ts`:
   - field: `private docsBro!: DocsBro;`
   - in `create()`: `this.docsBro = new DocsBro(this, x, y);`
   - in `update()`:
     ```ts
     const nearDocsBro = this.docsBro.updateProximity(this.player.x, this.player.y);
     if (nearDocsBro && pressE) this.docsBro.interact();
     ```
   Pick coordinates inside `BG_WIDTH × BG_HEIGHT` (2064 × 1152) and at least
   ~150px from other NPCs, or two `[E] Talk` hints overlap and one keypress
   opens two panels.

4. **Prompt** — add a `'docs-bro'` key to `SYSTEM_PROMPTS` in
   `app/api/secretary/chat/route.ts`. Keep the house style: 2–3 sentences,
   Thai or English, and the "never use markdown" line.

5. **Panel** — `components/GameCanvas.tsx`, all four spots:
   ```ts
   const [docsBroOpen, setDocsBroOpen] = useState(false);          // 1. state

   useEffect(() => {                                               // 2. listener
     const open = () => setDocsBroOpen(true);
     window.addEventListener("docs-bro-chat", open);
     return () => window.removeEventListener("docs-bro-chat", open);
   }, []);
   ```
   3. add `|| docsBroOpen` to the `chat-opened` effect's condition **and** its
      dependency array, and to the `!chatOpen && !ratOpen && ...` guard that
      hides `SayBar`.
   4. render it:
   ```tsx
   <AnimatePresence>
     {docsBroOpen && (
       <motion.div key="docs-bro-chat" /* copy the Google Bro motion props */>
         <ChatPanel
           npcName="DOCS BRO"
           npcId="docs-bro"
           greeting="สวัสดีครับ ผมคือ Docs Bro"
           onClose={() => setDocsBroOpen(false)}
           userId={userId}
         />
       </motion.div>
     )}
   </AnimatePresence>
   ```

6. **Nothing for history.** `ChatPanel` GETs and POSTs `/api/chat-history` with
   the `npcId` prop automatically. No schema change, no migration.

## Recipe — agent that needs external data

Only when the answer depends on data the prompt cannot hold (a spreadsheet, an
API, a DB query). Model it on `app/api/sheet-bro/chat/route.ts`:

1. Own route: `app/api/<id>/chat/route.ts`.
2. Fetch the data inside `POST`, **failing soft** — return `null` on error and
   fall back to a degraded prompt rather than throwing. A dead upstream should
   make the agent unhelpful, not break the panel.
3. Budget the context. `sheet-bro` sends everything under `MAX_CHARS = 12000`,
   and above it switches to per-column statistics plus the first 100 rows.
   Do the equivalent — never dump unbounded data into the system prompt.
4. Own panel component if the UI needs more than a text box (`SheetBroPanel`
   has sheet selection), otherwise reuse `ChatPanel` and point it at the new
   route.

## Gotchas

- The event name must match exactly in three places: `interact()`,
  `GameCanvas`'s `addEventListener`, and its `removeEventListener`.
- Forgetting `|| xOpen` in the `chat-opened` effect means the player walks while
  typing. Forgetting it in the `SayBar` guard means the broadcast bar renders
  under the panel.
- The entity constructor calls `scene.anims.create()`. That is safe only because
  each NPC is a singleton in the scene. Do not copy this into anything
  instantiated more than once.
- `pressE` in `MainScene.update()` is `JustDown(keyE) && !typing` — read once
  per frame and shared by every entity. Do not call `JustDown` again inside a
  branch; the second call returns false.
