import * as Phaser from 'phaser';
import { BG_WIDTH, BG_HEIGHT } from '../scenes/MainScene';

// Half-size of the player sprite used for boundary clamping
const PLAYER_HALF = 24;

export default class Player extends Phaser.GameObjects.Sprite {
  private speed: number = 200;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private wasd: any;
  public currentAnim: string = 'idle';

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);

    this.setScale(0.18);

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      }, false) as Phaser.Types.Input.Keyboard.CursorKeys;
      this.wasd = scene.input.keyboard.addKeys('W,A,S,D', false);
    }
  }

  update(time: number, delta: number) {
    if (!this.scene?.sys?.isActive()) return;
    const deltaSec = delta / 1000;
    let dx = 0;
    let dy = 0;

    if (this.cursors?.left.isDown || this.wasd?.A.isDown) dx -= 1;
    if (this.cursors?.right.isDown || this.wasd?.D.isDown) dx += 1;
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) dy -= 1;
    if (this.cursors?.down.isDown || this.wasd?.S.isDown) dy += 1;

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    // Animation
    try {
      if (dx < 0) {
        if (this.scene.anims.exists('walk-left')) this.anims.play('walk-left', true);
        this.currentAnim = 'walk-left';
      } else if (dx > 0) {
        if (this.scene.anims.exists('walk-right')) this.anims.play('walk-right', true);
        this.currentAnim = 'walk-right';
      } else if (dy < 0) {
        if (this.scene.anims.exists('walk-up')) this.anims.play('walk-up', true);
        this.currentAnim = 'walk-up';
      } else if (dy > 0) {
        if (this.scene.anims.exists('walk-down')) this.anims.play('walk-down', true);
        this.currentAnim = 'walk-down';
      } else {
        if (this.scene.anims.exists('idle')) this.anims.play('idle', true);
        this.currentAnim = 'idle';
      }
    } catch { /* scene tearing down */ }

    // Move and clamp to bg bounds
    this.x = Phaser.Math.Clamp(
      this.x + dx * this.speed * deltaSec,
      PLAYER_HALF,
      BG_WIDTH - PLAYER_HALF
    );
    this.y = Phaser.Math.Clamp(
      this.y + dy * this.speed * deltaSec,
      PLAYER_HALF,
      BG_HEIGHT - PLAYER_HALF
    );
  }
}
