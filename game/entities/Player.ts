import * as Phaser from 'phaser';
import { BG_WIDTH, BG_HEIGHT, ATLAS } from '../scenes/MainScene';
import { SKINS, DEFAULT_SKIN, animKey } from '../skins';
import SpeechBubble from './SpeechBubble';

// Half-size of the player sprite used for boundary clamping
const PLAYER_HALF = 24;

export default class Player extends Phaser.GameObjects.Sprite {
  private speed: number = 200;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private wasd: any;
  private bubble: SpeechBubble;
  public readonly skinId: string;
  public currentAnim: string;

  constructor(scene: Phaser.Scene, x: number, y: number, skinId: string = DEFAULT_SKIN) {
    super(scene, x, y, ATLAS, SKINS[skinId].idle);
    scene.add.existing(this);

    this.skinId = skinId;
    this.currentAnim = animKey(skinId, 'idle');
    this.setScale(0.5);
    this.bubble = new SpeechBubble(scene);

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

    // Animation — key is namespaced by skin so remote clients replay it as-is
    const name =
      dx < 0 ? 'walk-left' :
      dx > 0 ? 'walk-right' :
      dy < 0 ? 'walk-up' :
      dy > 0 ? 'walk-down' : 'idle';
    const key = animKey(this.skinId, name);
    try {
      if (this.scene.anims.exists(key)) this.anims.play(key, true);
      this.currentAnim = key;
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

    this.bubble.follow(this.x, this.y);
  }

  /** Show a broadcast message above this player */
  say(text: string) {
    this.bubble.follow(this.x, this.y);
    this.bubble.say(text);
  }

  destroy(fromScene?: boolean) {
    this.bubble.destroy();
    super.destroy(fromScene);
  }
}
