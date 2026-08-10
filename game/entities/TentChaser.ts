import * as Phaser from 'phaser';
import { ROOM, ATLAS } from '../scenes/MainScene';

// Prank entity: haunts whoever is logged in as Tent.
const CHARGE_MS = 1000; // wind-up before every dash — the "debounce"
const DASH_SPEED = 320; // faster than the player's 200, so it always catches up
const CATCH_DIST = 44; // close enough — stop and lurk beside Tent
const WAKE_DIST = 130; // Tent escaped this far → start charging again

type State = 'lurk' | 'charge' | 'dash';

export default class TentChaser extends Phaser.GameObjects.Sprite {
  private mode: State = 'lurk';
  private chargeStart = 0;
  // Position is jittered every frame while charging, so keep the real spot here
  private anchorX: number;
  private anchorY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ATLAS, 'err-publio/front1');
    scene.add.existing(this);
    this.setScale(0.5);
    this.anchorX = x;
    this.anchorY = y;
    this.setVisible(false);
  }

  /** Call once per frame with Tent's position, or null when no Tent is in the room. */
  update(time: number, delta: number, target: { x: number; y: number } | null) {
    if (!target) {
      // No Tent, no haunting — vanish until they log in
      this.setVisible(false);
      this.mode = 'lurk';
      this.setPosition(this.anchorX, this.anchorY);
      return;
    }
    this.setVisible(true);

    const dist = Phaser.Math.Distance.Between(
      this.anchorX,
      this.anchorY,
      target.x,
      target.y,
    );

    if (this.mode === 'lurk') {
      this.setPosition(this.anchorX, this.anchorY);
      this.anims.play('chaser-idle', true);
      if (dist > WAKE_DIST) {
        this.mode = 'charge';
        this.chargeStart = time;
      }
      return;
    }

    if (this.mode === 'charge') {
      // Shiver in place while winding up
      this.setPosition(
        this.anchorX + Phaser.Math.Between(-2, 2),
        this.anchorY + Phaser.Math.Between(-2, 2),
      );
      this.anims.play('chaser-idle', true);
      if (time - this.chargeStart >= CHARGE_MS) this.mode = 'dash';
      return;
    }

    // dash — home in on Tent's current position, ghosting through furniture
    if (dist < CATCH_DIST) {
      this.mode = 'lurk';
      this.setPosition(this.anchorX, this.anchorY);
      this.anims.play('chaser-idle', true);
      return;
    }

    const dx = target.x - this.anchorX;
    const dy = target.y - this.anchorY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const step = (DASH_SPEED * delta) / 1000;
    this.anchorX = Phaser.Math.Clamp(
      this.anchorX + (dx / len) * step,
      ROOM.left,
      ROOM.right,
    );
    this.anchorY = Phaser.Math.Clamp(
      this.anchorY + (dy / len) * step,
      ROOM.top,
      ROOM.bottom,
    );
    this.setPosition(this.anchorX, this.anchorY);

    const key =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? 'chaser-walk-right'
          : 'chaser-walk-left'
        : dy > 0
          ? 'chaser-walk-down'
          : 'chaser-walk-up';
    this.anims.play(key, true);
  }
}
