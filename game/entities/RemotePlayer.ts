import * as Phaser from 'phaser';
import { ATLAS } from '../scenes/MainScene';
import { SKINS, DEFAULT_SKIN } from '../skins';
import SpeechBubble from './SpeechBubble';

export default class RemotePlayer extends Phaser.GameObjects.Sprite {
  private nameLabel: Phaser.GameObjects.Text;
  private bubble: SpeechBubble;
  private skinId: string;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string, skinId: string = DEFAULT_SKIN) {
    const hasAtlas = scene.textures.exists(ATLAS);
    super(scene, x, y, hasAtlas ? ATLAS : '__DEFAULT', hasAtlas ? SKINS[skinId].idle : undefined);
    scene.add.existing(this);
    this.skinId = skinId;
    this.setScale(0.5);

    // Small name tag above the sprite
    this.nameLabel = scene.add.text(x, y - 20, id.slice(0, 6), {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 2, y: 1 },
    }).setOrigin(0.5, 1);

    // Extra headroom so the balloon clears the name tag
    this.bubble = new SpeechBubble(scene, 46);
    this.bubble.follow(x, y);
  }

  /** Swap sprite when a player changes skin mid-session. */
  setSkin(skinId: string) {
    if (skinId === this.skinId) return;
    this.skinId = skinId;
    if (this.scene.textures.exists(ATLAS)) {
      this.anims.stop();
      this.setTexture(ATLAS, SKINS[skinId].idle);
    }
  }

  applyState(x: number, y: number, anim: string) {
    this.x = x;
    this.y = y;
    this.nameLabel.setPosition(x, y - 20);
    this.bubble.follow(x, y);
    // Only play if the animation key is registered (guards against race on init)
    if (anim && this.scene.anims.exists(anim)) {
      this.anims.play(anim, true);
    }
  }

  /** Show a broadcast message above this player */
  say(text: string) {
    this.bubble.say(text);
  }

  destroy(fromScene?: boolean) {
    this.bubble.destroy();
    this.nameLabel.destroy();
    super.destroy(fromScene);
  }
}
