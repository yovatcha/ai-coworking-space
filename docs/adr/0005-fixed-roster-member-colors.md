# 0005 — Fixed roster of six members, told apart by colour tint

**Status:** Accepted — supersedes [0002](0002-player-avatar-skins.md)

## Context

This room has a known set of users: **Yo, Phee, Tent, Art, Joe**, and a shared
**Guest**. That changes the identity problem. [0002](0002-player-avatar-skins.md)
solved "which sprite did you pick", which is the right question for an open
signup and the wrong one here — with six known people you want to glance at the
room and know who is who.

The old login was a single shared `ROOM_PASSWORD`, so anyone could claim to be
anyone. And only two characters in `assets-src/` have a full walk cycle, so
sprite variety was never going to carry identity anyway.

## Decision

**One character for everyone: `main-charactor`.** No skin registry. The scene
registers one set of five animations, exactly as it did before 0002.

**Identity comes from the password.** Each member has their own —
`PASSWORD_YO`, `PASSWORD_PHEE`, `PASSWORD_TENT`, `PASSWORD_ART`,
`PASSWORD_JOE`, `PASSWORD_GUEST`. `/api/auth/login` matches the submitted
password against all six and returns the member it belongs to. Guest falls back
to `ROOM_PASSWORD` when `PASSWORD_GUEST` is unset so an existing deployment
keeps working. The route checks every slot before returning rather than
short-circuiting on the first match, so a wrong password costs the same as a
right one.

**Colour is the identity signal.** Each member has a default tint and can pick
another from a fixed palette; the sprite is drawn with `setTint()` and the name
tag above remote players shows the member's label instead of a socket id.

**Guest cannot change colour.** It is a shared account, so a stable appearance
matters more than expression. Enforced in `lib/members.ts` (`canChangeColor`),
in the UI (the menu entry is hidden), and in the API (`403`) — the hidden
button is not the rule.

**Colour lives in Postgres, cached in localStorage.** `MemberColor` is keyed by
`memberId`, so Yo is the same colour on any device. localStorage holds a copy so
the scene can paint on first frame without waiting on a fetch; the DB is
authoritative and `syncColor()` refreshes the cache at login.

**The socket payload carries `member` and `color`** alongside `x`, `y`, `anim`.
Both are in the `lastSent` comparison, so a colour change propagates on the next
tick without a dedicated event.

Validation splits the same way [0002](0002-player-avatar-skins.md) established
and for the same reason — `server/socket.ts` is rooted at `server/` and deploys
separately to Render, so it cannot import `lib/members.ts`. The server sanitises
shape only (`/^[a-z0-9-]{1,32}$/`, `/^#[0-9a-f]{6}$/i`); clients map anything
unrecognised onto guest and the member default via `resolveMember()` /
`resolveColor()`.

## Consequences

- Six passwords to distribute and rotate by hand. At this size that is a
  feature — no signup, no user table, no session tokens.
- **There is no session token, so `/api/member-color` trusts the `memberId` in
  the request body.** Anyone who can reach the API can repaint another member.
  Acceptable for a six-person private room; it is the first thing to fix if the
  room ever opens up.
- `setTint()` multiplies. The character art is already coloured, so tints read
  as a wash rather than a flat recolour, and dark swatches muddy it. `ORIGINAL`
  (`#ffffff`) is in the palette as the no-tint escape hatch.
- Adding a seventh person is a registry entry plus an env var — but their colour
  should be visually distinct from the existing six, which gets harder each time.
- Two people who share a password appear as one member in two places. Nothing
  prevents it; the roster is a trust boundary, not an enforcement one.

## Recipe — add a member

1. Add an entry to `MEMBERS` in `lib/members.ts` with a `defaultColor` that is
   distinguishable from the others at a glance.
2. Set `PASSWORD_<ID>` in the environment (`.env.local` locally, Vercel project
   settings in production). The id is uppercased: `art` → `PASSWORD_ART`.
3. Nothing else. The login route, the picker, and the name tags all read from
   `MEMBERS`.

## Recipe — add a palette colour

Add to `PALETTE` in `lib/members.ts`. The picker is a grid over that array, and
`resolveColor()` accepts any `#rrggbb`, so no validation list needs updating.

## Where the pieces live

| Concern | File |
|---|---|
| Roster, palette, `resolveColor`, `toTint` | `lib/members.ts` |
| localStorage cache + DB sync helpers | `game/identity.ts` |
| Password → member | `app/api/auth/login/route.ts` |
| Colour read/write, guest guard | `app/api/member-color/route.ts` |
| Tint on the local sprite | `game/entities/Player.ts` |
| Tint + name tag on remotes | `game/entities/RemotePlayer.ts` |
| `member`/`color` in the payload | `game/scenes/MainScene.ts`, `server/socket.ts` |
| Picker in the settings menu | `components/GameCanvas.tsx` |

## Alternatives considered

- **Keep skins, add colour on top.** Two identity axes for six people. The
  sprite axis carries no information once everyone knows who is who.
- **Colour assigned automatically per member, not chosen.** Guarantees
  distinctness, but people want their own colour — and with six slots collisions
  are easy to avoid by eye.
- **Per-member sprite recolour baked into the atlas.** Sharpest result, no tint
  muddiness, but six copies of a 16-frame character in the atlas and new art
  needed for every roster change.
