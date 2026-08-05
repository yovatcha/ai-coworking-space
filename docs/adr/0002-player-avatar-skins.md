# 0002 — Player avatars are selectable skins synced over the socket

**Status:** Superseded by [0005](0005-fixed-roster-member-colors.md).

> Built and then replaced within a day. The room turned out to have a known,
> fixed roster of six people, which makes identity a matter of *who you are*
> rather than *which sprite you picked* — so everyone shares one character and
> is told apart by colour. `game/skins.ts` is deleted. What follows is kept for
> the reasoning, not as a description of the code.

## Context

Today every player is the same sprite. `Player` hardcodes
`main-charactor/front1`, `MainScene.create()` registers the animation keys
`walk-down` / `walk-left` / `walk-right` / `walk-up` / `idle` globally, and
`RemotePlayer` renders the same frames with a blue tint (`0x88ccff`) so you can
tell yourself apart from everyone else. The socket payload is `{ x, y, anim }`.

That tint is a stand-in for identity. Once two players are in the room they are
indistinguishable apart from a truncated socket id floating above their head.

## Decision

A **skin** is a directory of character frames in the atlas plus a small registry
entry describing how to animate it. The player picks one; the choice rides along
in the socket payload so remote clients render the right sprite.

Three consequences fall out of the frame naming, and they drive the design:

- Directions are not consistently named across dirs — `main-charactor` uses
  `arrowrleft*` (source typo), `rattatoiue` uses `arrowleft*`. So the registry
  declares a **prefix per direction**, it does not derive one.
- Frame counts differ — `main-charactor/arrowdown` is 1–3, everything else is
  1–4. So the registry declares **ranges**, not a count.
- Idle frames differ — `front1` vs `ped/stand1`. So the registry declares the
  idle frame explicitly.

Animation keys become **namespaced by skin**: `main-charactor:walk-down`. The
global unprefixed keys go away. This matters because `RemotePlayer.applyState()`
plays whatever key arrives over the wire — with namespaced keys a remote player
in a different skin animates correctly with no extra logic.

The choice is stored in `localStorage` under `cowork_skin`, not in Postgres. It
is a cosmetic preference; the DB round-trip buys nothing at MVP. The
`getSkinId()` / `setSkinId()` helpers live in `game/skins.ts` rather than
`LoginPage`, so the scene can read the choice without importing React.

The blue tint on `RemotePlayer` is gone — it was standing in for exactly the
identity that skins now provide.

**Validation is split: the server sanitises, the client resolves.**
`server/socket.ts` cannot import `game/skins.ts` — `tsconfig.server.json` is
rooted at `server/` because the socket service deploys separately to Render. So
the server only checks the id against `/^[a-z0-9-]{1,32}$/` and blanks anything
else, and each client maps an unrecognised id to `DEFAULT_SKIN` via
`resolveSkin()`. This keeps one source of truth for the skin list and mirrors
how `anim` is already handled: relayed blind by the server, guarded by
`anims.exists()` on the client.

**Only characters with a full 4-direction walk cycle can be skins.** Today that
is `main-charactor` and `rattatoiue`. `ped`, `google-bro`, and `sheet-bro` have
two idle frames each — enough for a standing NPC, not for a player. Adding a
third skin is an art task, not a code task.

## Consequences

- The `move` payload grows one field. Server `PlayerState` and the `init` /
  `playerJoined` / `playerMoved` events all carry `skin`. The change is small
  but touches both sides of the socket at once — ship them together.
- Every skin's animations are registered at `create()`. Five skins × 5 keys is
  25 `anims.create()` calls, which is trivial; do not lazy-load.
- A client that sends an unknown skin id (stale build, tampering) must not crash
  the room. Unknown id → fall back to the default skin.
- Atlas size grows linearly with skin count. Each 16-frame character at 205px
  costs roughly what `main-charactor` costs today. Watch the total reported by
  `npm run assets`.
- Skins are cosmetic only — no speed, size, or collision differences. Keeping
  them purely visual is what makes the registry a data table instead of code.

## Recipe — add a new selectable skin

Two steps. Everything downstream reads from the registry.

1. Art into the atlas — follow [0001](0001-asset-pipeline-texture-atlas.md):
   `assets-src/<skin-id>/` with a full walk cycle plus an idle frame, add to
   `ATLAS_DIRS` at `width: 205`, then `npm run assets`.
2. Add one entry to `SKINS` in `game/skins.ts`:
   ```ts
   'skin-id': {
     label: 'DISPLAY NAME',
     idle: 'skin-id/front1',
     walk: {
       down:  { prefix: 'skin-id/arrowdown',  start: 1, end: 4, frameRate: 8 },
       left:  { prefix: 'skin-id/arrowleft',  start: 1, end: 4, frameRate: 8 },
       right: { prefix: 'skin-id/arrowright', start: 1, end: 4, frameRate: 8 },
       up:    { prefix: 'skin-id/arrowup',    start: 1, end: 4, frameRate: 8 },
     },
   }
   ```
   Copy prefixes and ranges from the real filenames in `assets-src/<skin-id>/`.
   Do not assume — `main-charactor` uses `arrowrleft` and its down-walk is 3
   frames while everything else is 4.

That is all. The login picker, the animation registration, and the socket
payload are all driven by `SKINS`; none of them need touching.

## Where the pieces live

| Concern | File |
|---|---|
| Registry, `animKey`, `resolveSkin`, localStorage | `game/skins.ts` |
| Registers every skin's 5 anims at `create()` | `game/scenes/MainScene.ts` |
| Local sprite + namespaced `currentAnim` | `game/entities/Player.ts` |
| Remote sprite + `setSkin()` swap | `game/entities/RemotePlayer.ts` |
| `skin` on `PlayerState`, sanitised | `server/socket.ts` |
| Picker with live atlas-frame previews | `components/LoginPage.tsx` |

The picker reads frame coordinates from `/assets/atlas.json` at runtime instead
of hardcoding them, because the shelf packer reflows every frame on each
`npm run assets`.

## Alternatives considered

- **Skin in Postgres on a `User` model.** There is no `User` model; the "login"
  is a localStorage flag. Adding a table for a cosmetic field is out of
  proportion to the MVP.
- **Per-skin sprite sheets instead of one atlas.** Loses the single-texture
  benefit from [0001](0001-asset-pipeline-texture-atlas.md) for no gain.
- **Server-assigned skins (round-robin for distinctness).** Removes player
  choice, which is the entire point.
