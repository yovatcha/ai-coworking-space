import * as Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import Player from '../entities/Player';
import RemotePlayer from '../entities/RemotePlayer';
import NPC from '../entities/NPC';

// bg.png is 2752x1536 — displayed at 75% size for a medium room
export const BG_WIDTH = 2064;
export const BG_HEIGHT = 1152;

export default class MainScene extends Phaser.Scene {
  private player!: Player;
  private socket!: Socket;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private npc!: NPC;
  private keyE!: Phaser.Input.Keyboard.Key;

  // Throttle how often we emit position (ms)
  private lastEmit = 0;
  private readonly EMIT_INTERVAL = 50; // ~20 updates/sec

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    this.load.image('bg', '/assets/bg.png');
    this.load.image('ped-stand1', '/assets/ped/stand1.png');
    this.load.image('ped-stand2', '/assets/ped/stand2.png');
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
  }

  create() {
    this.add.image(BG_WIDTH / 2, BG_HEIGHT / 2, 'bg').setScale(0.75);
    this.cameras.main.setBounds(0, 0, BG_WIDTH, BG_HEIGHT);
    this.cameras.main.setZoom(0.75);

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

    // NPC — near top-left of the room
    this.npc = new NPC(this, 180, 160);

    // E key for interaction
    this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // Setup socket after all anims are registered
    this.time.delayedCall(0, () => this.setupSocket());
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
    this.player.update(time, delta);

    // NPC proximity + interaction
    const near = this.npc.updateProximity(this.player.x, this.player.y);
    if (near && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.npc.interact();
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
