# 0001 — Sprites go through `assets-src/` into one texture atlas

**Status:** Accepted

## Context

Source art is 1024px PNGs at ~700 KB per frame. The main character alone is 16
frames — shipping those raw is ~11 MB for one walk cycle. Loading each frame as
its own texture also means one HTTP request and one WebGL texture bind per
sprite.

## Decision

Two directories, one build step:

- `assets-src/` — originals. Never served. Committed.
- `public/assets/` — generated output. Served. **Rebuilt from scratch** by
  `npm run assets` (`scripts/optimize-assets.mjs`), so never hand-edit it.

Everything that Phaser draws as a sprite is packed into a single
`atlas.webp` + `atlas.json` pair. Frame names mirror the source path minus the
extension: `assets-src/ped/stand1.png` → frame `ped/stand1`.

Sprites are stored at **2× their on-screen size** and drawn at `setScale(0.5)`,
which gives retina headroom without a second asset set.

Exceptions to the atlas, listed in `STANDALONE`: `bg.png` (too large to pack)
and `dreamspace-banner.png` (consumed by the DOM, not Phaser). These are lossy
webp q95 — they are flat illustrations, so lossy is invisible. The atlas itself
is **lossless** webp; sprites have hard edges and alpha where lossy leaves
fringing.

## Consequences

- Adding art is not "drop a PNG in `public/`". It requires an entry in
  `optimize-assets.mjs` and a rebuild. Forgetting the rebuild means the frame
  does not exist at runtime and Phaser renders a green box.
- `public/assets/` is disposable. Anything put there by hand is deleted on the
  next `npm run assets`.
- One atlas means one `this.load.atlas()` call and a single texture bind.
- Unused art stays in `assets-src/` and is listed in `DEAD` so it is excluded
  from the output rather than deleted from the repo.

## Recipe — add new sprite art

1. Drop the PNGs in `assets-src/<name>/`. Name frames so animation ranges are
   contiguous: `arrowdown1.png`, `arrowdown2.png`, … (`generateFrameNames` walks
   `<prefix><start>`..`<prefix><end>`).
2. Register it in `scripts/optimize-assets.mjs`:
   - a whole directory → add to `ATLAS_DIRS` with the target `width`
   - one-off files (furniture) → add to `ATLAS_FILES` with `{ file, width }`
   - Set `width` to **2× the intended on-screen width**, since the sprite is
     drawn at scale 0.5. The existing entries carry the arithmetic in a comment
     — follow that format.
3. `npm run assets`. Check the reported frame count and atlas dimensions; the
   packer wraps at `ATLAS_MAX_WIDTH = 2048`.
4. Reference it by frame name in Phaser: `this.add.image(x, y, ATLAS, 'furnitures/exit-door')`.

**Gotchas**

- Source filename typos become frame names. `google-bro/fornt2` is real — match
  the file, do not silently "fix" it in code.
- Do not add `png({ effort })` to the atlas encoder. It quantises to 256 colours
  and wrecks a shared atlas.
- If the atlas exceeds 2048px wide the packer starts a new shelf; height is
  unbounded, so watch total size rather than assuming it fits.

Related: [0002](0002-player-avatar-skins.md) (skins are atlas dirs),
[0004](0004-furniture-collision.md) (furniture is an atlas frame + a rect).
