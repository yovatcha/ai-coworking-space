# 0008 — Proximity voice is a WebRTC mesh owned by the scene

**Status:** Accepted

## Context

Talking in this room meant typing: `SayBar` broadcasts 100 characters and a
`SpeechBubble` pops over your head. That is fine for a one-liner and useless for
actually working together.

Voice that ignores position is just a conference call — everyone in one channel,
talking over each other. What makes a virtual office feel like a room is that you
walk to someone's desk and they get louder.

The two things voice needs — the socket and every player's `(x, y)` keyed by
socket id — live inside `MainScene` and nowhere else. React has access to
neither.

## Decision

**A full P2P mesh, no SFU.** The roster is six people ([0005](0005-fixed-roster-member-colors.md)),
so nobody holds more than five connections. No vendor, no API key, no bill.

**`game/voice.ts` owns the mesh, `MainScene` owns it.** A plain class — not a
Phaser entity, not a React component, a third kind of thing in `game/`. It never
imports Phaser: `updateVolumes()` takes `Map<string, { x: number; y: number }>`,
which `RemotePlayer` satisfies structurally.

**The [0003](0003-npc-agent-pattern.md) seam holds.** React dispatches
`voice-toggle`; `VoiceChat` dispatches `voice-state` (`status` + peer count).
`MicButton` renders that and nothing else.

The one documented exception to "React owns the DOM": `VoiceChat` creates the
`<audio>` sinks itself. They render nothing and hold no state React needs, and
the alternative — routing live `MediaStream` objects through `useState` — buys
nothing.

**The server is a blind relay.** `voice-join` / `voice-leave` maintain a
`Set<socketId>`; `voice-signal {to, data}` is forwarded to that one socket as
`{from, data}`. The server never parses SDP or ICE. Both parties must be in the
set — that is the whole authorisation check, which is right for a
password-gated six-person room. This keeps `server/socket.ts` self-contained,
which [0005](0005-fixed-roster-member-colors.md) requires (rooted at `server/`,
deploys separately to Render).

**Glare is settled by comparing socket ids** — `myId < peerId` decides who
offers. Both sides run the same total comparison, so exactly one offers and
neither waits forever. No perfect negotiation, because there is exactly one
negotiation per pair for its whole life: the mic track is added before the offer
and the track set never changes afterwards. `onnegotiationneeded` logs a warning
so a broken assumption surfaces instead of silently killing audio.

**Peers are keyed on `socket.id`, never `member`.** Guest is a shared account —
two guests can be online at once ([0005](0005-fixed-roster-member-colors.md)).

**The toggle joins and leaves the whole mesh.** Mic off means the peers are
closed and `track.stop()` has run, so the browser's recording indicator matches
what the UI claims. It also means the toggle click is the user gesture that
unblocks audio playback, so autoplay is never a problem.

**Distance drives `HTMLAudioElement.volume`,** not a Web Audio `GainNode`. One
assignment, no `AudioContext` lifecycle to resume. Full volume within
`NEAR = 150` (an NPC is interactable at 120), silence past `FAR = 550` — about a
quarter of the 1920px room — and `t * t` between, because perceived loudness
tracks the square rather than the amplitude. Updated every 150 ms, not per
frame: at 200 px/s that is a 0.06 volume step, well under audible stepping.

## Consequences

- **STUN only, no TURN.** Symmetric NAT and UDP-blocking firewalls will never
  connect, and the failure is silent — `connectionState` goes to `'failed'`,
  which we log and tear down. Adding TURN later is config, not code.
- **The mesh caps out around eight concurrent speakers** (upstream and CPU are
  both O(n)). Past that it needs an SFU, which is a different ADR.
- **A backgrounded tab freezes volumes** at their last value — Phaser pauses
  `update()` while WebRTC keeps streaming. Deliberately not fixed with a
  `setInterval`.
- **Mic off means you also hear nothing.** If A has voice on and B does not, B
  hears silence standing right next to A. See the Recipe for the switch.
- **Stereo panning would mean migrating to Web Audio**, and Chrome needs the
  stream attached to an `<audio>` element anyway or `createMediaStreamSource`
  emits nothing.
- `server/socket.ts` now holds connection state it cannot validate the meaning
  of. That is the point of a relay, but it is new for this file.

## Recipe — tune the falloff

`NEAR` and `FAR` at the top of `game/voice.ts`. `NEAR` is "close enough to be in
the conversation", `FAR` is "out of earshot". Raise `FAR` and the room becomes
one big call; lower it and you have to stand on each other.

## Recipe — add TURN when STUN is not enough

Symptom: `[voice] peer <id> failed` in the console with no audio. Append to
`iceServers` in `RTC_CONFIG`, reading `NEXT_PUBLIC_TURN_URL` /
`NEXT_PUBLIC_TURN_USERNAME` / `NEXT_PUBLIC_TURN_CREDENTIAL`. No other change.

## Recipe — hear people while your own mic is off

In `disable()`, stop tearing down. Keep the peers and the stream, and flip
`this.stream.getAudioTracks().forEach((t) => (t.enabled = false))`. Add a third
status between `off` and `on` so the button can tell "muted" from "not in
voice", and leave `voice-leave` for a real departure. The mic hardware stays
open while muted — say so in the UI if you do this.

## Where the pieces live

| Concern | File |
|---|---|
| Mesh, signalling, audio sinks, falloff | `game/voice.ts` |
| `voice-join` / `voice-leave` / `voice-signal` relay | `server/socket.ts` |
| Ownership, toggle listener, volume tick | `game/scenes/MainScene.ts` |
| HUD toggle and state rendering | `components/MicButton.tsx` |
| Mount point beside the settings gear | `components/GameCanvas.tsx` |

## Alternatives considered

- **LiveKit / Agora / Daily (SFU).** Real spatial audio, survives bad NATs, and
  scales past eight. Costs money, adds a service to keep alive and a key to
  rotate, and for six people the mesh it replaces is five connections.
- **Voice in React with a `lib/socket.ts` singleton.** Would mean refactoring
  every handler in `setupSocket()`, or pushing 20 position updates/sec through
  `window` CustomEvents. The socket and the positions are already together;
  moving the code to them is cheaper than moving them to the code.
- **Server-side proximity grouping.** The server already has authoritative
  positions and could tell clients who to connect to. But it only learns a
  position when one changes, there is no tick loop, and the client knows the
  distance anyway.
