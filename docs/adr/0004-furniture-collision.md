# 0004 — Furniture collision is a hand-placed AABB resolved in `MainScene.update()`

**Status:** Accepted

## Context

The room needs solid objects — a desk you cannot walk through. Phaser ships
Arcade Physics, which would give bodies, colliders, and separation for free.

But the game has no physics at all. `Player.update()` moves by
`x += dx * speed * delta` and clamps to the background bounds. There is no
velocity integration, no gravity, no bodies. Movement is deliberately simple
(see `AGENTS.md`: "basic velocity, no physics engine complexity").

## Decision

No physics engine. A colliding piece of furniture is **two independent things**:

1. A sprite — `this.add.image(x, y, ATLAS, 'furnitures/<name>').setScale(0.5).setDepth(10)`
2. A collision rect — `{ cx, cy, hw, hh }` (centre + half-extents), checked in
   `MainScene.update()`

Overlap is resolved by **pushing the player out along the axis of least
penetration**:

```ts
const overlapX = (hw + ph) - Math.abs(this.player.x - cx);
const overlapY = (hh + ph) - Math.abs(this.player.y - cy);
if (overlapX > 0 && overlapY > 0) {
  if (overlapX < overlapY) this.player.x += overlapX * Math.sign(this.player.x - cx);
  else                     this.player.y += overlapY * Math.sign(this.player.y - cy);
}
```

`ph = 24` is the player half-size and must stay in sync with `PLAYER_HALF` in
`Player.ts`.

**The rect is the footprint, not the sprite bounds.** The desk sprite is ~197 ×
107 on screen but its rect is `hw: 98, hh: 30`. In a top-down view you walk
*behind* the upper part of a desk — only its base blocks you. Sizing the rect to
the sprite makes furniture feel twice as deep as it looks.

**Depth decides what looks solid.** Furniture sits at depth 10. The player is
set to depth 11 when below an object's y and 9 when above it, so they render in
front when nearer the camera. Depth and collision are separate concerns: a rug
collides with nothing but still needs a depth; a desk needs both.

**Collision is client-side only.** Each client resolves its own player, and
remote positions arrive already resolved from the owning client — so everyone
agrees without server-side collision. Remote players and NPCs do not collide
with anything; two players can stand in the same tile. That is acceptable in a
co-working room and would need a rethink before anything competitive.

## Consequences

- Cheap and predictable — a handful of arithmetic per frame, and the behaviour
  is fully readable in one place.
- Every rect is placed by hand and does not follow the sprite. Move the image
  and the rect stays behind, silently.
- `MainScene.update()` loops the module-level `SOLIDS` array (the refactor the
  note below called for — done when bg3 landed and one desk became ~24 rects).
  Adding furniture is now one entry in that array.
- Least-penetration resolution can slide the player sideways when they walk
  into a corner. At `speed = 200` (~3.3 px/frame at 60 fps) against `ph = 24`
  there is no tunnelling risk.
- The push-out runs *after* `Player.update()`'s world clamp, so furniture placed
  hard against a wall can push the player slightly out of bounds for one frame.
  Keep colliding furniture at least `ph` away from the edges.

## Recipe — add furniture

1. **Art** — furniture is a one-off file, so use `ATLAS_FILES` (not
   `ATLAS_DIRS`) in `scripts/optimize-assets.mjs`:
   ```js
   { file: 'furnitures/bookshelf.png', width: 300 },  // 2× the ~150px on-screen width
   ```
   Then `npm run assets`. Full pipeline: [0001](0001-asset-pipeline-texture-atlas.md).

2. **Place it** in `MainScene.create()`:
   ```ts
   this.add.image(x, y, ATLAS, 'furnitures/bookshelf').setScale(0.5).setDepth(10);
   ```
   That is the whole job for non-blocking decoration. Stop here if the player
   should walk through it.

3. **Make it solid** — add one entry to `SOLIDS` in `MainScene.ts`:
   ```ts
   { cx: x, cy: y + 20, hw: 75, hh: 25 },
   ```
   Sizing: `hw` ≈ half the on-screen width. `hh` is the **base depth only** —
   start at a third of the half-height and nudge until it feels right. Offset
   `cy` downward if the sprite's base sits below its centre.

4. **Depth sorting** — if the player should pass behind it, extend the depth
   check in `update()` with the object's y the way `npcY = 175` and `doorY`
   are handled today.

5. **Test both axes.** Walk into it from all four sides and along both
   diagonals. Diagonal approaches are what expose a badly sized rect.

## Refactor note

**Done.** The push-out block started inline for one desk; bg3 draws its own
furniture, so the room went from one desk sprite to ~24 traced rects and the
block became a loop over `SOLIDS`. Keep it that way — add data, not code.

## Alternatives considered

- **Arcade Physics.** Would handle separation, but pulls a physics world,
  bodies, and a debug renderer into a game whose movement is four `if`
  statements. Contradicts the stated no-physics constraint.
- **Tilemap collision layer.** The right answer for a tile-based room. The
  background is a single 1920 × 1080 illustration, not a tilemap — adopting it
  means re-authoring the art.
- **Collision rects derived from sprite bounds.** Automatic, but wrong for
  top-down: it would block the walkable area behind every desk.
