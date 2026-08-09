import * as Phaser from "phaser";
import { io, Socket } from "socket.io-client";
import Player from "../entities/Player";
import RemotePlayer from "../entities/RemotePlayer";
import NPC from "../entities/NPC";
import Rat from "../entities/Rat";
import GoogleBro from "../entities/GoogleBro";
import SheetBro from "../entities/SheetBro";
import { resolveMember, resolveColor } from "@/lib/members";
import { getMemberId, getColor } from "../identity";

// Sprites are stored at 2x their on-screen size (retina headroom) and drawn at
// scale 0.5. bg3.png is the exception: stored 1:1 at 1920x1080, drawn at scale 1.
// These MUST match the bg3 output size in scripts/optimize-assets.mjs, otherwise
// the world bounds and the drawn image drift apart.
export const BG_WIDTH = 1920;
export const BG_HEIGHT = 1080;

// Single texture atlas holding every character + furniture frame.
// Frame names mirror the source paths, e.g. 'ped/stand1'.
export const ATLAS = "atlas";

// Walkable floor inside the room walls — bg3 insets the floor from the canvas,
// so the outer band of the image is not somewhere anything should stand.
export const ROOM = { left: 100, top: 75, right: 1790, bottom: 965 };

type Rect = { cx: number; cy: number; hw: number; hh: number };

/**
 * Solid furniture, traced off the bg3 artwork. Centre + half-extents, resolved
 * in `update()` — see docs/adr/0004-furniture-collision.md. Every piece of
 * furniture is painted into the background, so these rects are the only thing
 * that makes the room feel solid; move one and nothing on screen moves with it.
 */
const SOLIDS: Rect[] = [
  // Room walls — the floor is inset from the 1920x1080 canvas on every side
  { cx: 40, cy: 540, hw: 42, hh: 540 }, // left
  { cx: 1858, cy: 540, hw: 64, hh: 540 }, // right
  { cx: 960, cy: 28, hw: 960, hh: 30 }, // top
  { cx: 960, cy: 1032, hw: 960, hh: 58 }, // bottom

  // Left workstation cluster (Google Bro / Sheet Bro sit here)
  { cx: 239, cy: 365, hw: 121, hh: 38 },
  { cx: 239, cy: 560, hw: 121, hh: 40 },
  { cx: 239, cy: 775, hw: 121, hh: 40 },
  { cx: 590, cy: 778, hw: 140, hh: 45 },

  { cx: 598, cy: 495, hw: 152, hh: 55 }, // meeting table
  { cx: 955, cy: 532, hw: 107, hh: 48 }, // secretary desk
  { cx: 485, cy: 190, hw: 205, hh: 58 }, // back counter + shelving

  // Top-centre lounge
  { cx: 905, cy: 205, hw: 105, hh: 45 }, // sofa
  { cx: 910, cy: 318, hw: 90, hh: 33 }, // coffee table
  { cx: 1062, cy: 175, hw: 37, hh: 68 }, // drinks cabinet

  // Divider between office and garage — the gap below it is the walkway
  { cx: 1127, cy: 330, hw: 26, hh: 290 },
  { cx: 1112, cy: 598, hw: 40, hh: 45 },

  { cx: 1312, cy: 470, hw: 88, hh: 180 }, // black Porsche
  { cx: 1590, cy: 480, hw: 90, hh: 195 }, // white Porsche

  // Kitchen
  { cx: 1055, cy: 790, hw: 175, hh: 75 },
  { cx: 1105, cy: 900, hw: 120, hh: 35 },

  // Bottom-right lounge
  { cx: 1545, cy: 810, hw: 145, hh: 55 },
  { cx: 1537, cy: 917, hw: 88, hh: 33 },

  // Right-hand wall units
  { cx: 1740, cy: 187, hw: 35, hh: 58 },
  { cx: 1742, cy: 805, hw: 33, hh: 165 },
];

export default class MainScene extends Phaser.Scene {
  private player!: Player;
  private socket!: Socket;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private npc!: NPC;
  private googleBro!: GoogleBro;
  private sheetBro!: SheetBro;
  private rat!: Rat;
  private keyE!: Phaser.Input.Keyboard.Key;
  // The exit is the door drawn into the top-left corner of bg3
  private doorX = 166;
  private doorY = 200;
  private readonly DOOR_INTERACT_DIST = 100;
  private doorHint!: Phaser.GameObjects.Text;

  // Throttle how often we emit position (ms)
  private lastEmit = 0;
  private readonly EMIT_INTERVAL = 50; // ~20 updates/sec
  // Last state actually sent — null until the first emit, so we always
  // announce ourselves once even if the player never moves
  private lastSent: {
    x: number;
    y: number;
    anim: string;
    member: string;
    color: string;
  } | null = null;
  private memberId!: string;
  private color!: string;
  private chatOpen = false;
  // True while the broadcast input at the bottom of the screen has focus
  private sayOpen = false;

  constructor() {
    super({ key: "MainScene" });
  }

  preload() {
    // Every sprite and furniture frame lives in one texture; bg is too big to pack.
    // Regenerate both with `npm run assets`.
    this.load.image("bg", "/assets/bg3.webp");
    this.load.atlas(ATLAS, "/assets/atlas.webp", "/assets/atlas.json");
  }

  /** Frames named `<prefix><start>`..`<prefix><end>` inside the atlas. */
  private frames(prefix: string, start: number, end: number) {
    return this.anims.generateFrameNames(ATLAS, { prefix, start, end });
  }

  create() {
    // Pinned to 0,0 and sized to the world so the map lines up 1:1 with the bounds
    this.add
      .image(0, 0, "bg")
      .setOrigin(0, 0)
      .setDisplaySize(BG_WIDTH, BG_HEIGHT);

    // Exit door — no sprite, bg3 already draws the door in the top-left corner.
    // Hint sits below it so it doesn't cover the doorway.
    this.doorHint = this.add
      .text(this.doorX, this.doorY + 40, "[E] Exit", {
        fontSize: "11px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 0)
      .setVisible(false)
      .setDepth(20);

    // Camera bounds match the visible bg area; zoom 1 so the world fills the screen
    this.cameras.main.setBounds(0, 0, BG_WIDTH, BG_HEIGHT);
    this.cameras.main.setZoom(1);

    // Animations — one shared set; everyone uses the same character art and is
    // told apart by tint colour (see docs/adr/0005-fixed-roster-member-colors.md)
    const P = "main-charactor/";
    this.anims.create({
      key: "walk-down",
      frames: this.frames(P + "arrowdown", 1, 3),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-right",
      frames: this.frames(P + "arrowright", 1, 4),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-left",
      frames: this.frames(P + "arrowrleft", 1, 4),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-up",
      frames: this.frames(P + "arrowup", 1, 4),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "idle",
      frames: [{ key: ATLAS, frame: P + "front1" }],
      frameRate: 1,
    });

    this.memberId = getMemberId();
    this.color = getColor(this.memberId);
    // Spawn on the open floor inside the entrance, clear of the door trigger
    this.player = new Player(this, 230, 290, this.color);

    // Center camera on the spawn before following the player
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.cameras.main.startFollow(this.player, true);

    // NPCs stand at desks that bg3 already draws — no furniture sprites needed.
    // Secretary — the lone workstation in the middle of the room
    this.npc = new NPC(this, 955, 615);

    // Google Bro — the aisle beside the top-left workstation
    this.googleBro = new GoogleBro(this, 400, 370);

    // Sheet Bro — Google Bro's employee, one desk down
    this.sheetBro = new SheetBro(this, 400, 590);

    // Same y-based depth the player uses, so walking past an NPC sorts correctly
    for (const a of [this.npc, this.googleBro, this.sheetBro]) {
      a.setDepth(10 + a.y / BG_HEIGHT);
    }

    // Rat animations
    const R = "rattatoiue/";
    this.anims.create({
      key: "rat-idle",
      frames: [{ key: ATLAS, frame: R + "front1" }],
      frameRate: 1,
    });
    this.anims.create({
      key: "rat-walk-down",
      frames: this.frames(R + "arrowdown", 1, 4),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "rat-walk-right",
      frames: this.frames(R + "arrowright", 1, 4),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "rat-walk-left",
      frames: this.frames(R + "arrowleft", 1, 4),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "rat-walk-up",
      frames: this.frames(R + "arrowup", 1, 4),
      frameRate: 8,
      repeat: -1,
    });

    // Rat — wanders around the room, starting on the floor by the kitchen
    this.rat = new Rat(this, 800, 900);

    // Resume rat walking when chat closes
    window.addEventListener("chat-closed", () => this.rat.stopInteracting());

    // E key for interaction
    this.keyE = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
      false,
    ); // false = don't capture

    // Setup socket after all anims are registered
    this.time.delayedCall(0, () => this.setupSocket());

    window.addEventListener("chat-opened", () => {
      this.chatOpen = true;
    });
    window.addEventListener("chat-closed", () => {
      this.chatOpen = false;
    });

    // Broadcast chat from the bottom input bar
    const onSayFocus = () => {
      this.sayOpen = true;
    };
    const onSayBlur = () => {
      this.sayOpen = false;
    };
    const onSay = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (!text) return;
      this.player.say(text);
      this.socket?.emit("chat", text);
    };
    // Colour picked in the settings menu — repaint now, the next emit carries it
    const onColor = (e: Event) => {
      const color = resolveColor(
        (e as CustomEvent<string>).detail,
        this.memberId,
      );
      this.color = color;
      this.player.setColor(color);
    };

    window.addEventListener("say-focus", onSayFocus);
    window.addEventListener("say-blur", onSayBlur);
    window.addEventListener("player-say", onSay);
    window.addEventListener("player-color", onColor);
    this.events.once("shutdown", () => {
      window.removeEventListener("say-focus", onSayFocus);
      window.removeEventListener("say-blur", onSayBlur);
      window.removeEventListener("player-say", onSay);
      window.removeEventListener("player-color", onColor);
    });
  }

  private setupSocket() {
    // NEXT_PUBLIC_* vars are inlined at build time by Next.js
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    console.log("[socket] connecting to:", socketUrl);
    this.socket = io(socketUrl, {
      transports: ["polling", "websocket"],
    });

    this.socket.on("connect", () => {
      console.log("[socket] connected as", this.socket.id);
      // Reconnects get a fresh socket id and empty server-side state,
      // so forget what we sent and re-announce on the next tick
      this.lastSent = null;
    });

    this.socket.on("connect_error", (err) => {
      console.error("[socket] connection error:", err.message);
    });

    // Receive own ID + snapshot of existing players
    this.socket.on(
      "init",
      ({
        selfId,
        others,
      }: {
        selfId: string;
        others: Record<
          string,
          {
            x: number;
            y: number;
            anim: string;
            member?: string;
            color?: string;
          }
        >;
      }) => {
        console.log(
          "[socket] my id:",
          selfId,
          "| others:",
          Object.keys(others),
        );
        Object.entries(others).forEach(([id, state]) => {
          if (!this.remotePlayers.has(id)) {
            this.addRemotePlayer(
              id,
              state.x,
              state.y,
              state.anim,
              state.member,
              state.color,
            );
          }
        });
      },
    );

    // A new player joined — will be positioned properly once they send their first move
    this.socket.on("playerJoined", ({ id }: { id: string }) => {
      if (!this.remotePlayers.has(id)) {
        // Identity is unknown until their first move; guest stands in until then
        this.addRemotePlayer(id, BG_WIDTH / 2, BG_HEIGHT / 2, "");
      }
    });

    // Another player moved
    this.socket.on(
      "playerMoved",
      ({
        id,
        x,
        y,
        anim,
        member,
        color,
      }: {
        id: string;
        x: number;
        y: number;
        anim: string;
        member?: string;
        color?: string;
      }) => {
        if (id === this.socket.id) return; // ignore own echoes
        const remote = this.remotePlayers.get(id);
        if (remote) {
          const m = resolveMember(member);
          remote.setIdentity(m, resolveColor(color, m));
          remote.applyState(x, y, anim);
        } else {
          this.addRemotePlayer(id, x, y, anim, member, color);
        }
      },
    );

    // Another player broadcast a message
    this.socket.on(
      "playerChat",
      ({ id, text }: { id: string; text: string }) => {
        this.remotePlayers.get(id)?.say(text);
      },
    );

    // A player left
    this.socket.on("playerLeft", ({ id }: { id: string }) => {
      const remote = this.remotePlayers.get(id);
      if (remote) {
        remote.destroy();
        this.remotePlayers.delete(id);
      }
    });
  }

  private addRemotePlayer(
    id: string,
    x: number,
    y: number,
    anim: string,
    member?: string,
    color?: string,
  ) {
    const m = resolveMember(member);
    const rp = new RemotePlayer(this, x, y, m, resolveColor(color, m));
    rp.applyState(x, y, anim);
    this.remotePlayers.set(id, rp);
  }

  update(time: number, delta: number) {
    const typing = this.chatOpen || this.sayOpen;
    if (!typing) this.player.update(time, delta);

    // Always read the key so it doesn't stay "just down" until after typing ends
    const pressE = Phaser.Input.Keyboard.JustDown(this.keyE) && !typing;

    // Depth sorting: whoever is further down the screen draws on top. All the
    // furniture lives in the background image now, so the NPCs are the only
    // sprites left to sort against.
    this.player.setDepth(10 + this.player.y / BG_HEIGHT);
    this.rat.setDepth(10 + this.rat.y / BG_HEIGHT);

    // Push player out of every solid (AABB, axis of least penetration)
    const ph = 24; // player half-size (matches PLAYER_HALF in Player.ts)
    for (const { cx, cy, hw, hh } of SOLIDS) {
      const overlapX = hw + ph - Math.abs(this.player.x - cx);
      const overlapY = hh + ph - Math.abs(this.player.y - cy);
      if (overlapX <= 0 || overlapY <= 0) continue;
      if (overlapX < overlapY) {
        this.player.x += overlapX * Math.sign(this.player.x - cx);
      } else {
        this.player.y += overlapY * Math.sign(this.player.y - cy);
      }
    }

    // NPC proximity + interaction
    const near = this.npc.updateProximity(this.player.x, this.player.y);
    if (near && pressE) {
      this.npc.interact();
    }

    // Google Bro proximity + interaction
    const nearGoogleBro = this.googleBro.updateProximity(
      this.player.x,
      this.player.y,
    );
    if (nearGoogleBro && pressE) {
      this.googleBro.interact();
    }

    // Sheet Bro proximity + interaction
    const nearSheetBro = this.sheetBro.updateProximity(
      this.player.x,
      this.player.y,
    );
    if (nearSheetBro && pressE) {
      this.sheetBro.interact();
    }

    // Rat proximity + interaction
    const nearRat = this.rat.updateProximity(this.player.x, this.player.y);
    if (nearRat && pressE) {
      this.rat.interact();
    }

    this.rat.update(delta);

    // Door proximity + interaction
    const nearDoor =
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.doorX,
        this.doorY,
      ) < this.DOOR_INTERACT_DIST;
    this.doorHint.setVisible(nearDoor);
    if (nearDoor && pressE) {
      window.dispatchEvent(new CustomEvent("exit-door"));
    }

    // Throttled position emit — skipped entirely while nothing changed
    if (time - this.lastEmit > this.EMIT_INTERVAL) {
      this.lastEmit = time;
      // Round to whole pixels: sub-pixel drift is invisible to remote players
      const next = {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        anim: this.player.currentAnim ?? "idle",
        member: this.memberId,
        color: this.color,
      };
      const prev = this.lastSent;
      if (
        !prev ||
        prev.x !== next.x ||
        prev.y !== next.y ||
        prev.anim !== next.anim ||
        prev.member !== next.member ||
        prev.color !== next.color
      ) {
        this.lastSent = next;
        this.socket.emit("move", next);
      }
    }
  }
}
