import * as Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import Player from '../entities/Player';
import RemotePlayer from '../entities/RemotePlayer';
import NPC from '../entities/NPC';
import Rat from '../entities/Rat';

// bg.png is 2752x1536 — displayed at 75% size for a medium room
export const BG_WIDTH = 2064;
export const BG_HEIGHT = 1152;

export default class MainScene extends Phaser.Scene {
  private player!: Player;
  private socket!: Socket;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private npc!: NPC;
  private rat!: Rat;
  private keyE!: Phaser.Input.Keyboard.Key;
  private deskBounds!: { cx: number; cy: number; hw: number; hh: number };
  private doorX = BG_WIDTH - 120;
  private doorY = BG_HEIGHT - 120;
  private readonly DOOR_INTERACT_DIST = 100;
  private doorHint!: Phaser.GameObjects.Text;
  private doorImage!: Phaser.GameObjects.Image;

  // Throttle how often we emit position (ms)
  private lastEmit = 0;
  private readonly EMIT_INTERVAL = 50; // ~20 updates/sec
  private chatOpen = false;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    this.load.image('bg', '/assets/bg.png');
    this.load.image('exit-door', '/assets/furnitures/exit-door.png');
    this.load.image('ped-stand1', '/assets/ped/stand1.png');
    this.load.image('ped-stand2', '/assets/ped/stand2.png');
    this.load.image('working-desk', '/assets/furnitures/working-desk.png');
    this.load.image('front1', '/assets/main-charactor/front1.png');

    // down
    this.load.image('arrowdown1', '/assets/main-charactor/arrowdown1.png');
    this.load.image('arrowdown2', '/assets/main-charactor/arrowdown2.png');
    this.load.image('arrowdown3', '/assets/main-charactor/arrowdown3.png');

    // right
    this.load.image('arrowright1', '/assets/main-charactor/arrowright1.png');
    this.load.image('arrowright2', '/assets/main-charactor/arrowright2.png');
    this.load.image('arrowright3', '/assets/main-charactor/arrowright3.png');
    this.load.image('arrowright4', '/assets/main-charactor/arrowright4.png');

    // left
    this.load.image('arrowrleft1', '/assets/main-charactor/arrowrleft1.png');
    this.load.image('arrowrleft2', '/assets/main-charactor/arrowrleft2.png');
    this.load.image('arrowrleft3', '/assets/main-charactor/arrowrleft3.png');
    this.load.image('arrowrleft4', '/assets/main-charactor/arrowrleft4.png');

    // up
    this.load.image('arrowup1', '/assets/main-charactor/arrowup1.png');
    this.load.image('arrowup2', '/assets/main-charactor/arrowup2.png');
    this.load.image('arrowup3', '/assets/main-charactor/arrowup3.png');
    this.load.image('arrowup4', '/assets/main-charactor/arrowup4.png');

    this.load.image('rat-front', '/assets/rattatoiue/front1.png');
    this.load.image('rat-down1', '/assets/rattatoiue/arrowdown1.png');
    this.load.image('rat-down2', '/assets/rattatoiue/arrowdown2.png');
    this.load.image('rat-down3', '/assets/rattatoiue/arrowdown3.png');
    this.load.image('rat-down4', '/assets/rattatoiue/arrowdown4.png');
    this.load.image('rat-right1', '/assets/rattatoiue/arrowright1.png');
    this.load.image('rat-right2', '/assets/rattatoiue/arrowright2.png');
    this.load.image('rat-right3', '/assets/rattatoiue/arrowright3.png');
    this.load.image('rat-right4', '/assets/rattatoiue/arrowright4.png');
    this.load.image('rat-left1', '/assets/rattatoiue/arrowleft1.png');
    this.load.image('rat-left2', '/assets/rattatoiue/arrowleft2.png');
    this.load.image('rat-left3', '/assets/rattatoiue/arrowleft3.png');
    this.load.image('rat-left4', '/assets/rattatoiue/arrowleft4.png');
    this.load.image('rat-up1', '/assets/rattatoiue/arrowup1.png');
    this.load.image('rat-up2', '/assets/rattatoiue/arrowup2.png');
    this.load.image('rat-up3', '/assets/rattatoiue/arrowup3.png');
    this.load.image('rat-up4', '/assets/rattatoiue/arrowup4.png');
  }

  create() {
    this.add.image(BG_WIDTH / 2, BG_HEIGHT / 2, 'bg').setScale(0.75);

    // Exit door — bottom-right of the room
    this.doorImage = this.add.image(this.doorX, this.doorY, 'exit-door').setScale(0.22).setDepth(10);
    this.doorHint = this.add
      .text(this.doorX, this.doorY - 80, '[E] Exit', {
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setVisible(false)
      .setDepth(20);

    // Camera bounds match the visible bg area; zoom 1 so the world fills the screen
    this.cameras.main.setBounds(0, 0, BG_WIDTH, BG_HEIGHT);
    this.cameras.main.setZoom(1);

    // Animations
    this.anims.create({
      key: 'walk-down',
      frames: [{ key: 'arrowdown1' }, { key: 'arrowdown2' }, { key: 'arrowdown3' }],
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: 'walk-right',
      frames: [{ key: 'arrowright1' }, { key: 'arrowright2' }, { key: 'arrowright3' }, { key: 'arrowright4' }],
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'walk-left',
      frames: [{ key: 'arrowrleft1' }, { key: 'arrowrleft2' }, { key: 'arrowrleft3' }, { key: 'arrowrleft4' }],
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'walk-up',
      frames: [{ key: 'arrowup1' }, { key: 'arrowup2' }, { key: 'arrowup3' }, { key: 'arrowup4' }],
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'idle',
      frames: [{ key: 'front1' }],
      frameRate: 1,
    });

    this.player = new Player(this, BG_WIDTH / 2, BG_HEIGHT / 2, 'front1');

    // Center camera on the room before following the player
    this.cameras.main.centerOn(BG_WIDTH / 2, BG_HEIGHT / 2);
    this.cameras.main.startFollow(this.player, true);

    // Working desk behind the secretary NPC
    // NPC sprite is 1024px at scale 0.2 = ~205px wide
    // Desk sprite is 2816px at scale 0.07 = ~197px wide, 1536px → ~107px tall
    this.add.image(180, 175, 'working-desk').setScale(0.07).setDepth(10);

    // Collision rect for the desk (center x, center y, half-width, half-height)
    this.deskBounds = { cx: 180, cy: 175, hw: 98, hh: 30 };

    // NPC — near top-left of the room
    this.npc = new NPC(this, 180, 160);

    // Rat animations
    this.anims.create({ key: 'rat-idle', frames: [{ key: 'rat-front' }], frameRate: 1 });
    this.anims.create({ key: 'rat-walk-down',  frames: [{ key: 'rat-down1' }, { key: 'rat-down2' }, { key: 'rat-down3' }, { key: 'rat-down4' }],  frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'rat-walk-right', frames: [{ key: 'rat-right1' }, { key: 'rat-right2' }, { key: 'rat-right3' }, { key: 'rat-right4' }], frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'rat-walk-left',  frames: [{ key: 'rat-left1' }, { key: 'rat-left2' }, { key: 'rat-left3' }, { key: 'rat-left4' }],  frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'rat-walk-up',    frames: [{ key: 'rat-up1' }, { key: 'rat-up2' }, { key: 'rat-up3' }, { key: 'rat-up4' }],    frameRate: 8, repeat: -1 });

    // Rat — wanders around the room
    this.rat = new Rat(this, BG_WIDTH / 2 + 200, BG_HEIGHT / 2 + 100);

    // Resume rat walking when chat closes
    window.addEventListener('chat-closed', () => this.rat.stopInteracting());

    // E key for interaction
    this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E, false); // false = don't capture

    // Setup socket after all anims are registered
    this.time.delayedCall(0, () => this.setupSocket());

    window.addEventListener('chat-opened', () => { this.chatOpen = true; });
    window.addEventListener('chat-closed', () => { this.chatOpen = false; });
  }

  private setupSocket() {
    // NEXT_PUBLIC_* vars are inlined at build time by Next.js
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    console.log('[socket] connecting to:', socketUrl);
    this.socket = io(socketUrl, {
      transports: ['polling', 'websocket'],
    });

    this.socket.on('connect', () => {
      console.log('[socket] connected as', this.socket.id);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[socket] connection error:', err.message);
    });

    // Receive own ID + snapshot of existing players
    this.socket.on('init', ({ selfId, others }: {
      selfId: string;
      others: Record<string, { x: number; y: number; anim: string }>;
    }) => {
      console.log('[socket] my id:', selfId, '| others:', Object.keys(others));
      Object.entries(others).forEach(([id, state]) => {
        if (!this.remotePlayers.has(id)) {
          this.addRemotePlayer(id, state.x, state.y, state.anim);
        }
      });
    });

    // A new player joined — will be positioned properly once they send their first move
    this.socket.on('playerJoined', ({ id }: { id: string }) => {
      if (!this.remotePlayers.has(id)) {
        this.addRemotePlayer(id, BG_WIDTH / 2, BG_HEIGHT / 2, 'idle');
      }
    });

    // Another player moved
    this.socket.on('playerMoved', ({ id, x, y, anim }: { id: string; x: number; y: number; anim: string }) => {
      if (id === this.socket.id) return; // ignore own echoes
      const remote = this.remotePlayers.get(id);
      if (remote) {
        remote.applyState(x, y, anim);
      } else {
        this.addRemotePlayer(id, x, y, anim);
      }
    });

    // A player left
    this.socket.on('playerLeft', ({ id }: { id: string }) => {
      const remote = this.remotePlayers.get(id);
      if (remote) {
        remote.destroy();
        this.remotePlayers.delete(id);
      }
    });
  }

  private addRemotePlayer(id: string, x: number, y: number, anim: string) {
    const rp = new RemotePlayer(this, x, y, id);
    rp.applyState(x, y, anim);
    this.remotePlayers.set(id, rp);
  }

  update(time: number, delta: number) {
    if (!this.chatOpen) this.player.update(time, delta);

    // Depth sorting: player renders in front of door when below it, behind when above
    // Also sort against NPC/desk (y=175)
    const npcY = 175;
    const aboveDoor = this.player.y <= this.doorY;
    const aboveDesk = this.player.y <= npcY;

    if (!aboveDoor || !aboveDesk) {
      // Player is in front of at least one object — use highest needed depth
      this.player.setDepth(11);
    } else {
      this.player.setDepth(9);
    }

    // Push player out of desk bounds (AABB)
    const { cx, cy, hw, hh } = this.deskBounds;
    const ph = 24; // player half-size (matches PLAYER_HALF in Player.ts)
    const overlapX = (hw + ph) - Math.abs(this.player.x - cx);
    const overlapY = (hh + ph) - Math.abs(this.player.y - cy);
    if (overlapX > 0 && overlapY > 0) {
      // Resolve along the axis of least penetration
      if (overlapX < overlapY) {
        this.player.x += overlapX * Math.sign(this.player.x - cx);
      } else {
        this.player.y += overlapY * Math.sign(this.player.y - cy);
      }
    }

    // NPC proximity + interaction
    const near = this.npc.updateProximity(this.player.x, this.player.y);
    if (near && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.npc.interact();
    }

    // Rat proximity + interaction
    const nearRat = this.rat.updateProximity(this.player.x, this.player.y);
    if (nearRat && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.rat.interact();
    }

    this.rat.update(delta);

    // Door proximity + interaction
    const nearDoor = Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this.doorX, this.doorY
    ) < this.DOOR_INTERACT_DIST;
    this.doorHint.setVisible(nearDoor);
    if (nearDoor && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      window.dispatchEvent(new CustomEvent('exit-door'));
    }

    // Throttled position emit
    if (time - this.lastEmit > this.EMIT_INTERVAL) {
      this.lastEmit = time;
      this.socket.emit('move', {
        x: this.player.x,
        y: this.player.y,
        anim: this.player.currentAnim ?? 'idle',
      });
    }
  }
}
