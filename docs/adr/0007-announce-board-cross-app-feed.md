# 0007 — Announce board: read another app's data through a secret-protected feed

**Status:** Accepted

## Context

The team tracks work in a second app, `irin-task-board` (Next.js + Prisma on
its own Neon database, LINE login). People wanted to see who has what in hand
without leaving the room. The room already has a "WORK HARD / DRIVE PASSION"
sign painted into `bg3` on the back wall above the sofa — the natural place for
a notice board.

Two ways to get the data: point this app's Prisma at irin's database, or ask
irin over HTTP. Sharing a database couples two schemas and two migration
histories; every irin change becomes an aicowork change.

## Decision

**irin owns its data and exposes one read-only feed.** `GET /api/workload` in
irin returns every user with their incomplete checklist items (card, lane,
board, priority, due date). It is protected by `Authorization: Bearer
$WORKLOAD_API_SECRET` — the same shape as irin's cron route — because the
caller is a server, not a LINE-logged-in browser.

**aicowork proxies it, never calls it from the browser.**
`app/api/task-board/route.ts` holds the secret, fetches with
`next: { revalidate: 30 }` so many clients cost one upstream call, and fails
soft: any upstream problem is a 503 the UI renders as "offline".

**The board is an entity, not an NPC.** `game/entities/AnnounceBoard.ts` is a
`Container` (frame + paper + two `Text`s) drawn at depth 5 over the painted
sign. It polls the proxy every 60s and rotates through people who have tasks
every 6s, three lines each. It follows [0003](0003-npc-agent-pattern.md) for
everything else: `updateProximity` / `interact()` / a window event
(`task-board-open`) that `GameCanvas` turns into `TaskBoardPanel`.

**Types live in `lib/taskBoard.ts`** — pure data, imported by the route, the
panel, and the scene. `memberColorForName()` paints an irin user in a roster
member's colour when their LINE name equals a member id or label; otherwise
grey. There is no user table linking the two apps.

## Consequences

- Two env vars on each side must agree: irin `WORKLOAD_API_SECRET` ↔ aicowork
  `IRIN_TASK_BOARD_SECRET`, plus `IRIN_TASK_BOARD_URL`. Locally irin must run on
  another port (`next dev -p 3001`) because both default to 3000.
- The board is read-only. Marking tasks done still happens in irin or LINE.
- The interact reach is 230px from the board's bottom edge (NPCs use 120)
  because the sofa keeps the player away from that wall.
- Phaser `Text` is single-colour, so the on-canvas board tints the whole page
  toward the member colour rather than just the name.
- Data is at most ~90s stale (30s proxy cache + 60s client poll).

## Recipe — feed another app's data into the room

1. **Upstream route** in the other app: `GET /api/<thing>`, check
   `authorization === \`Bearer ${process.env.<X>_SECRET}\``, return plain JSON,
   no session.
2. **Proxy route** here: `app/api/<thing>/route.ts` — read URL + secret from
   env, `fetch` with `next: { revalidate: N }`, return 503 on any failure.
3. **Types** in `lib/<thing>.ts` — no React / Prisma / Phaser imports.
4. **Entity** modelled on `AnnounceBoard.ts`: `Container`, `refresh()` via
   `scene.time.addEvent({ loop: true })`, guard `if (!this.active) return`
   after every `await`, `updateProximity` + `interact()` dispatching one event.
5. **Scene + panel** — steps 3 and 5 of the [0003](0003-npc-agent-pattern.md)
   recipe (field, `create()`, `update()`, and all four `GameCanvas` spots).
6. **Env** — add both sides to `.env.example`, generate the secret with
   `openssl rand -hex 24`, set it in both deployments.
