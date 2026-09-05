# Architecture Decision Records

Each ADR records one decision about how this project is built, plus the exact
recipe for repeating it. Read the relevant ADR **before** writing code for that
area — it saves rediscovering the asset pipeline or the event wiring every time.

| # | Decision | Status |
|---|----------|--------|
| [0001](0001-asset-pipeline-texture-atlas.md) | Sprites go through `assets-src/` → texture atlas | Accepted |
| [0002](0002-player-avatar-skins.md) | Player avatars are selectable skins synced over socket | Superseded by 0005 |
| [0003](0003-npc-agent-pattern.md) | Every AI agent = entity + window event + panel + system prompt | Accepted |
| [0004](0004-furniture-collision.md) | Furniture collision is a hand-placed AABB in `MainScene.update()` | Accepted |
| [0005](0005-fixed-roster-member-colors.md) | Fixed roster of six members, told apart by colour tint | Accepted |
| [0006](0006-secretary-team-memory-tool-calling.md) | Secretary team memory: Project rows + tool calling over a plain text stream | Accepted |
| [0007](0007-announce-board-cross-app-feed.md) | Announce board reads irin-task-board through a secret-protected feed | Accepted |

## Format

Short. Four headings: **Context** (why this came up), **Decision** (what we do),
**Consequences** (what it costs), **Recipe** (the copy-paste steps).

New ADR: next free number, add a row above. Never edit an accepted ADR to
reverse it — write a new one and mark the old **Superseded by NNNN**.

## Status meanings

- **Accepted** — this is how the code works today.
- **Proposed** — designed, not built yet. The Recipe is the build plan.
- **Superseded** — replaced; see the linked ADR.
