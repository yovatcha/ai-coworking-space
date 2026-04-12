import * as Phaser from 'phaser';
import { BG_WIDTH, BG_HEIGHT } from '../scenes/MainScene';

const INTERACT_DIST = 100;
const SPEED = 60;
const MIN_WALK_MS = 1500;
const MAX_WALK_MS = 3500;
const MIN_IDLE_MS = 800;
const MAX_IDLE_MS = 2000;

type Dir = 'up' | 'down' | 'left' | 'right';

export default class Rat extends Phaser.GameObjects.Sprite {
  private hint: Phaser.GameObjects.Text;
  private vx = 0;
  private vy = 0;
  private isInteracting = false;
  private walkTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'rat-front');
    scene.add.existing(this);
    this.setScale(0.1); // ~50% of player scale (0.2)

    this.hint = scene.add
      .text(x, y - 24, '[E] Talk', {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setVisible(false);

    this.scheduleNextMove();
  }

  private scheduleNextMove() {
    const idle = Phaser.Math.Between(MIN_IDLE_MS, MAX_IDLE_MS);
    this.walkTimer = this.scene.time.delayedCall(idle, () => {
      if (!this.isInteracting) this.startWalking();
    });
  }

  private startWalking() {
    const dirs: Dir[] = ['up', 'down', 'left', 'right'];
    const dir = dirs[Phaser.Math.Between(0, 3)];

    this.vx = dir === 'right' ? SPEED : dir === 'left' ? -SPEED : 0;
    this.vy = dir === 'down' ? SPEED : dir === 'up' ? -SPEED : 0;
    this.anims.play(`rat-walk-${dir}`, true);

    const duration = Phaser.Math.Between(MIN_WALK_MS, MAX_WALK_MS);
    this.walkTimer = this.scene.time.delayedCall(duration, () => {
      this.stopWalking();
    });
  }

  private stopWalking() {
    this.vx = 0;
    this.vy = 0;
    this.anims.play('rat-idle', true);
    if (!this.isInteracting) this.scheduleNextMove();
  }

  update(delta: number) {
    if (this.isInteracting) return;

    if (this.vx !== 0 || this.vy !== 0) {
      const dt = delta / 1000;
      const nx = Phaser.Math.Clamp(this.x + this.vx * dt, 40, BG_WIDTH - 40);
      const ny = Phaser.Math.Clamp(this.y + this.vy * dt, 40, BG_HEIGHT - 40);

      // Bounce off walls
      if (nx === 40 || nx === BG_WIDTH - 40) this.vx *= -1;
      if (ny === 40 || ny === BG_HEIGHT - 40) this.vy *= -1;

      this.setPosition(nx, ny);
    }

    this.hint.setPosition(this.x, this.y - 24);
  }

  updateProximity(px: number, py: number): boolean {
    const near = Phaser.Math.Distance.Between(px, py, this.x, this.y) < INTERACT_DIST;
    this.hint.setVisible(near);
    return near;
  }

  interact() {
    this.isInteracting = true;
    this.walkTimer?.remove();
    this.stopWalking();
    window.dispatchEvent(new CustomEvent('rat-chat'));
  }

  stopInteracting() {
    this.isInteracting = false;
    this.scheduleNextMove();
  }
}
