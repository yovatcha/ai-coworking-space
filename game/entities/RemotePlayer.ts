import * as Phaser from 'phaser';
import { ATLAS } from '../scenes/MainScene';
import { MEMBERS, GUEST, toTint } from '@/lib/members';
import SpeechBubble from './SpeechBubble';

export default class RemotePlayer extends Phaser.GameObjects.Sprite {
  private nameLabel: Phaser.GameObjects.Text;
  private bubble: SpeechBubble;
  private memberId: string;
  private color: string;

  constructor(scene: Phaser.Scene, x: number, y: number, memberId: string, color: string) {
    const hasAtlas = scene.textures.exists(ATLAS);
    super(scene, x, y, hasAtlas ? ATLAS : '__DEFAULT', hasAtlas ? 'main-charactor/front1' : undefined);
    scene.add.existing(this);
    this.memberId = memberId;
    this.color = color;
    this.setScale(0.5);
    this.setTint(toTint(color));

    // Name tag above the sprite — the member's name, not a socket id
    this.nameLabel = scene.add.text(x, y - 20, this.labelFor(memberId), {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 2, y: 1 },
    }).setOrigin(0.5, 1);

    // Extra headroom so the balloon clears the name tag
    this.bubble = new SpeechBubble(scene, 46);
    this.bubble.follow(x, y);
  }

  private labelFor(memberId: string) {
    return (MEMBERS[memberId] ?? MEMBERS[GUEST]).label;
  }

  /** Two people can share a member slot only by sharing a password — but a
   *  colour change mid-session is normal, so keep both in sync. */
  setIdentity(memberId: string, color: string) {
    if (memberId !== this.memberId) {
      this.memberId = memberId;
      this.nameLabel.setText(this.labelFor(memberId));
    }
    if (color !== this.color) {
      this.color = color;
      this.setTint(toTint(color));
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
